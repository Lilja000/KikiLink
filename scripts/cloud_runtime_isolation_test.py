#!/usr/bin/env python3
"""Exercise the real controller with fake host, Docker and network operations."""
from contextlib import nullcontext
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch


def load_operator(path):
    spec = importlib.util.spec_from_file_location('isolated_runtime_test', path)
    op = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(op)
    return op


class IsolationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.op = load_operator(Path(sys.argv[0]).resolve().parent / 'private-cloud.py')

    def test_runner_can_be_missing_unhealthy_or_replaced(self):
        op = self.op
        for runner in (None, 'unhealthy', 'replaced'):
            with self.subTest(runner=runner), patch.multiple(op,
                    socket=SimpleNamespace(gethostname=lambda: 'kiki-bot-01'),
                    read_file=lambda *a, **k: b'caddy',
                    sha=lambda _: op.CADDY_SHA,
                    systemctl=lambda *a, **k: SimpleNamespace(stdout=str(op.CADDY)),
                    inspect=Mock(side_effect=AssertionError('gameplay Runner must not be queried'))):
                op.verify_host()

    def test_caddy_identity_still_checked(self):
        op = self.op
        with patch.multiple(op, socket=SimpleNamespace(gethostname=lambda: 'kiki-bot-01'),
                read_file=lambda *a, **k: b'changed', sha=lambda _: 'wrong'):
            with self.assertRaisesRegex(op.Refused, 'caddy_source_changed'):
                op.verify_host()

    def test_verifier_faults_are_local_and_diagnostics_are_bounded(self):
        op = self.op
        for error in (op.Refused('verifier_already_running'), op.Refused('identity_mismatch'),
                      op.Refused('container_name_collision'), PermissionError('secret details'),
                      ValueError('malformed marker')):
            with self.subTest(error=type(error).__name__), patch.object(op, 'verifier_monitor', side_effect=error):
                monitor = {}
                self.assertEqual(op.supervise_verifier({}, monitor), 'unavailable')
                self.assertNotIn('secret', monitor['error'])
                self.assertLessEqual(len(monitor['error']), 100)
        with patch.object(op, 'verifier_monitor', return_value='online'):
            monitor = {'error': 'old_error'}
            self.assertEqual(op.supervise_verifier({}, monitor), 'online')
            self.assertNotIn('error', monitor)

    def test_suspension_preserved_without_start_attempts(self):
        op = self.op
        with tempfile.TemporaryDirectory() as folder:
            marker = Path(folder) / 'suspended.json'
            content = json.dumps({'reason': 'server_disconnect', 'at': 123}).encode()
            marker.write_bytes(content)
            docker = Mock(side_effect=AssertionError('a suspended bot must not be restarted'))
            with patch.multiple(op, SERVICE_STATE=Path(folder), docker=docker,
                                read_file=lambda p, *a, **k: p.read_bytes()):
                self.assertEqual(op.supervise_verifier({}, {}), 'suspended')
            self.assertEqual(marker.read_bytes(), content)
            docker.assert_not_called()

    def test_malformed_suspension_preserved_and_api_unaffected(self):
        op = self.op
        with tempfile.TemporaryDirectory() as folder:
            marker = Path(folder) / 'suspended.json'
            marker.write_bytes(b'{bad json')
            with patch.multiple(op, SERVICE_STATE=Path(folder), read_file=lambda p, *a, **k: p.read_bytes(),
                                docker=Mock(side_effect=AssertionError('no login may be attempted'))):
                monitor = {}
                self.assertEqual(op.supervise_verifier({}, monitor), 'unavailable')
            self.assertEqual(marker.read_bytes(), b'{bad json')

    def test_verifier_process_retries_remain_bounded(self):
        op = self.op
        with tempfile.TemporaryDirectory() as folder:
            clock = [10]
            starts = []
            def denied(*a, **k):
                starts.append(clock[0])
                raise op.Refused('verifier_already_running')
            with patch.multiple(op, SERVICE_STATE=Path(folder),
                    time=SimpleNamespace(monotonic=lambda: clock[0]), owned=lambda *a: False,
                    remove_owned=lambda *a: None, verifier_check=denied):
                monitor = {'next_restart': 0}
                for clock[0] in (10, 25, 100, 309, 310):
                    self.assertEqual(op.supervise_verifier({'release': 'fake', 'images': {'verifier': 'fake'}}, monitor),
                                     'process_recovery_wait')
            self.assertEqual(starts, [10, 310])

    def run_serve(self, verifier, healthy=True):
        op = self.op
        value = {'release': 'fake', 'prepared': True, 'images': {'api': 'api', 'verifier': 'verifier'},
                 'plan': {'baseline': {'old': True}, 'candidate': {'api': True}}, 'config_hashes': {}}
        ticks = [0]
        events, runs, removed = [], [], []
        def sleep(_):
            ticks[0] += 15
            if ticks[0] >= (240 if not healthy else 45):
                op.STOP = True
        def monitor(*args):
            if isinstance(verifier, Exception): raise verifier
            return verifier
        proxy = SimpleNamespace(read_admin=lambda: ({'api': True}, None),
                                admin_patch=lambda *a: None, transition=lambda *a, **k: None)
        with patch.multiple(op, STOP=False, state=lambda: value,
                signal=SimpleNamespace(signal=lambda *a: None, SIGTERM=15, SIGINT=2),
                time=SimpleNamespace(monotonic=lambda: ticks[0], sleep=sleep),
                lock=lambda *a: nullcontext(), proxy_module=lambda: proxy,
                wait_host=lambda *a: None, config_hashes=lambda: {}, idle=lambda *a: None,
                remove_owned=lambda *a: removed.append(a), ops=lambda *a: {},
                verifier_check=Mock(side_effect=AssertionError('verifier preflight must not gate API start')),
                docker=lambda *a, **k: runs.append(a), common=lambda *a: [], wait_ready=lambda *a, **k: None,
                http=lambda *a: (401, {'access-control-allow-origin': a[1]}, {}),
                verify_host=lambda: None, verifier_monitor=monitor,
                readiness=lambda *a, **k: healthy if not k.get('verifier', a[1] if len(a) > 1 else True) else False,
                emit=lambda phase, **more: events.append({'phase': phase, **more}),
                cleanup_locked=lambda *a: []):
            if healthy:
                op.serve()
            else:
                with self.assertRaisesRegex(op.Refused, 'private_api_unhealthy'):
                    op.serve()
        return events, runs, removed

    def test_api_boots_and_stays_online_with_every_verifier_failure(self):
        for state in ('suspended', 'connecting', 'process_recovery_wait',
                      self.op.Refused('verifier_suspension_invalid'), FileNotFoundError('state missing')):
            with self.subTest(state=str(state)):
                events, runs, removed = self.run_serve(state)
                online = [e for e in events if e['phase'] == 'online']
                self.assertGreaterEqual(len(online), 3)
                self.assertTrue(all(e['apiReady'] and e['liveReady'] and not e['verificationReady'] for e in online))
                self.assertEqual(len(runs), 1)
                self.assertEqual(removed, [(self.op.NAMES['api'], 'fake')])

    def test_real_api_failure_still_triggers_recovery(self):
        self.run_serve('suspended', healthy=False)

    def test_status_reports_api_availability_separately(self):
        op = self.op
        with tempfile.TemporaryDirectory() as folder:
            control = Path(folder)
            (control / 'status.json').touch()
            source = {'phase': 'online', 'at': 1, 'verifierState': 'suspended'}
            value = {'plan': {'candidate': 'api'}}
            proxy = SimpleNamespace(read_admin=lambda: ('api', None))
            def systemctl(*args, **kwargs):
                if args[0] == 'is-enabled': return SimpleNamespace(stdout='enabled')
                return SimpleNamespace(stdout='inactive' if op.SETUP in args else 'active')
            with patch.multiple(op, CONTROL=control, read_json=lambda *a: source, state=lambda: value,
                    systemctl=systemctl, proxy_module=lambda: proxy,
                    readiness=lambda *a, **k: not k.get('verifier', False)):
                result = op.status(quiet=True)
            self.assertEqual(result['phase'], 'online')
            self.assertTrue(result['apiReady'] and result['liveReady'])
            self.assertFalse(result['verificationReady'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
