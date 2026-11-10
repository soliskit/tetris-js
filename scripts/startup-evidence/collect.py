"""Private source only. GitHub-only bounded native comparison collector."""
import hashlib
import json
import os
from pathlib import Path
import selectors
import signal
import subprocess
import sys
import time
import uuid

BASE = '84c5eea115bc66be7ae35d14ce35aa12e100f2cb'
BASELINE = '941167f4e0a3d4c61b53aafa930ee467c74c03af'
CANDIDATE = '993e3c7e2b2c4e10e9bcefae9f04d0948f2bfcfc'
NODE_IMAGE = 'node:26-bookworm@sha256:1d9e3c29bf8eae6becc330e2546d461b23c1a86ac9207d015b5ea8ba26cbe210'
TEST_HASH = '94dc1b4c9a9a687e0023c041b579137615042577d3560476d1cbb88a606d473d'
BEFORE_HASH = 'd6d62ba5ddfba2befc2879767775528a9e4a28e092bf5d75c44d5eb96238ab57'
AFTER_HASH = '820fbad570c9f231f4c6ae6d2f14212fe6ad664460ddcc2049257549e4094f18'
OUT = Path('startup-receipts').resolve()
OUT.mkdir(exist_ok=False)
START = time.monotonic()
WORK_END = START + 1500
CLEAN_END = WORK_END + 180
LIMIT = 8 * 1024 * 1024
TOKEN = os.environ['GITHUB_RUN_ID'] + '-' + os.environ['GITHUB_RUN_ATTEMPT'] + '-' + uuid.uuid4().hex
LABEL = 'tetris.startup.owner'
NETWORK = 'startup-' + TOKEN
IMAGE = NETWORK + ':evidence'
records = []
resources = []
complete = True
cancelled = False
cleanup_mode = False
sequence = 0


def stop(_signum, _frame):
    global cancelled, complete
    cancelled = True
    complete = False


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)


def require(condition, message):
    if not condition:
        raise RuntimeError('INCOMPLETE: ' + message)


def persist():
    document = dict(collection_complete=complete, product_verdict='REVIEW_REQUIRED',
                    cancelled=cancelled, base=BASE, baseline=BASELINE,
                    candidate=CANDIDATE, test_sha256=TEST_HASH,
                    resource_intents=resources, commands=records,
                    daemon_settlement=('UNVERIFIED_IF_ANY_DOCKER_COMMAND_FORCED_OR_AMBIGUOUS'),
                    base_image_cache='Pinned public pull retained, not owned for deletion')
    temporary = OUT / 'receipt.tmp'
    temporary.write_text(json.dumps(document, indent=2) + '\n')
    temporary.replace(OUT / 'receipt.json')


