#!/usr/bin/env python3
"""Build, but never execute, the owner-operated Feed 11 Cloud update.

The inputs are the previously delivered, hash-pinned Feed 9, Preferences 1.0.4
and original Feed 11 handoffs. Packages are decoded as data, never executed. This avoids keeping
private deployment infrastructure or opaque base64 blobs in the repository.
Current API sources, including migrations 010 and 011, are overlaid directly on
the reviewed Preferences successors. Existing Feed 11 installers are preserved
byte-for-byte. The historical Feed 10 handoff is not required. The immutable
verifier and the installed image's dependencies remain unchanged.

Usage:
  python3 scripts/build-cloud-feed11-release.py \
    --feed9-handoff /path/to/KikiLink-Cloud-Feed9-Update.txt \
    --preferences-handoff /path/to/KikiLink-Cloud-Preferences-1.0.4.txt \
    --feed11-handoff /path/to/original-KikiLink-Cloud-Feed11-Update.txt \
    --output .local-dev/feed11-release

The output includes the handoff, readable package trees, readable installers,
and a provenance report. Re-running with the same inputs is byte-for-byte
deterministic. This script does not contact a host, run Docker, or deploy.
"""
import argparse
import ast
import base64
import copy
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import textwrap


HANDOFF_HASH = "d4bdda1b7e6406dae81aaf163aab5003e998133507094012af3779415f1959d5"
LINEAGES = {
    "2637cec21c45": {
        "release": "1d11cc2db7cc",
        "payload": "0be5ecbf16755e9d69ebd11ee1295202b1c3362dc0eea53da629dc394d74961e",
        "manifest": "fec562a0a2be014f708f37117d3b8ab3560204848b853604b40ecf1a418dab6c",
    },
    "b0d5e74cc3b8": {
        "release": "c6f47ef3fe1d",
        "payload": "34d19b4d058d85a7203d9704c9cf065d3a0889e6a5ca16afe662a44b031c9100",
        "manifest": "5121f655c621b3ed08b8f26c0c4afed73cf537388add42c09c221301c63946d2",
    },
}
PREFERENCES_HANDOFF_SHA256 = "e5d6666c3d4f3bab1621a592a2170b074bd75be7d728bbb5ddf04d1cd5b8a3ee"
ORIGINAL_FEED11_SHA256 = "ec10c70b731e378c1cac66c62db5a796f530f1134eecf25fadb874cd82a136a1"
PREFERENCES_LINEAGES = {
    "1d11cc2db7cc": {"release": "a09502488f4d",
                     "manifest": "550f2613ddd0d637334ba6450ca533b4854643045755ccf99d3efc82c6305487"},
    "c6f47ef3fe1d": {"release": "7fbcf099dc7e",
                     "manifest": "64e64759301a87ed1e449a580c2e49677b17f080deb65d03a96d58b4475e84f7"},
}
MIGRATIONS = ["010_feed_community_tools.sql", "011_feed_reactions.sql"]
MAX_FILE = 2 * 1024 * 1024
FEATURES = ["feedBookmarks", "feedReplies", "feedFilters", "feedPolls",
            "feedWatch", "feedHide", "feedSpoilers"]


def need(ok, code):
    if not ok:
        raise ValueError(code)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def json_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


def compressed(value):
    stream = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=stream, mtime=0) as output:
        output.write(json_bytes(value))
    return stream.getvalue()


def safe_name(name):
    return bool(re.fullmatch(r"[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*", name)) and \
        all(part not in (".", "..") for part in Path(name).parts)


def packed_literal(source):
    """Extract one literal b64 payload without evaluating the installer."""
    tree = ast.parse(source)
    nodes = [node.value for node in tree.body if isinstance(node, ast.Assign) and
             any(isinstance(target, ast.Name) and target.id == "packed" for target in node.targets)]
    need(len(nodes) == 1, "expected_one_payload")
    node = nodes[0]
    need(isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and
         isinstance(node.func.value, ast.Name) and node.func.value.id == "base64" and
         node.func.attr == "b64decode" and len(node.args) == 1 and not node.keywords,
         "payload_must_be_literal_base64")
    value = ast.literal_eval(node.args[0])
    need(isinstance(value, str), "payload_must_be_text")
    return base64.b64decode("".join(value.split()), validate=True)


