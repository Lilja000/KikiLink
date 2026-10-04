#!/usr/bin/env python3
"""Check private handoff inputs as data and mock routing without deploying.

Run with the same three --*-handoff paths as build-cloud-feed11-release.py.
The actual embedded installers/operators are never executed on the filesystem.
"""
import argparse
import ast
import base64
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import stat
import tempfile
from types import SimpleNamespace
import unittest


REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("feed11_builder", REPO / "scripts/build-cloud-feed11-release.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def mock_run(source, files, release, allow_decode=True):
    """Only fake protected-file reads and in-memory hashes can run here."""
    calls = {"decoded": 0, "selected": []}

    class FakePath:
        def __init__(self, path):
            self.path = PurePosixPath(path)

        def __eq__(self, other):
            return isinstance(other, FakePath) and self.path == other.path

        def __truediv__(self, other):
            return FakePath(self.path / other)

        @property
        def parent(self):
            return FakePath(self.path.parent)

        @property
        def parts(self):
            return self.path.parts

        def resolve(self):
            return self

        def lstat(self):
            body = files.get(str(self.path))
            return SimpleNamespace(st_uid=0, st_size=len(body) if body is not None else 0,
                                   st_mode=(stat.S_IFREG | 0o600) if body is not None
                                   else (stat.S_IFDIR | 0o700))

        def read_bytes(self):
            return files[str(self.path)]

    def decode(value):
        if not allow_decode:
            raise AssertionError("payload decode was reached")
        calls["decoded"] += 1
        return base64.b64decode(value)

    tree = ast.parse(source)
    tree.body = [node for node in tree.body if not isinstance(node, (ast.Import, ast.ImportFrom))]
    sandbox = {
        "Path": FakePath, "json": json, "gzip": gzip, "hashlib": hashlib,
        "base64": SimpleNamespace(b64decode=decode), "stat": stat,
        "os": SimpleNamespace(umask=lambda _mask: None, geteuid=lambda: 0),
        "socket": SimpleNamespace(gethostname=lambda: "kiki-bot-01"),
        "compile": lambda script, _name, _mode: script,
        "exec": lambda script, _globals: calls["selected"].append(script),
    }
    import re
    sandbox["re"] = re
    files["/var/lib/kikilink-cloud-private-control/state.json"] = json.dumps({"release": release}).encode()
    exec(compile(tree, "mock-handoff-only", "exec"), sandbox)
    return calls


class Feed11PackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.originals = builder.read_predecessors(ARGS.feed9_handoff)
        cls.preferences = builder.preferences_predecessors(ARGS.preferences_handoff, cls.originals)
        cls.original_scripts, cls.frozen, cls.original_routes = builder.read_pinned_handoff(
            ARGS.feed11_handoff, builder.ORIGINAL_FEED11_SHA256, "KIKILINK_FEED11")
        cls.entries, cls.routes = builder.release_lineages(
            REPO, ARGS.feed9_handoff, ARGS.feed11_handoff, ARGS.preferences_handoff)
        cls.scripts = {previous: script for previous, _files, script, _preserved in cls.entries}

    def test_original_routes_preserve_installer_payload_and_manifest_bytes(self):
        for previous, files, script, preserved in self.entries:
            if not preserved:
                continue
            self.assertEqual(script, self.original_scripts[previous])
            self.assertEqual(files, self.frozen[previous])
            self.assertEqual(builder.packed_literal(script),
                             builder.packed_literal(self.original_scripts[previous]))
        for release, previous in self.original_routes.items():
            self.assertEqual(self.routes[release], previous)

    def test_actual_preferences_successor_gets_reviewed_schema9_to11_operator(self):
        for previous, files, script, preserved in self.entries:
            if preserved:
                continue
            manifest = json.loads(files["manifest.json"])
            self.assertIn(previous, {"7fbcf099dc7e", "a09502488f4d"})
            original = next(key for key, pin in builder.PREFERENCES_LINEAGES.items()
                            if pin["release"] == previous)
            predecessor = self.preferences[original]
            old = json.loads(predecessor["manifest.json"])
            self.assertEqual(manifest["scope"]["predecessor"], previous)
            self.assertEqual(manifest["scope"]["schemaVersion"], 11)
            self.assertEqual(manifest["dependency_locks"], old["dependency_locks"])
            self.assertEqual(manifest["verifierSources"], old["verifierSources"])
            self.assertEqual(manifest["apiSources"], json.loads(self.frozen[original]["manifest.json"])["apiSources"])
            controller = files["private-group-upgrade.py"]
            self.assertIn("PREVIOUS = " + repr(previous), controller)
            self.assertIn("PREVIOUS_SOURCE = " + repr(builder.sha(predecessor["private-cloud.py"].encode())), controller)
            self.assertIn("PREVIOUS_MANIFEST = " + repr(builder.sha(predecessor["manifest.json"].encode())), controller)
            self.assertEqual(files["api/ops/private-community-upgrade.mjs"],
                             self.frozen[original]["api/ops/private-community-upgrade.mjs"])
            self.assertNotIn("preferences104", controller)
            self.assertIn("schema11-upgrade.json", controller)
            self.assertIn("schemaVersion') == 9", controller)
            self.assertIn("schemaVersion') == 11", controller)
            self.assertIn("'activating'", controller)
            self.assertIn("schema11_downgrade_refused_preserve_new_writes", controller)

    def test_all_eight_routes_select_the_exact_installer_without_running_it(self):
        source = "\n".join(builder.handoff(self.scripts, self.routes).splitlines()[1:-1])
        self.assertEqual(len(self.routes), 8)
        for release, previous in self.routes.items():
            calls = mock_run(source, {}, release)
            self.assertEqual(calls, {"decoded": 1, "selected": [self.scripts[previous]]})

    def test_unknown_release_stops_before_payload_decode_or_execution(self):
        source = "\n".join(builder.handoff(self.scripts, self.routes).splitlines()[1:-1])
        with self.assertRaisesRegex(RuntimeError, "UNRECOGNIZED_CURRENT_RELEASE"):
            mock_run(source, {}, "ffffffffffff", allow_decode=False)

    def test_actual_hotfix_installer_refuses_changed_manifest_and_source(self):
        previous = "7fbcf099dc7e"
        base = "/opt/kikilink-cloud-private/" + previous + "/"
        predecessor = self.preferences["c6f47ef3fe1d"]
        original_files = {base + name: body.encode() for name, body in predecessor.items()}
        changed = dict(original_files)
        changed[base + "manifest.json"] += b"\n"
        with self.assertRaisesRegex(RuntimeError, "PREDECESSOR_MANIFEST_CHANGED"):
            mock_run(self.scripts[previous], changed, previous, allow_decode=False)
        changed = dict(original_files)
        changed[base + "private-cloud.py"] += b"\n"
        with self.assertRaisesRegex(RuntimeError, "PREDECESSOR_FILES_CHANGED"):
            mock_run(self.scripts[previous], changed, previous, allow_decode=False)

    def test_changed_handoff_inputs_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix="feed11-pins-") as directory:
            for path, digest, marker in (
                (ARGS.preferences_handoff, builder.PREFERENCES_HANDOFF_SHA256, "KIKILINK_PREFERENCES104"),
                (ARGS.feed11_handoff, builder.ORIGINAL_FEED11_SHA256, "KIKILINK_FEED11"),
            ):
                changed = Path(directory) / marker
                changed.write_bytes(path.read_bytes() + b"\n")
                with self.assertRaisesRegex(ValueError, "pinned_handoff_changed"):
                    builder.read_pinned_handoff(changed, digest, marker)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--feed9-handoff", type=Path, required=True)
    parser.add_argument("--preferences-handoff", type=Path, required=True)
    parser.add_argument("--feed11-handoff", type=Path, required=True)
    ARGS, remaining = parser.parse_known_args()
    unittest.main(argv=[__file__, *remaining])