def group_present(pgid):
    try:
        os.killpg(pgid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def run(label, args, seconds=20, allowed=(0,)):
    """Always records launch/read/wait/settlement failures, including EOF-live children."""
    global complete, sequence
    sequence += 1
    target = OUT / ('%02d-' % sequence + label + '.log')
    record = dict(label=label, argv=args, exit=None, forced=None,
                  group_absent=None, exception=None)
    proc = None
    selector = None
    begin = time.monotonic()
    ceiling = CLEAN_END if cleanup_mode else WORK_END
    deadline = min(begin + seconds, ceiling)
    size = 0
    try:
        require(cleanup_mode or not cancelled, 'cancelled before launch')
        require(begin < ceiling, 'overall deadline before launch')
        with target.open('wb') as log:
            proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    start_new_session=True)
            record['pgid'] = proc.pid
            selector = selectors.DefaultSelector()
            selector.register(proc.stdout, selectors.EVENT_READ)
            while selector.get_map() or proc.poll() is None:
                if (cancelled and not cleanup_mode) or time.monotonic() >= deadline:
                    record['forced'] = 'cancelled' if cancelled and not cleanup_mode else 'deadline'
                    break
                for key, _ in selector.select(0.1):
                    data = os.read(key.fd, 65536)
                    if not data:
                        selector.unregister(key.fileobj)
                    elif size + len(data) > LIMIT:
                        log.write(data[:max(0, LIMIT - size)])
                        size = LIMIT
                        record['forced'] = 'output-cap'
                        break
                    else:
                        log.write(data)
                        size += len(data)
                if record['forced']:
                    break
    except BaseException as error:
        record['exception'] = repr(error)
    finally:
        # Settlement is non-raising and bounded even under repeated signals.
        if proc is not None:
            try:
                if proc.poll() is None or group_present(proc.pid):
                    record['forced'] = record['forced'] or 'leftover-owned-group'
                    try:
                        os.killpg(proc.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                settle_end = min(time.monotonic() + 5, CLEAN_END)
                while time.monotonic() < settle_end:
                    proc.poll()
                    if proc.returncode is not None and not group_present(proc.pid):
                        break
                    time.sleep(0.05)
                record['exit'] = proc.poll()
                record['group_absent'] = not group_present(proc.pid)
            except BaseException as error:
                record['settlement_exception'] = repr(error)
            try:
                proc.stdout.close()
            except BaseException:
                pass
        if selector is not None:
            try:
                selector.close()
            except BaseException:
                pass
        record['seconds'] = round(time.monotonic() - begin, 3)
        record['bytes'] = target.stat().st_size if target.exists() else 0
        record['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest() if target.exists() else None
        good = (record['exit'] in allowed and record['group_absent'] is True
                and not record['forced'] and record['exception'] is None)
        if not good:
            complete = False
        records.append(record)
        persist()
    require(good, label)
    return target.read_text(errors='replace')


def git(label, *args):
    return run(label, ['git', *args], 20).strip()


def blob(ref, path):
    # These files are UTF-8 text. Preserve final newline from raw command log.
    run('blob-' + Path(path).name, ['git', 'show', ref + ':' + path], 20)
    return (OUT / ('%02d-' % sequence + 'blob-' + Path(path).name + '.log')).read_bytes()


def inspect(kind, name):
    # Listing is successful for absent objects; never infer absence from inspect failure.
    command = ['docker', kind, 'ls', '-a'] if kind == 'container' else ['docker', kind, 'ls']
    field = 'reference=' if kind == 'image' else 'name=^/' if kind == 'container' else 'name=^'
    suffix = '$' if kind != 'image' else ''
    ids = run('lookup-' + kind, command + ['--filter', field + name + suffix,
              '--format', '{{.ID}}']).split()
    if not ids:
        return None
    require(len(ids) == 1, 'ambiguous resource ' + name)
    result = json.loads(run('inspect-' + kind, ['docker', kind, 'inspect', ids[0]]))
    require(len(result) == 1, 'inspect count')
    return result[0]


def labels(kind, item):
    if kind == 'container' or kind == 'image':
        return item.get('Config', {}).get('Labels') or {}
    return item.get('Labels') or {}


def owned(kind, name):
    item = inspect(kind, name)
    require(item is None or labels(kind, item).get(LABEL) == TOKEN,
            'foreign ' + kind + ', refusing any deletion: ' + name)
    return item


def intent(kind, name):
    require(inspect(kind, name) is None, 'preexisting resource: ' + name)
    resources.append(dict(kind=kind, name=name))
    persist()


def container_checks(name, image_id, network_id, mounts):
    item = owned('container', name)
    require(item is not None and item['Image'] == image_id, 'container image')
    host = item['HostConfig']
    require(host['NanoCpus'] == 2000000000 and host['Memory'] == 2147483648,
            'CPU/memory runtime settings')
    require(host['PidsLimit'] == 256 and host['ShmSize'] == 1073741824 and host['Init'],
            'PID/shm/init runtime settings')
    require(not item['State']['Running'], 'container started before inspection')
    # Docker assigns endpoint NetworkID at start, not at create. Bind the
    # actual prestart network mode to the independently inspected owned ID.
    network = owned('network', NETWORK)
    require(network is not None and network['Id'] == network_id
            and network['Internal'] is True, 'actual owned internal network')
    require(host['NetworkMode'] == network_id
            and set(item['NetworkSettings']['Networks']) == {NETWORK},
            'actual prestart dedicated network configuration')
    actual = sorted((m['Source'], m['Destination'], m['RW']) for m in item['Mounts'])
    require(actual == sorted(mounts), 'actual mount identity/mode')


persist()
try:
    head = git('head', 'rev-parse', 'HEAD')
    require(git('evidence-parents', 'rev-list', '--parents', '-n', '1', head)
            == head + ' ' + CANDIDATE, 'evidence sole parent')
    require(git('baseline-parents', 'rev-list', '--parents', '-n', '1', BASELINE)
            == BASELINE + ' ' + BASE, 'baseline sole parent')
    require(git('candidate-parents', 'rev-list', '--parents', '-n', '1', CANDIDATE)
            == CANDIDATE + ' ' + BASELINE, 'candidate sole parent')
    for left, right, expected in [
        (BASE, BASELINE, 'e2e/startup-storage.spec.js'),
        (BASELINE, CANDIDATE, 'public/script.js'),
        (CANDIDATE, head, '.github/workflows/startup-control-evidence.yml\nscripts/startup-evidence/collect.py')
    ]:
        require(git('exact-paths', 'diff', '--name-only', left, right) == expected, 'exact delta paths')
    for ref, expected in [(BASELINE, BEFORE_HASH), (CANDIDATE, AFTER_HASH)]:
        require(hashlib.sha256(blob(ref, 'public/script.js')).hexdigest() == expected, 'source hash')
        require(hashlib.sha256(blob(ref, 'e2e/startup-storage.spec.js')).hexdigest() == TEST_HASH, 'test hash')
        require(blob(ref, 'e2e/game.spec.js') == blob(BASE, 'e2e/game.spec.js'), 'early test changed')
    # All external commands, including archive and extraction, use the same supervisor.
    archive = Path('baseline.tar').resolve()
    run('archive', ['git', 'archive', '--format=tar', '--output=' + str(archive), BASELINE])
    source = Path('baseline-source').resolve()
    source.mkdir()
    run('extract', ['tar', '-xf', str(archive), '-C', str(source)])
    corrected = OUT / 'candidate-script.js'
    corrected.write_bytes(blob(CANDIDATE, 'public/script.js'))
    # No daemon image build. Installation is owned by one labeled container.
    run('pull-pinned-node', ['docker', 'pull', NODE_IMAGE], 240)
    pinned_node = json.loads(run('pinned-node-inspect', ['docker', 'image', 'inspect', NODE_IMAGE]))
    require(len(pinned_node) == 1, 'pinned node image count')
    pinned_node_id = pinned_node[0]['Id']
    installer = NETWORK + '-install'
    intent('container', installer)
    run('installer-create', ['docker', 'create', '--name', installer, '--init',
        '--label', LABEL + '=' + TOKEN, '--workdir', '/work', NODE_IMAGE,
        '/bin/bash', '-lc', 'set -euo pipefail; npm install --global npm@12.2.0; npm ci; '
        'node -e "if (!/^26\\./.test(process.versions.node) || require(\'playwright/package.json\').version !== \'1.65.0\') process.exit(1)"; '
        'test "$(npm --version)" = 12.2.0; npx --no-install playwright install --with-deps webkit'])
    installer_item = owned('container', installer)
    require(installer_item is not None and not installer_item['State']['Running']
            and installer_item['Image'] == pinned_node_id and not installer_item['Mounts'],
            'installer image/state/mounts')
    run('copy-baseline', ['docker', 'cp', str(source) + '/.', installer + ':/work'])
    run('installer-native', ['docker', 'start', '-a', installer], 900)
    installer_item = owned('container', installer)
    require(not installer_item['State']['Running'] and not installer_item['State']['OOMKilled']
            and installer_item['State']['ExitCode'] == 0, 'installer native state')
    intent('image', IMAGE)
    run('commit-installed-image', ['docker', 'commit', '--change', 'LABEL ' + LABEL + '=' + TOKEN,
                                 installer, IMAGE], 60)
    image_item = owned('image', IMAGE)
    require(image_item is not None, 'committed image missing')
    image_id = image_item['Id']
    intent('network', NETWORK)
    run('network-create', ['docker', 'network', 'create', '--internal', '--label',
                          LABEL + '=' + TOKEN, NETWORK])
    network_item = owned('network', NETWORK)
    require(network_item is not None and network_item['Internal'] is True
            and not network_item['Containers'], 'actual internal empty network')
    network_id = network_item['Id']
    for arm in ['baseline', 'candidate']:
        name = NETWORK + '-' + arm
        arm_dir = OUT / arm
        arm_dir.mkdir()
        os.chmod(arm_dir, 0o777)
        intent('container', name)
        mounts = [(str(arm_dir), '/receipts', True)]
        args = ['docker', 'create', '--name', name, '--init', '--label', LABEL + '=' + TOKEN,
                '--network', network_id, '--cpus', '2', '--memory', '2g', '--pids-limit', '256',
                '--shm-size', '1g', '-v', str(arm_dir) + ':/receipts', '--workdir', '/work',
                '-e', 'CI=true', '-e', 'PLAYWRIGHT_JSON_OUTPUT_FILE=/receipts/result.json']
        if arm == 'candidate':
            mounts.append((str(corrected), '/work/public/script.js', False))
            args += ['-v', str(corrected) + ':/work/public/script.js:ro']
        args += [image_id, '/bin/bash', '-lc', 'set -euo pipefail; for i in {1..600}; do '
                 '[ -f /receipts/start-authorized ] && break; sleep 0.1; done; '
                 '[ -f /receipts/start-authorized ] || exit 72; '
                 'node --version; npm --version; '
                 'node -p "require(\'playwright/package.json\').version"; '
                 'exec npx --no-install playwright test e2e/startup-storage.spec.js '
                 '--project=iphone-14-pro-max-webkit --retries=0 --workers=1 '
                 '--repeat-each=1 --timeout=30000 --global-timeout=90000 --reporter=list,json']
        run(arm + '-create', args)
        container_checks(name, image_id, network_id, mounts)
        # Start only the bounded shell gate. No test/browser starts until the
        # actual running endpoint is verified against the owned network ID.
        run(arm + '-start-gated', ['docker', 'start', name])
        running = owned('container', name)
        require(running is not None and running['State']['Running']
                and running['NetworkSettings']['Networks'].get(NETWORK, {}).get('NetworkID') == network_id,
                'actual running dedicated endpoint')
        running_network = owned('network', NETWORK)
        require(running_network is not None and running_network['Id'] == network_id
                and running_network['Internal'] is True
                and running['Id'] in running_network['Containers'],
                'actual running owned network membership')
        (arm_dir / 'start-authorized').write_text('Endpoint verified before test start.\n')
        run(arm + '-native', ['docker', 'logs', '--follow', name], 120)
        native_exit = run(arm + '-native-exit', ['docker', 'wait', name]).strip()
        require(native_exit in ['0', '1'], 'native test exit not 0 or 1')
        item = owned('container', name)
        require(not item['State']['Running'] and not item['State']['OOMKilled']
                and item['State']['ExitCode'] == int(native_exit), 'arm native state')
        require((arm_dir / 'result.json').is_file(), 'native JSON missing')
except BaseException as error:
    complete = False
    (OUT / 'collector-error.txt').write_text(repr(error) + '\n')
finally:
    cleanup_mode = True
    # Resource names are intents, not proof. Reconcile actual label before every delete.
    for resource in reversed(resources):
        kind, name = resource['kind'], resource['name']
        try:
            item = owned(kind, name)
            if item is not None:
                if kind == 'container' and item['State']['Running']:
                    complete = False
                    run('owned-container-kill', ['docker', 'kill', item['Id']])
                run('remove-owned-' + kind, ['docker', kind, 'rm', item['Id']])
            require(inspect(kind, name) is None, 'post-cleanup absence')
        except BaseException as error:
            complete = False
            records.append(dict(cleanup_error=repr(error), kind=kind, name=name))
            persist()
    # Pulling a pinned public base can warm a shared daemon cache. Do not delete it.
    files = [p for p in OUT.rglob('*') if p.is_file()]
    if len(files) > 192 or sum(p.stat().st_size for p in files) > 32 * 1024 * 1024:
        complete = False
    persist()
sys.exit(0 if complete and not cancelled else 2)
