# Private proposed source. Not executed or syntax checked.
from pathlib import Path
import hashlib,json,os,re,subprocess
root=Path(__file__).resolve().parent
source='3eb3a47ea60077c3fe618800355d50926fd69eba';base='989b015f54fdeb85bf14ad5ea769e15921ca469d';branch='offline-chromium-evidence-v2';parent='9fca80ecc1968f9a797d8c819ec4ac6bd50aebde';evidence_parent='5be32f4fe11af0508c5d1f6e4da56d17b717e412'
event=json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
head=os.environ['GITHUB_SHA'];inputs=event['inputs']
if os.environ.get('GITHUB_RUN_ATTEMPT')!='1':raise RuntimeError('rerun attempt forbidden')
# Emit only public identity comparison names and match results, never payload values.
checks=[('event-name',os.environ['GITHUB_EVENT_NAME']=='workflow_dispatch'),('environment-repository',os.environ['GITHUB_REPOSITORY']=='soliskit/tetris-js'),('environment-ref',os.environ['GITHUB_REF']=='refs/heads/'+branch),('payload-ref-full-branch',event['ref']=='refs/heads/'+branch and event['ref']==os.environ['GITHUB_REF'])]
print(json.dumps({'dispatchIdentityMatches':dict(checks)},sort_keys=True),flush=True)
for label,matched in checks:
 if not matched:raise RuntimeError('dispatch identity mismatch: '+label)
if event['repository']['full_name']!='soliskit/tetris-js' or not re.fullmatch('[0-9a-f]{40}',head) or inputs!={'expected-head':head,'expected-source-head':source,'expected-frozen-base':base}:raise RuntimeError('input identity drift')
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
if git('rev-parse','HEAD')!=head or git('rev-parse','HEAD^')!=parent:raise RuntimeError('checkout/parent drift')
if git('rev-list','--parents','-n','1','HEAD').split()!=[head,parent]:raise RuntimeError('not one single-parent proposal commit')
allowed=['.github/offline-qualification/emit-evidence.py','.github/offline-qualification/inventory.json','.github/offline-qualification/verify-inputs.py','.github/workflows/offline-qualification.yml']
if sorted(git('diff','--name-only',parent,head).splitlines())!=['.github/offline-qualification/verify-inputs.py','.github/workflows/offline-qualification.yml']:raise RuntimeError('unexpected diagnostic delta')
if git('rev-parse',parent+'^')!=evidence_parent or git('rev-parse',evidence_parent+'^')!=source:raise RuntimeError('frozen source ancestry drift')
if sorted(git('diff','--name-only',source,head).splitlines())!=allowed:raise RuntimeError('unexpected changed path')
if git('status','--porcelain'):raise RuntimeError('unclean checkout')
inventory=json.loads((root/'inventory.json').read_text())
for name,digest in inventory.items():
 p=root/name
 if p.is_symlink() or not p.is_file() or not p.resolve().is_relative_to(root):raise RuntimeError('nonregular input')
 if hashlib.sha256(p.read_bytes()).hexdigest()!=digest:raise RuntimeError('input hash mismatch: '+name)
print(json.dumps({'head':head,'source':source,'frozenBase':base,'engine':'chromium','inventory':inventory},sort_keys=True))