def read_predecessors(path):
    shell = path.read_text()
    need(shell.startswith("sudo /usr/bin/python3 -I -B - <<'KIKILINK_FEED9'\n") and
         shell.endswith("\nKIKILINK_FEED9\n"), "unexpected_feed9_wrapper")
    packed = packed_literal("\n".join(shell.splitlines()[1:-1]))
    need(sha(packed) == HANDOFF_HASH, "feed9_handoff_changed")
    installers = json.loads(gzip.decompress(packed))
    need(set(installers) == set(LINEAGES), "feed9_lineages_changed")
    result = {}
    for original, pin in LINEAGES.items():
        packed = packed_literal(installers[original])
        need(sha(packed) == pin["payload"], "feed9_payload_changed")
        files = json.loads(gzip.decompress(packed))
        need(sha(files["manifest.json"].encode()) == pin["manifest"], "feed9_manifest_changed")
        manifest = json.loads(files["manifest.json"])
        need(manifest["release"] == pin["release"], "feed9_release_changed")
        verify_package(files, manifest)
        result[pin["release"]] = files
    return result


def read_pinned_handoff(path, digest, marker):
    """Read exact delivered artifacts as data; never import embedded operators."""
    raw = path.read_bytes()
    need(sha(raw) == digest, "pinned_handoff_changed: " + marker)
    shell = raw.decode()
    need(shell.startswith("sudo /usr/bin/python3 -I -B - <<'" + marker + "'\n") and
         shell.endswith("\n" + marker + "\n"), "unexpected_handoff_wrapper")
    source = "\n".join(shell.splitlines()[1:-1])
    installers = json.loads(gzip.decompress(packed_literal(source)))
    route_nodes = [node.value for node in ast.parse(source).body
                   if isinstance(node, ast.Assign) and any(
                       isinstance(target, ast.Name) and target.id == "routes"
                       for target in node.targets)]
    need(len(route_nodes) == 1, "expected_one_routes_literal")
    routes = ast.literal_eval(route_nodes[0])
    packages = {}
    expected_routes = {}
    for previous, script in installers.items():
        files = json.loads(gzip.decompress(packed_literal(script)))
        manifest = json.loads(files["manifest.json"])
        verify_package(files, manifest)
        need(manifest["scope"]["predecessor"] == previous, "handoff_predecessor_changed")
        packages[previous] = files
        expected_routes.update({previous: previous, manifest["release"]: previous})
    need(routes == expected_routes, "handoff_routes_changed")
    return installers, packages, routes


def preferences_predecessors(path, originals):
    _, packages, _ = read_pinned_handoff(path, PREFERENCES_HANDOFF_SHA256,
                                        "KIKILINK_PREFERENCES104")
    need(set(packages) == set(PREFERENCES_LINEAGES), "preferences_lineages_changed")
    changed = {"api/ops/private-community-upgrade.mjs", "api/shared/preferences-catalog.json",
               "api/src/app.mjs", "api/src/auth.mjs", "api/src/preferences.mjs",
               "api/src/validation.mjs", "api/test/preferences.test.mjs", "group-trial.json",
               "manifest.json", "private-cloud.py", "private-group-dispatch.py",
               "private-group-upgrade.py"}
    for previous, files in packages.items():
        manifest = json.loads(files["manifest.json"])
        pin = PREFERENCES_LINEAGES[previous]
        need(manifest["release"] == pin["release"] and
             sha(files["manifest.json"].encode()) == pin["manifest"], "preferences_package_changed")
        original = originals[previous]
        old = json.loads(original["manifest.json"])
        need(set(files) == set(original) and
             {name for name in files if files[name] != original[name]} == changed,
             "preferences_scope_changed")
        need(manifest["scope"]["schemaVersion"] == 9 and
             manifest["featureSourceLock"] == old["featureSourceLock"] and
             manifest["dependency_locks"] == old["dependency_locks"] and
             manifest["verifierSources"] == old["verifierSources"],
             "preferences_runtime_or_dependencies_changed")
    return packages


