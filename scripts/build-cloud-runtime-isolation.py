#!/usr/bin/env python3
"""Build a controller-only update from the delivered, pinned Feed11 handoff.

No host is contacted. The handoff reconstructs immutable packages from their
installed predecessors; API, verifier, images, credentials and schema stay intact.
"""
import argparse
import ast
import base64
import copy
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess

from cloud_runtime_isolation import isolate_controller

FEED11_PAYLOAD_SHA = 'c0083b443ce144050e4c42dd12e69baa0489690210231d964d2869ad02cd218b'
PREDECESSORS = {
    '667a84ed7707': 'ec3dfc73fa066e111269dec8a77057a0c0d0d65dfd2ddb3c0e27640c6f04bc02',
    'a9001529ea12': 'b278e13628c6f79f08ad6cc356a4ab6cc43ad8254c849d7a1a2f43ee52424cee',
    'da7052b1dcf4': '4e039487af15698826904cce3218789891ca1b08bd6e648478c17c3b7a0a9793',
    '00f139253cc5': 'd3a6568e766bbbd232fa24b7deff745a7617cc57b7ed24c00790e1075e41b953',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':')) + '\n').encode()


def compressed(value):
    stream = io.BytesIO()
    with gzip.GzipFile(filename='', mode='wb', fileobj=stream, mtime=0) as f:
        f.write(encoded(value))
    return stream.getvalue()


def packed_literal(source):
    nodes = [n.value for n in ast.parse(source).body if isinstance(n, ast.Assign) and
             any(isinstance(t, ast.Name) and t.id == 'packed' for t in n.targets)]
    if len(nodes) != 1:
        raise ValueError('expected_one_payload')
    n = nodes[0]
    if not (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and
            isinstance(n.func.value, ast.Name) and n.func.value.id == 'base64' and
            n.func.attr == 'b64decode' and len(n.args) == 1 and not n.keywords):
        raise ValueError('expected_literal_payload')
    return base64.b64decode(''.join(ast.literal_eval(n.args[0]).split()), validate=True)


def read_predecessors(path):
    raw = path.read_text()
    payload = base64.b64decode(raw.strip(), validate=True) if path.suffix == '.b64' else \
        packed_literal('\n'.join(raw.splitlines()[1:-1]))
    if sha(payload) != FEED11_PAYLOAD_SHA:
        raise ValueError('feed11_handoff_changed')
    result = {}
    for installer in json.loads(gzip.decompress(payload)).values():
        files = json.loads(gzip.decompress(packed_literal(installer)))
        manifest = json.loads(files['manifest.json'])
        release = manifest['release']
        if release not in PREDECESSORS or sha(files['manifest.json'].encode()) != PREDECESSORS[release]:
            raise ValueError('feed11_manifest_changed')
        if set(files) != set(manifest['files']) | {'manifest.json'} or manifest['scope']['schemaVersion'] != 11:
            raise ValueError('feed11_package_changed')
        for name, digest in manifest['files'].items():
            if not safe_name(name) or sha(files[name].encode()) != digest:
                raise ValueError('feed11_file_changed')
        if sha(encoded(manifest['files']).strip())[:12] != release:
            raise ValueError('feed11_release_changed')
        result[release] = files
    if set(result) != set(PREDECESSORS):
        raise ValueError('feed11_lineages_changed')
    return result


def safe_name(name):
    return bool(re.fullmatch(r'[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*', name)) and \
        '..' not in Path(name).parts


def candidate(previous, files, scripts):
    changed = {
        'private-cloud.py': isolate_controller(files['private-cloud.py']),
        'runtime-isolation-update.py': (scripts / 'cloud_runtime_update.py').read_text()
            .replace('@@PREVIOUS@@', previous)
            .replace('@@PREVIOUS_MANIFEST@@', PREDECESSORS[previous]),
        'runtime-isolation-tests.py': (scripts / 'cloud_runtime_isolation_test.py').read_text(),
    }
    for name, source in changed.items():
        compile(source, name, 'exec')
    new_files = dict(files, **changed)
    metadata = copy.deepcopy(json.loads(files['manifest.json']))
    metadata['files'] = {name: sha(content.encode()) for name, content in sorted(new_files.items()) if name != 'manifest.json'}
    metadata['release'] = sha(encoded(metadata['files']).strip())[:12]
    metadata['scope'].update(independentRunnerAvailability=True, verifierFailureIsolation=True,
                             sameSchemaControllerUpdate=True, liveInstallationVerified=False)
    metadata['runtimeIsolation'] = {'previousRelease': previous, 'schemaVersion': 11,
                                    'changedFiles': sorted(changed), 'apiImagesInherited': True}
    new_files['manifest.json'] = encoded(metadata).decode()
    changed['manifest.json'] = new_files['manifest.json']
    return new_files, {'release': metadata['release'], 'previousManifest': PREDECESSORS[previous],
                       'manifestSha': sha(new_files['manifest.json'].encode()), 'files': changed}


