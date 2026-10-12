"""Transform a pinned schema-11 controller without changing API or verifier code."""
import ast
import textwrap


def replace_once(source, before, after):
    if source.count(before) != 1:
        raise ValueError("runtime_source_contract_changed")
    return source.replace(before, after, 1)


SUPERVISOR = textwrap.dedent('''\
def supervise_verifier(value, monitor):
    """An unavailable verifier restricts enrollment, never the authenticated API."""
    try:
        state = verifier_monitor(value, monitor)
        monitor.pop('error', None)
        return state
    except (Refused, OSError, ValueError, TypeError, AttributeError) as error:
        code = str(error) if isinstance(error, Refused) else 'verifier_state_unavailable'
        monitor['error'] = code if re.fullmatch(r'[a-z0-9_]{1,100}', code) else 'verifier_state_unavailable'
        return 'unavailable'


''')


def isolate_controller(source):
    ast.parse(source)
    source = replace_once(source,
        "    need(inspect(RUNNER, '{{.Id}}') == RUNNER_ID, 'runner_baseline_changed')\n"
        "    need(inspect(RUNNER, '{{.State.Health.Status}}') == 'healthy', 'runner_not_ready')\n",
        "    # Cloud owns its own containers. The gameplay Runner is independent.\n")
    source = replace_once(source, "    emit('stopped', dataPreserved=True, proxyRestored=True, runnerHealthy=True)",
        "    emit('stopped', dataPreserved=True, proxyRestored=True)")
    source = replace_once(source,
        "            for kind in ('verifier', 'api'):\n"
        "                remove_owned(NAMES[kind], value['release'])\n"
        "            # Validate identity, credential files and process lock even when a\n"
        "            # terminal marker exists. The verifier itself honors that marker.\n"
        "            verifier_check(value, allow_suspended=True)\n",
        "            remove_owned(NAMES['api'], value['release'])\n"
        "            # Identity, suspension and process-lock checks stay in the verifier\n"
        "            # supervisor; none can prevent an independently healthy API start.\n")
    source = replace_once(source, "def serve():\n", SUPERVISOR + "def serve():\n")
    source = replace_once(source,
        "            emit('verification_delayed', schemaVersion=11, apiReady=True,\n"
        "                 verificationReady=False, automaticStartup=True, testWindow=False)",
        "            emit('online', schemaVersion=11, apiReady=True, liveReady=True,\n"
        "                 verificationReady=False, automaticStartup=True, testWindow=False)")
    source = replace_once(source, "                    verifier_state = verifier_monitor(value, monitor)",
        "                    verifier_state = supervise_verifier(value, monitor)")
    source = replace_once(source,
        "                        phase = ('online' if verification_ready else\n"
        "                                 'verification_delayed' if api_ready else 'reconnecting')\n"
        "                        emit(phase, schemaVersion=11, apiReady=api_ready,\n"
        "                             verificationReady=verification_ready, verifierState=verifier_state,\n"
        "                             automaticStartup=True, testWindow=False)",
        "                        phase = 'online' if api_ready else 'reconnecting'\n"
        "                        emit(phase, schemaVersion=11, apiReady=api_ready, liveReady=api_ready,\n"
        "                             verificationReady=verification_ready, verifierState=verifier_state,\n"
        "                             verifierError=monitor.get('error', ''),\n"
        "                             automaticStartup=True, testWindow=False)")
    source = replace_once(source,
        "('phase', 'at', 'code', 'errors', 'verifierState', 'schemaVersion')",
        "('phase', 'at', 'code', 'errors', 'verifierState', 'verifierError', 'schemaVersion')")
    source = replace_once(source,
        "        result['liveReady'] = result['apiReady'] and result['verificationReady']\n"
        "        result['phase'] = ('online' if result['liveReady'] else\n"
        "                           'verification_delayed' if result['apiReady'] else 'unavailable')",
        "        result['liveReady'] = result['apiReady']\n"
        "        result['phase'] = 'online' if result['apiReady'] else 'unavailable'")
    # Verify that all edits still form a complete controller; no code is executed.
    ast.parse(source)
    return source