def verify_package(files, manifest):
    hashes = manifest["files"]
    need(set(files) == set(hashes) | {"manifest.json"}, "package_files_mismatch")
    need(10 <= len(hashes) <= 100, "package_file_count_exceeds_operator_bound")
    need(sha(json.dumps(hashes, sort_keys=True, separators=(",", ":")).encode())[:12] ==
         manifest["release"], "package_release_mismatch")
    for name, expected in hashes.items():
        need(safe_name(name) and isinstance(files[name], str), "package_path_refused")
        body = files[name].encode()
        need(len(body) <= MAX_FILE and sha(body) == expected, "package_file_mismatch")


def replace_once(value, before, after):
    need(value.count(before) == 1, "operator_source_changed: " + before[:70])
    return value.replace(before, after)


def advance_schemas(value):
    """Advance only explicit schema/feed labels and schema-number literals."""
    # The '-' exclusion preserves digit ranges in security expressions such as
    # [a-f0-9]. These templates are pinned above, not arbitrary source input.
    value = re.sub(r"schema([-_]?)9|feed9|FEED9|(?<![\w-])9\b|nine(?!\w)", lambda match: {
        "feed9": "feed11", "FEED9": "FEED11", "9": "11", "nine": "eleven",
    }.get(match[0], match[0][:-1] + "11"), value)
    return re.sub(r"schema([-_]?)8|(?<![\w-])8\b|eight(?!\w)", lambda match: {
        "8": "9", "eight": "nine",
    }.get(match[0], match[0][:-1] + "9"), value)


def migration_operator(source):
    start = source.index("function knownMigrations() {")
    end = source.index("\nfunction migrationState", start)
    source = source[:start] + "KNOWN_MIGRATIONS_FUNCTION\n" + source[end:]
    source = advance_schemas(source)
    known = '''function knownMigrations() {
  const migrations = Database.prototype.migrations.call({});
  requireThat(migrations.length === 11 && migrations[8].name === "009_feed_highlights.sql" &&
    migrations[9].name === "010_feed_community_tools.sql" && migrations[10].name === "011_feed_reactions.sql", "unexpected_candidate_migrations");
  return migrations;
}
'''
    return replace_once(source, "KNOWN_MIGRATIONS_FUNCTION\n", known)


