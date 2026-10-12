#!/usr/bin/env python3
"""Validate pinned artifacts and simulate controller switches without deployment."""
import argparse
import ast
import base64
from contextlib import nullcontext
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import re
import stat
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('isolation_builder', SCRIPTS / 'build-cloud-runtime-isolation.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def preflight_handoff(routes, disk, current):
    """Run only the handoff's protected reads, routing and hash checks."""
    class FakePath:
        def __init__(self, path): self.path = PurePosixPath(path)
        def __eq__(self, other): return isinstance(other, FakePath) and self.path == other.path
        def __truediv__(self, other): return FakePath(self.path / other)
        @property
        def parent(self): return FakePath(self.path.parent)
        @property
        def parts(self): return self.path.parts
        def resolve(self): return self
        def lstat(self):
            body = disk.get(str(self.path))
            return SimpleNamespace(st_uid=0, st_size=len(body) if body is not None else 0,
                st_mode=stat.S_IFREG | 0o600 if body is not None else stat.S_IFDIR | 0o700)
        def read_bytes(self): return disk[str(self.path)]
    source = '\n'.join(builder.handoff(routes).splitlines()[1:-1])
    tree = ast.parse(source)
    stop = next(i for i, n in enumerate(tree.body) if isinstance(n, ast.Assign) and
                any(isinstance(t, ast.Name) and t.id == 'target' for t in n.targets))
    tree.body = [n for n in tree.body[:stop] if not isinstance(n, (ast.Import, ast.ImportFrom))]
    disk = dict(disk)
    disk['/var/lib/kikilink-cloud-private-control/state.json'] = builder.encoded({'release': current})
    sandbox = {'Path': FakePath, 'json': json, 'gzip': gzip, 'hashlib': hashlib,
               'base64': base64, 'stat': stat, 're': re,
               'os': SimpleNamespace(umask=lambda _: None, geteuid=lambda: 0),
               'socket': SimpleNamespace(gethostname=lambda: 'kiki-bot-01')}
    exec(compile(tree, 'handoff-read-only-test', 'exec'), sandbox)
    return sandbox['files']


class Refused(RuntimeError):
    pass


class Runtime:
    Refused = Refused
    UNIT, TIMER, SETUP = 'cloud.service', 'backup.timer', 'setup.service'

    def __init__(self, host, root, metadata):
        self.host, self.ROOT, self.metadata = host, root, metadata
        self.CONTROL = host.control

    def need(self, ok, code):
        if not ok: raise Refused(code)

    def bundle(self): return self.metadata
    def lock(self, name): return nullcontext()
    def state(self):
        value = self.read_json(self.CONTROL / 'state.json')
        self.need(value['release'] == self.metadata['release'], 'installed_release_changed')
        return value
    def read_file(self, path, **kwargs): return path.read_bytes()
    def read_json(self, path): return json.loads(path.read_bytes())
    def write(self, path, value, **kwargs):
        if isinstance(value, dict): value = builder.encoded(value)
        if isinstance(value, str): value = value.encode()
        path.write_bytes(value)
        self.host.calls.append(('write', path.name))
    def config_hashes(self): return self.host.hashes
    def verify_host(self): self.host.calls.append(('host', 'cloud-only'))
    def idle(self, value): pass
    def build_images(self, *args): self.host.calls.append(('images', 'inherit'))
    def ops(self, action, value, network='none'):
        self.host.calls.append(('ops', action))
        if action == 'backup': return {'restoreVerified': True}
        return {'event': 'private_verified'}
    def proxy_module(self): return SimpleNamespace(read_admin=lambda: (self.host.route, None))
    def run(self, argv, **kwargs): self.host.calls.append(('run', argv[0]))
    def cleanup_locked(self, value):
        self.host.route = 'baseline'
        self.host.calls.append(('cleanup', value['release']))
        return []
    def units(self):
        return {self.UNIT: f'ExecStart={self.ROOT}/private-cloud.py serve\n',
                self.TIMER: f'ExecStart={self.ROOT}/private-cloud.py backup\n'}
    def systemctl(self, *args, **kwargs):
        self.host.calls.append(('systemctl', *args))
        if args[0] == 'stop':
            self.host.active = False
            if self.host.fail_stop:
                self.host.fail_stop = False
                raise Refused('partial_stop_failure')
        if args[0] == 'start' and self.UNIT in args:
            self.host.active = True
            self.host.route = 'candidate'
            if self.metadata['release'] == self.host.new_release and self.host.fail_start:
                self.host.messages.append('write accepted before controller rollback')
                raise Refused('start_failed')
        return SimpleNamespace(stdout='active' if self.host.active else 'inactive')
    def status(self, quiet=False):
        self.host.status_calls += 1
        new = self.metadata['release'] == self.host.new_release
        ready = new and self.host.active and self.host.status_calls > 2
        return {'unit': 'active' if self.host.active else 'failed', 'backupTimer': 'active',
                'backupFresh': self.host.fresh_backup, 'phase': 'online' if ready else 'refused',
                'apiReady': ready, 'liveReady': ready, 'verificationReady': False,
                'verifierState': 'suspended'}


def fixture(folder, old_files, new_files):
    old_meta, new_meta = (json.loads(files['manifest.json']) for files in (old_files, new_files))
    root = Path(folder)
    for name in ('control', 'units', 'old', 'new'): (root / name).mkdir()
    host = SimpleNamespace(control=root / 'control', calls=[], hashes={}, route='baseline',
                           active=False, fail_start=False, fail_stop=False, fresh_backup=True,
                           messages=['existing message'], status_calls=0, new_release=new_meta['release'])
    old, new = Runtime(host, root / 'old', old_meta), Runtime(host, root / 'new', new_meta)
    old.write(host.control / 'state.json', {'release': old_meta['release'], 'prepared': True,
        'config_hashes': {}, 'images': {'api': 'same-api', 'verifier': 'same-verifier'},
        'plan': {'baseline': 'baseline', 'candidate': 'candidate'}})
    update_path = new.ROOT / 'runtime-isolation-update.py'
    update_path.write_text(new_files['runtime-isolation-update.py'])
    spec = importlib.util.spec_from_file_location('isolation_update_test', update_path)
    update = importlib.util.module_from_spec(spec);spec.loader.exec_module(update)
    update.SYSTEMD, update.LAUNCHER = root / 'units', root / 'launcher'
    for name, value in update.units(old).items(): (update.SYSTEMD / name).write_text(value)
    update.LAUNCHER.write_text(update.launcher(old))
    update.previous = lambda op: old
    update.time = SimpleNamespace(sleep=lambda _: None)
    return host, old, new, update


class PackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.originals = builder.read_predecessors(ARGS.feed11_handoff)
        cls.candidates = {old: builder.candidate(old, files, SCRIPTS)
                          for old, files in cls.originals.items()}

    def test_all_four_packages_preserve_api_verifier_migrations_and_dependencies(self):
        for old, (files, route) in self.candidates.items():
            prior = self.originals[old]
            changes = {name for name in set(files) | set(prior) if files.get(name) != prior.get(name)}
            self.assertEqual(changes, {'private-cloud.py', 'manifest.json',
                                      'runtime-isolation-update.py', 'runtime-isolation-tests.py'})
            metadata, old_meta = (json.loads(f['manifest.json']) for f in (files, prior))
            self.assertEqual(metadata['scope']['schemaVersion'], 11)
            for key in ('apiSources', 'verifierSources', 'dependency_locks'):
                self.assertEqual(metadata[key], old_meta[key])
            self.assertEqual(builder.sha(files['manifest.json'].encode()), route['manifestSha'])
            for name, digest in metadata['files'].items():
                self.assertEqual(builder.sha(files[name].encode()), digest)
            self.assertEqual(builder.sha(builder.encoded(metadata['files']).strip())[:12], route['release'])

    def test_payload_and_source_drift_are_rejected_before_build(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'bad.b64';path.write_text('AA==')
            with self.assertRaisesRegex(ValueError, 'feed11_handoff_changed'):
                builder.read_predecessors(path)
        source = next(iter(self.originals.values()))['private-cloud.py']
        from cloud_runtime_isolation import isolate_controller
        with self.assertRaisesRegex(ValueError, 'runtime_source_contract_changed'):
            isolate_controller(source.replace("'runner_not_ready'", "'unknown'"))

    def test_handoff_is_deterministic_and_routes_include_reruns(self):
        routes = {old: route for old, (_, route) in self.candidates.items()}
        self.assertEqual(builder.handoff(routes), builder.handoff(copy.deepcopy(routes)))
        payload = builder.packed_literal('\n'.join(builder.handoff(routes).splitlines()[1:-1]))
        self.assertEqual(json.loads(__import__('gzip').decompress(payload)), routes)
        for old, route in routes.items():
            for current in (old, route['release']):
                self.assertEqual([key for key, r in routes.items() if current in (key, r['release'])], [old])

    def test_handoff_reconstructs_each_exact_package_and_rerun(self):
        routes = {old: route for old, (_, route) in self.candidates.items()}
        for old, (files, route) in self.candidates.items():
            disk = {'/opt/kikilink-cloud-private/' + old + '/' + name: source.encode()
                    for name, source in self.originals[old].items()}
            for current in (old, route['release']):
                self.assertEqual(preflight_handoff(routes, disk, current), files)

    def test_handoff_refuses_unknown_runtime_and_changed_installed_files(self):
        routes = {old: route for old, (_, route) in self.candidates.items()}
        with self.assertRaisesRegex(RuntimeError, 'UNRECOGNIZED_CURRENT_RELEASE'):
            preflight_handoff(routes, {}, 'ffffffffffff')
        old = next(iter(self.originals))
        base = '/opt/kikilink-cloud-private/' + old + '/'
        disk = {base + name: source.encode() for name, source in self.originals[old].items()}
        for name, expected in (('manifest.json', 'PREDECESSOR_MANIFEST_CHANGED'),
                               ('private-cloud.py', 'PREDECESSOR_FILE_CHANGED')):
            changed = dict(disk);changed[base + name] += b'\n'
            with self.assertRaisesRegex(RuntimeError, expected):
                preflight_handoff(routes, changed, old)

    def test_offline_runner_and_suspended_verifier_allow_same_image_switch_and_rerun(self):
        for old_id, (files, route) in self.candidates.items():
            with self.subTest(previous=old_id), tempfile.TemporaryDirectory() as folder:
                host, old, new, update = fixture(folder, self.originals[old_id], files)
                update.update(new)
                state = new.state()
                self.assertEqual(state['images'], {'api': 'same-api', 'verifier': 'same-verifier'})
                self.assertEqual(update.journal(new)['phase'], 'complete')
                self.assertEqual(host.messages, ['existing message'])
                self.assertTrue(update.observe(new)['apiReady'])
                self.assertFalse(update.observe(new)['verificationReady'])
                count = len(host.calls)
                update.update(new)
                self.assertEqual(len(host.calls), count)

    def test_controller_rollback_preserves_writes_and_uses_same_schema(self):
        old_id, (files, _) = next(iter(self.candidates.items()))
        with tempfile.TemporaryDirectory() as folder:
            host, old, new, update = fixture(folder, self.originals[old_id], files)
            host.fail_start = True
            with self.assertRaisesRegex(Refused, 'start_failed'): update.update(new)
            self.assertEqual(old.state()['images'], {'api': 'same-api', 'verifier': 'same-verifier'})
            self.assertEqual(update.journal(new)['phase'], 'rolled_back')
            self.assertEqual(host.messages, ['existing message', 'write accepted before controller rollback'])
            self.assertFalse(any(call[:2] == ('ops', 'restore') for call in host.calls))
            self.assertEqual(update.LAUNCHER.read_text(), update.launcher(old))

    def test_partial_stop_failure_restores_the_previous_controller(self):
        old_id, (files, _) = next(iter(self.candidates.items()))
        with tempfile.TemporaryDirectory() as folder:
            host, old, new, update = fixture(folder, self.originals[old_id], files)
            host.fail_stop = True
            with self.assertRaisesRegex(Refused, 'partial_stop_failure'): update.update(new)
            self.assertEqual(update.journal(new)['phase'], 'rolled_back')
            self.assertEqual(old.state()['release'], old_id)

    def test_changed_config_is_refused_before_stopping_a_service(self):
        old_id, (files, _) = next(iter(self.candidates.items()))
        with tempfile.TemporaryDirectory() as folder:
            host, old, new, update = fixture(folder, self.originals[old_id], files)
            host.hashes = {'changed': True}
            with self.assertRaisesRegex(Refused, 'private_config_changed'): update.update(new)
            self.assertFalse(any(call[:2] == ('systemctl', 'stop') for call in host.calls))
            self.assertEqual(old.state()['release'], old_id)

    def test_stale_backup_is_verified_before_switch(self):
        old_id, (files, _) = next(iter(self.candidates.items()))
        with tempfile.TemporaryDirectory() as folder:
            host, old, new, update = fixture(folder, self.originals[old_id], files)
            host.fresh_backup = False
            update.update(new)
            backup = host.calls.index(('ops', 'backup'))
            stop = next(i for i, call in enumerate(host.calls) if call[:2] == ('systemctl', 'stop'))
            self.assertLess(backup, stop)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--feed11-handoff', type=Path, required=True)
    ARGS, remaining = parser.parse_known_args()
    unittest.main(argv=[__file__, *remaining], verbosity=2)
