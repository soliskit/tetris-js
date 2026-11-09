# Private proposed source. Not executed or syntax checked.
from pathlib import Path
import hashlib,json,os,re,subprocess
root=Path(__file__).resolve().parent
source='3eb3a47ea60077c3fe618800355d50926fd69eba';base='989b015f54fdeb85bf14ad5ea769e15921ca469d';branch='offline-chromium-evidence-v2'
event=json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
head=os.environ['GITHUB_SHA'];inputs=event['inputs']
if os.environ.get('GITHUB_RUN_ATTEMPT')!='1':raise RuntimeError('rerun attempt forbidden')
if os.environ['GITHUB_EVENT_NAME']!='workflow_dispatch' or os.environ['GITHUB_REPOSITORY']!='soliskit/tetris-js' or os.environ['GITHUB_REF']!='refs/heads/'+branch or event['ref']!=branch:raise RuntimeError('wrong event/repository/ref')
if event['repository']['full_name']!='soliskit/tetris-js' or not re.fullmatch('[0-9a-f]{40}',head) or inputs!={'expected-head':head,'expected-source-head':source,'expected-frozen-base':base}:raise RuntimeError('input identity drift')
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
if git('rev-parse','HEAD')!=head or git('rev-parse','HEAD^')!=source:raise RuntimeError('checkout/parent drift')
if git('rev-list','--parents','-n','1','HEAD').split()!=[head,source]:raise RuntimeError('not one single-parent proposal commit')
allowed=['.github/offline-qualification/emit-evidence.py','.github/offline-qualification/inventory.json','.github/offline-qualification/verify-inputs.py','.github/workflows/offline-qualification.yml']
if sorted(git('diff','--name-only',source,head).splitlines())!=allowed:raise RuntimeError('unexpected changed path')
if git('status','--porcelain'):raise RuntimeError('unclean checkout')
inventory=json.loads((root/'inventory.json').read_text())
for name,digest in inventory.items():
 p=root/name
 if p.is_symlink() or not p.is_file() or not p.resolve().is_relative_to(root):raise RuntimeError('nonregular input')
 if hashlib.sha256(p.read_bytes()).hexdigest()!=digest:raise RuntimeError('input hash mismatch: '+name)
print(json.dumps({'head':head,'source':source,'frozenBase':base,'engine':'chromium','inventory':inventory},sort_keys=True))