def updated_package(repo, previous_files, migration_template=None):
    old = json.loads(previous_files["manifest.json"])
    previous = old["release"]
    files = {name: body for name, body in previous_files.items() if name != "manifest.json"}
    need(old["scope"]["schemaVersion"] == 9, "feed9_schema_required")
    need(sha((repo / "cloud/package-lock.json").read_bytes()) == old["featureSourceLock"],
         "dependency_change_requires_separate_image_review")
    migrations = sorted((repo / "cloud/migrations").glob("*.sql"))
    need(len(migrations) == 11 and [item.name for item in migrations[9:]] == MIGRATIONS,
         "expected_exact_schema11")
    for migration in migrations[:9]:
        need(migration.read_text() == files["api/migrations/" + migration.name],
             "immutable_migration_changed: " + migration.name)

    # The established isolated test set has no client build/dev dependencies.
    # Add the new API contracts; client integration tests run in repository CI.
    source_names = sorted(name for name in files if name.startswith((
        "api/src/", "api/test/", "api/shared/", "api/migrations/")))
    for directory, pattern in (("src", "*.mjs"), ("shared", "*.json"), ("migrations", "*.sql")):
        source_names += ["api/" + str(path.relative_to(repo / "cloud"))
                         for path in sorted((repo / "cloud" / directory).glob(pattern))]
    source_names += ["api/test/feed-community-tools.test.mjs", "api/test/feed-reactions.test.mjs"]
    source_names = sorted(set(source_names))
    for name in source_names:
        path = repo / "cloud" / name.removeprefix("api/")
        need(path.is_file() and not path.is_symlink(), "source_missing_or_symlink: " + name)
        files[name] = path.read_text()
    for name in ("ops/backup.mjs", "verifier/bc-adapter.mjs"):
        # These infrastructure paths are intentionally unchanged for this release.
        need((repo / "cloud" / name).read_text() == files["api/" + name],
             "infrastructure_change_requires_review: " + name)

    original = old["scope"]["predecessor"]
    for name in ("private-cloud.py", "private-group-dispatch.py", "group-trial.json"):
        need(original in files[name], "predecessor_pin_missing: " + name)
        files[name] = files[name].replace(original, previous)
    files["private-cloud.py"] = replace_once(files["private-cloud.py"],
        "body != {'status': 'ok', 'schemaVersion': 9}",
        "body != {'status': 'ok', 'schemaVersion': 11}")
    need(files["private-cloud.py"].count("schemaVersion=9") == 2, "runtime_schema_labels_changed")
    files["private-cloud.py"] = files["private-cloud.py"].replace("schemaVersion=9", "schemaVersion=11")

    # Preferences 1.0.4 deliberately used a same-schema operator. The reviewed
    # Feed9 template supplies the 9 -> 11 migration path, while all predecessor
    # identity/source pins below refer to the actual Preferences installation.
    template = migration_template if migration_template is not None else previous_files
    controller = advance_schemas(template["private-group-upgrade.py"])
    controller = replace_once(controller, "migration 009", "migrations 010 and 011")
    for field, value in {
        "PREVIOUS": previous,
        "PREVIOUS_SOURCE": sha(previous_files["private-cloud.py"].encode()),
        "PREVIOUS_MANIFEST": sha(previous_files["manifest.json"].encode()),
    }.items():
        pattern = r"(?m)^" + field + r" = '[a-f0-9]+'$"
        controller, count = re.subn(pattern, field + " = " + repr(value), controller)
        need(count == 1, "controller_pin_missing: " + field)
    files["private-group-upgrade.py"] = controller
    files["api/ops/private-community-upgrade.mjs"] = migration_operator(
        template["api/ops/private-community-upgrade.mjs"])
    for name in ("private-group-upgrade.py", "api/ops/private-community-upgrade.mjs"):
        for expression in ("[a-f0-9]{64}", "[a-z0-9_]"):
            need(template[name].count(expression) == files[name].count(expression),
                 "security_expression_changed: " + name)
    # This test ships with the candidate and runs inside the existing isolated
    # pre-switch gate as well as locally against disposable SQLite databases.
    files["api/test/feed11-deployment.test.mjs"] = (
        repo / "scripts/cloud-feed11-deployment.test.mjs").read_text()
    for name, body in files.items():
        if name.endswith(".py"):
            compile(body, name, "exec")

    hashes = {name: sha(body.encode()) for name, body in sorted(files.items())}
    manifest = copy.deepcopy(old)
    manifest["files"] = hashes
    manifest["release"] = sha(json.dumps(hashes, sort_keys=True, separators=(",", ":")).encode())[:12]
    manifest["apiSources"] = {name.removeprefix("api/"): value for name, value in hashes.items()
                              if name.startswith("api/")}
    manifest["sourceRevision"] = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    manifest["sourceTreeDirty"] = bool(subprocess.check_output(
        ["git", "status", "--porcelain"], cwd=repo, text=True).strip())
    manifest["scope"].update(predecessor=previous, schemaVersion=11,
        migrations=MIGRATIONS, rollback="schema9-checkpoint-before-exposure-only",
        liveInstallationVerified=False, **{feature: True for feature in FEATURES})
    files["manifest.json"] = json_bytes(manifest).decode()
    verify_package(files, manifest)
    return files