def handoff(routes):
    payload = compressed(routes)
    wrapper = '''sudo /usr/bin/python3 -I -B - <<'KIKILINK_RUNTIME_ISOLATION'
import base64,gzip,hashlib,importlib.util,json,os,re,socket,stat,sys
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
def safe(name):
    return re.fullmatch(r'[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*',name) and '..' not in Path(name).parts
need(os.geteuid()==0 and socket.gethostname()=='kiki-bot-01','EXPECTED_ROOT_ON_KIKI_BOT_01')
packed=base64.b64decode('@@PAYLOAD@@')
need(sha(packed)=='@@PAYLOAD_SHA@@','ISOLATION_HANDOFF_CHANGED')
routes=json.loads(gzip.decompress(packed))
state=json.loads(read(Path('/var/lib/kikilink-cloud-private-control/state.json'),True))
current=state['release']
matches=[(old,data) for old,data in routes.items() if current in (old,data['release'])]
need(len(matches)==1,'UNRECOGNIZED_CURRENT_RELEASE')
old,patch=matches[0]
base=Path('/opt/kikilink-cloud-private')/old
directory(base.parent);directory(base)
raw=read(base/'manifest.json',True)
need(sha(raw)==patch['previousManifest'],'PREDECESSOR_MANIFEST_CHANGED')
prior=json.loads(raw)
files={}
for name,digest in prior['files'].items():
    need(safe(name),'PACKAGE_PATH_REFUSED')
    body=read(base/name)
    need(sha(body)==digest,'PREDECESSOR_FILE_CHANGED')
    files[name]=body.decode()
files.update(patch['files'])
manifest=json.loads(files['manifest.json'])
need(sha(files['manifest.json'].encode())==patch['manifestSha'],'ISOLATION_MANIFEST_CHANGED')
need(manifest['release']==patch['release'] and set(files)==set(manifest['files'])|{'manifest.json'},'ISOLATION_CONTENTS_CHANGED')
need(sha(json.dumps(manifest['files'],sort_keys=True,separators=(',',':')).encode())[:12]==manifest['release'],'ISOLATION_RELEASE_CHANGED')
for name,digest in manifest['files'].items():
    need(safe(name) and sha(files[name].encode())==digest,'ISOLATION_FILE_CHANGED')
target=base.parent/manifest['release']
target.mkdir(mode=0o700,exist_ok=True);directory(target)
for name,body in files.items():
    path=target/name
    for parent in reversed(path.relative_to(target).parents):
        folder=target/parent;folder.mkdir(mode=0o700,exist_ok=True);directory(folder)
    data=body.encode();mode=0o600 if name=='manifest.json' else 0o644
    if path.exists(): need(read(path,name=='manifest.json')==data,'ISOLATION_INSTALL_COLLISION')
    else:
        fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
        os.fchmod(fd,mode)
        with os.fdopen(fd,'wb') as stream:
            stream.write(data);stream.flush();os.fsync(stream.fileno())
    os.chmod(path,mode)
spec=importlib.util.spec_from_file_location('isolation_owner_update',target/'runtime-isolation-update.py')
update=importlib.util.module_from_spec(spec);sys.modules[spec.name]=update;spec.loader.exec_module(update)
op=update.load(target,'isolation_owner_runtime');op.bundle()
update.install(op)
KIKILINK_RUNTIME_ISOLATION
'''
    return wrapper.replace('@@PAYLOAD@@', base64.b64encode(payload).decode()).replace('@@PAYLOAD_SHA@@', sha(payload))


def build(input_path, output):
    scripts = Path(__file__).resolve().parent
    routes = {}
    report = {'format': 1, 'schemaVersion': 11, 'liveInstallationVerified': False,
              'inputPayloadSha256': FEED11_PAYLOAD_SHA, 'routes': {}}
    output.mkdir(parents=True, exist_ok=True)
    for previous, files in sorted(read_predecessors(input_path).items()):
        new_files, route = candidate(previous, files, scripts)
        routes[previous] = route
        root = output / 'packages' / route['release']
        for name, source in new_files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(source)
        report['routes'][previous] = {'release': route['release'], 'manifestSha': route['manifestSha'],
                                     'changedFiles': sorted(route['files']), 'apiAndVerifierUnchanged': True}
    file = output / 'KikiLink-Cloud-Reliability-Update.txt'
    file.write_text(handoff(routes))
    report['handoffSha256'] = sha(file.read_bytes())
    report['sourceRevision'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=scripts, text=True).strip()
    report['sourceTreeDirty'] = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=scripts, text=True).strip())
    (output / 'report.json').write_bytes(encoded(report))
    print(json.dumps({'handoff': str(file), 'sha256': report['handoffSha256'],
                      'routes': {old: data['release'] for old, data in routes.items()}}, indent=2))
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--feed11-handoff', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    build(args.feed11_handoff, args.output)
