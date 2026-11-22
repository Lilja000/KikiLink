#!/usr/bin/env python3
"""Same-schema controller switch. Uses existing images, data, and owner controls."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import time

PREVIOUS = '@@PREVIOUS@@'
PREVIOUS_MANIFEST = '@@PREVIOUS_MANIFEST@@'
PACKAGES = Path('/opt/kikilink-cloud-private')
LAUNCHER = Path('/usr/local/bin/kikilink-cloud-private')
SYSTEMD = Path('/etc/systemd/system')
JOB = 'kikilink-cloud-runtime-isolation-upgrade.service'
JOURNAL = 'runtime-isolation-upgrade.json'


def load(root, name):
    spec = importlib.util.spec_from_file_location(name, root / 'private-cloud.py')
    op = importlib.util.module_from_spec(spec)
    sys.modules[name] = op
    spec.loader.exec_module(op)
    return op


def previous(op):
    root = PACKAGES / PREVIOUS
    op.directory(root)
    op.need(op.sha(op.read_file(root / 'manifest.json')) == PREVIOUS_MANIFEST,
            'previous_manifest_changed')
    old = load(root, 'isolation_previous_runtime')
    op.need(old.bundle()['release'] == PREVIOUS, 'previous_package_changed')
    return old


def launcher(op):
    return '#!/bin/sh\nexec /usr/bin/sudo -n /usr/bin/python3 -I -B ' + str(op.ROOT / 'private-group-dispatch.py') + ' "$@"\n'


def units(op):
    direct, dispatch = str(op.ROOT / 'private-cloud.py'), str(op.ROOT / 'private-group-dispatch.py')
    return {name: text.replace(direct, dispatch) for name, text in op.units().items()}


def check_files(op, old):
    for name, text in units(op).items():
        op.need(op.read_file(SYSTEMD / name, private=False) in
                (units(old)[name].encode(), text.encode()), 'private_unit_changed')
    op.need(op.read_file(LAUNCHER, private=False) in
            (launcher(old).encode(), launcher(op).encode()), 'private_launcher_changed')


def activate_files(op, runtime):
    for name, text in units(runtime).items():
        op.write(SYSTEMD / name, text, mode=0o644)
    op.run(['/usr/bin/systemd-analyze', 'verify', *[str(SYSTEMD / name) for name in units(runtime)]])
    op.systemctl('daemon-reload')
    op.write(LAUNCHER, launcher(runtime), mode=0o755)


def record(op, value, phase):
    value['phase'] = phase
    op.write(op.CONTROL / JOURNAL, value)
    print(json.dumps({'event': 'cloud_runtime_isolation', 'phase': phase}, separators=(',', ':')), flush=True)


def journal(op):
    value = op.read_json(op.CONTROL / JOURNAL)
    op.need(value['format'] == 1 and value['release'] == op.bundle()['release'] and
            value['previous_state']['release'] == PREVIOUS, 'runtime_update_record_changed')
    return value


def wait_api(op):
    for _ in range(90):
        result = op.status(quiet=True)
        if result.get('apiReady') and result.get('liveReady') and result['unit'] == 'active':
            return result
        # The status file can still contain the predecessor's refusal until the
        # new process publishes its first status. Judge failure by the unit.
        if result['unit'] == 'failed':
            raise op.Refused('runtime_update_start_failed')
        time.sleep(2)
    raise op.Refused('runtime_update_readiness_timeout')


def restore(op, old, value):
    # Controller rollback only. Never restore a database or revoke auth devices.
    op.systemctl('stop', op.UNIT, op.TIMER, timeout=180)
    current = op.read_json(op.CONTROL / 'state.json')
    op.need(current['release'] in (PREVIOUS, value['release']), 'runtime_rollback_release_conflict')
    with op.lock('runtime'):
        runtime = old if current['release'] == PREVIOUS else op
        op.need(not runtime.cleanup_locked(current), 'runtime_rollback_cleanup_pending')
        op.write(op.CONTROL / 'state.json', value['previous_state'])
        activate_files(op, old)
    op.systemctl('start', op.TIMER)
    if value['previous_was_active']:
        op.systemctl('start', op.UNIT, check=False)
    record(op, value, 'rolled_back')


def update(op):
    old = previous(op)
    with op.lock('runtime-isolation-upgrade'), op.lock('schema11-upgrade'), op.lock('data-ops'):
        if (op.CONTROL / JOURNAL).exists():
            value = journal(op)
            op.need(value['phase'] == 'complete', 'runtime_update_requires_review')
            return
        op.need(old.bundle()['scope']['schemaVersion'] == 11, 'schema11_runtime_required')
        saved = copy.deepcopy(old.state())
        op.need(saved['prepared'] is True and op.config_hashes() == saved['config_hashes'],
                'private_config_changed')
        op.verify_host()
        check_files(op, old)
        old.idle(saved)
        old.build_images(saved, old.bundle())
        op.need(op.proxy_module().read_admin()[0] in
                (saved['plan']['baseline'], saved['plan']['candidate']), 'proxy_concurrent_change')
        status = old.status(quiet=True)
        op.need(status['backupTimer'] == 'active', 'backup_schedule_not_active')
        # Fully stubbed controller checks run before the service or route changes.
        op.run(['/usr/bin/python3', '-I', '-B', str(op.ROOT / 'runtime-isolation-tests.py')], timeout=60)
        old.ops('verify', saved)
        if not status.get('backupFresh'):
            backup = old.ops('backup', saved, 'host')
            op.need(backup.get('restoreVerified') is True, 'backup_restore_not_verified')
            op.write(op.CONTROL / 'backup.json', backup)
        candidate = copy.deepcopy(saved)
        candidate.update(release=op.bundle()['release'], runtimeIsolation=True,
                         runtimeIsolationPreviousRelease=PREVIOUS)
        value = {'format': 1, 'release': candidate['release'], 'previous_state': saved,
                 'candidate_state': candidate, 'previous_was_active': status['unit'] == 'active'}
        record(op, value, 'prepared')
        switched = False
        try:
            record(op, value, 'stopping')
            switched = True
            old.systemctl('stop', old.UNIT, old.TIMER, timeout=180)
            with op.lock('runtime'):
                op.need(not old.cleanup_locked(saved), 'runtime_cleanup_pending')
                op.need(op.proxy_module().read_admin()[0] == saved['plan']['baseline'], 'route_not_withdrawn')
                op.need(op.config_hashes() == saved['config_hashes'], 'private_config_changed')
                activate_files(op, op)
                op.write(op.CONTROL / 'state.json', candidate)
                record(op, value, 'activating')
            op.systemctl('reset-failed', op.UNIT)
            op.systemctl('enable', op.UNIT, op.TIMER)
            op.systemctl('start', op.UNIT)
            wait_api(op)
            op.systemctl('start', op.TIMER)
            record(op, value, 'complete')
        except Exception:
            if switched:
                try:
                    restore(op, old, value)
                except Exception:
                    record(op, value, 'needs_review')
            else:
                record(op, value, 'needs_review')
            raise


def recover(op):
    if not (op.CONTROL / JOURNAL).exists():
        return
    with op.lock('runtime-isolation-upgrade'), op.lock('schema11-upgrade'), op.lock('data-ops'):
        value = journal(op)
        if value['phase'] in ('prepared', 'stopping', 'activating'):
            restore(op, previous(op), value)


def observe(op):
    if not (op.CONTROL / JOURNAL).exists():
        return {'phase': 'not_started'}
    value = journal(op)
    result = {'phase': value['phase'], 'release': value['release']}
    if value['phase'] == 'complete':
        status = op.status(quiet=True)
        result.update(apiReady=status.get('apiReady', False),
                      verificationReady=status.get('verificationReady', False),
                      verifierState=status.get('verifierState', 'unknown'))
    return result


def install(op):
    old = previous(op)
    check_files(op, old)
    active = op.systemctl('show', JOB, '--property=ActiveState', '--value').stdout.strip()
    if not (op.CONTROL / JOURNAL).exists():
        op.need(active in ('inactive', 'active', 'activating'), 'runtime_update_job_requires_review')
        if active == 'inactive':
            command = '/usr/bin/python3 -I -B ' + str(op.ROOT / 'runtime-isolation-update.py')
            op.run(['/usr/bin/systemd-run', '--no-block', '--unit=' + JOB,
                    '--property=Type=oneshot', '--property=TimeoutStartSec=2400',
                    '--property=TimeoutStopSec=300', '--property=UMask=0077',
                    '--property=MemoryMax=192M', '--property=StandardInput=null',
                    '--property=ExecStopPost=' + command + ' recover',
                    '/usr/bin/python3', '-I', '-B', str(op.ROOT / 'runtime-isolation-update.py'), 'update'])
    for _ in range(10):
        result = observe(op)
        if result['phase'] == 'complete':
            op.need(result.get('apiReady') is True, 'runtime_update_api_unavailable_use_status')
            print(json.dumps(result, separators=(',', ':')), flush=True)
            print('KIKI_CLOUD_RUNTIME_ISOLATION_READY', flush=True)
            return
        op.need(result['phase'] not in ('rolled_back', 'needs_review'), 'runtime_update_requires_review')
        op.need(op.systemctl('show', JOB, '--property=ActiveState', '--value').stdout.strip() != 'failed',
                'runtime_update_job_failed')
        time.sleep(2)
    print('KIKI_CLOUD_RUNTIME_ISOLATION_STILL_WORKING: rerun this handoff to observe', flush=True)


def main():
    op = load(Path(__file__).resolve().parent, 'isolation_installed_runtime')
    op.need(op.os.geteuid() == 0, 'use_owner_command')
    op.bundle()
    op.need(op.ROOT == PACKAGES / op.bundle()['release'], 'installed_entrypoint_required')
    action = sys.argv[1:]
    op.need(action in (['update'], ['recover']), 'runtime_update_action_refused')
    globals()[action[0]](op)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('{"event":"cloud_runtime_isolation","phase":"refused"}', flush=True)
        sys.exit(78)