def installer(previous_files, files):
    old = json.loads(previous_files["manifest.json"])
    new = json.loads(files["manifest.json"])
    packed = compressed(files)
    encoded = "\n".join(textwrap.wrap(base64.b64encode(packed).decode(), 100))
    template = '''import base64,gzip,hashlib,importlib.util,json,os,re,socket,stat,sys
from pathlib import Path
os.umask(0o077)
def need(ok,code):
    if not ok: raise RuntimeError(code)
def sha(data): return hashlib.sha256(data).hexdigest()
def read(path,private=False):
    info=path.lstat()
    need(path.resolve()==path and stat.S_ISREG(info.st_mode) and info.st_uid==0 and info.st_size<=4194304 and not info.st_mode&(0o077 if private else 0o022),'PROTECTED_PACKAGE_REQUIRED')
    return path.read_bytes()
def directory(path):
    info=path.lstat()
    need(path.resolve()==path and stat.S_ISDIR(info.st_mode) and info.st_uid==0 and not info.st_mode&0o077,'PROTECTED_DIRECTORY_REQUIRED')
need(os.geteuid()==0 and socket.gethostname()=='kiki-bot-01','EXPECTED_ROOT_ON_KIKI_BOT_01')
base=Path('/opt/kikilink-cloud-private/@@PREVIOUS@@')
directory(base.parent)
directory(base)
raw=read(base/'manifest.json',True)
need(sha(raw)=='@@PREVIOUS_MANIFEST@@','PREDECESSOR_MANIFEST_CHANGED')
old=json.loads(raw)
for name,expected in old['files'].items():
    need(re.fullmatch(r'[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*',name) and '..' not in Path(name).parts,'PREDECESSOR_PATH_REFUSED')
    need(sha(read(base/name))==expected,'PREDECESSOR_FILES_CHANGED')
packed=base64.b64decode('@@PAYLOAD@@')
need(sha(packed)=='@@PAYLOAD_HASH@@','FEED11_PAYLOAD_CHANGED')
contents=json.loads(gzip.decompress(packed))
metadata=json.loads(contents['manifest.json'])
need(sha(contents['manifest.json'].encode())=='@@MANIFEST_HASH@@','FEED11_MANIFEST_CHANGED')
need(metadata['release']=='@@RELEASE@@' and set(contents)==set(metadata['files'])|{'manifest.json'},'FEED11_CONTENTS_CHANGED')
need(sha(json.dumps(metadata['files'],sort_keys=True,separators=(',',':')).encode())[:12]=='@@RELEASE@@','FEED11_ID_CHANGED')
for name,expected in metadata['files'].items():
    need(re.fullmatch(r'[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*',name) and '..' not in Path(name).parts,'FEED11_PATH_REFUSED')
    need(sha(contents[name].encode())==expected,'FEED11_FILE_CHANGED')
current=json.loads(read(Path('/var/lib/kikilink-cloud-private-control/state.json'),True))
need(current['release'] in ('@@PREVIOUS@@','@@RELEASE@@'),'UNRECOGNIZED_CURRENT_RELEASE')
target=base.parent/'@@RELEASE@@'
target.mkdir(mode=0o700,exist_ok=True)
directory(target)
for name,body in contents.items():
    path=target/name
    for parent in reversed(path.relative_to(target).parents):
        folder=target/parent
        folder.mkdir(mode=0o700,exist_ok=True)
        directory(folder)
    data=body.encode()
    mode=0o600 if name=='manifest.json' else 0o644
    if path.exists(): need(read(path,name=='manifest.json')==data,'FEED11_INSTALL_COLLISION')
    else:
        fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
        os.fchmod(fd,mode)
        with os.fdopen(fd,'wb') as stream:
            stream.write(data);stream.flush();os.fsync(stream.fileno())
    os.chmod(path,mode)
spec=importlib.util.spec_from_file_location('feed11_installed_operator',target/'private-cloud.py')
op=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=op
spec.loader.exec_module(op)
op.bundle()
op.install()
'''
    values = {"PREVIOUS": old["release"], "PREVIOUS_MANIFEST": sha(previous_files["manifest.json"].encode()),
              "RELEASE": new["release"], "MANIFEST_HASH": sha(files["manifest.json"].encode()),
              "PAYLOAD_HASH": sha(packed), "PAYLOAD": encoded.replace("\n", "")}
    for key, value in values.items():
        template = template.replace("@@" + key + "@@", value)
    need("@@" not in template, "installer_placeholder_remaining")
    compile(template, "feed11-installer", "exec")
    return template


def handoff(installers, routes):
    packed = compressed(installers)
    source = f'''import base64,gzip,hashlib,json,os,socket,stat
from pathlib import Path
os.umask(0o077)
def need(ok,code):
    if not ok: raise RuntimeError(code)
need(os.geteuid()==0 and socket.gethostname()=='kiki-bot-01','EXPECTED_ROOT_ON_KIKI_BOT_01')
p=Path('/var/lib/kikilink-cloud-private-control/state.json')
s=p.lstat()
need(p.resolve()==p and stat.S_ISREG(s.st_mode) and s.st_uid==0 and not s.st_mode&0o077 and s.st_size<4194304,'PROTECTED_STATE_REQUIRED')
release=json.loads(p.read_bytes())['release']
routes={routes!r}
need(release in routes,'UNRECOGNIZED_CURRENT_RELEASE')
packed=base64.b64decode('{base64.b64encode(packed).decode()}')
need(hashlib.sha256(packed).hexdigest()=='{sha(packed)}','FEED11_HANDOFF_CHANGED')
script=json.loads(gzip.decompress(packed))[routes[release]]
exec(compile(script,'feed11-pinned-installer','exec'),{{'__name__':'__main__'}})
'''
    compile(source, "feed11-handoff", "exec")
    return "sudo /usr/bin/python3 -I -B - <<'KIKILINK_FEED11'\n" + source + "KIKILINK_FEED11\n"


def save(path, body):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body)


def release_lineages(repo, feed9_path, feed11_path, preferences_path):
    originals = read_predecessors(feed9_path)
    scripts, frozen, routes = read_pinned_handoff(
        feed11_path, ORIGINAL_FEED11_SHA256, "KIKILINK_FEED11")
    need(set(frozen) == set(originals), "original_feed11_lineages_changed")
    entries = [(previous, files, scripts[previous], True)
               for previous, files in frozen.items()]
    preferences = preferences_predecessors(preferences_path, originals)
    for original, previous_files in preferences.items():
        previous = json.loads(previous_files["manifest.json"])["release"]
        files = updated_package(repo, previous_files, originals[original])
        manifest = json.loads(files["manifest.json"])
        # This handoff correction changes installation lineage, not released API
        # behavior. Keep every API file identical to the already tested Feed11.
        need(manifest["apiSources"] == json.loads(frozen[original]["manifest.json"])["apiSources"],
             "feed11_api_changed_requires_separate_release")
        entries.append((previous, files, installer(previous_files, files), False))
        routes.update({previous: previous, manifest["release"]: previous})
    return entries, routes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--feed9-handoff", type=Path, required=True)
    parser.add_argument("--preferences-handoff", type=Path, required=True)
    parser.add_argument("--feed11-handoff", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    entries, routes = release_lineages(repo, args.feed9_handoff, args.feed11_handoff,
                                      args.preferences_handoff)
    installers, lineages = {}, []
    for previous, files, script, preserved in entries:
        manifest = json.loads(files["manifest.json"])
        release = manifest["release"]
        for name, body in files.items():
            save(args.output / "packages" / release / name, body)
        installers[previous] = script
        save(args.output / "installers" / (previous + ".py"), script)
        lineages.append({"previous": previous, "release": release,
                         "manifestSha256": sha(files["manifest.json"].encode()),
                         "installerSha256": sha(script.encode()), "files": len(manifest["files"]),
                         "sourceRevision": manifest["sourceRevision"],
                         "sourceTreeDirty": manifest["sourceTreeDirty"],
                         "preservedOriginalFeed11": preserved})
    script = handoff(installers, routes)
    artifact = args.output / "KikiLink-Cloud-Feed11-Update.txt"
    save(artifact, script)
    report = {"format": 1, "fromSchema": 9, "schemaVersion": 11,
              "predecessorHandoffPayloadSha256": HANDOFF_HASH, "lineages": lineages,
              "preferencesHandoffSha256": PREFERENCES_HANDOFF_SHA256,
              "originalFeed11Sha256": ORIGINAL_FEED11_SHA256,
              "artifact": artifact.name, "artifactSha256": sha(script.encode()),
              "deploymentExecuted": False, "features": FEATURES}
    save(args.output / "Feed11-build-report.json", json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
