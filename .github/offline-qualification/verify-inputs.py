# Private authored proposal. Not run or syntax checked.
from pathlib import Path
import hashlib,json,os,subprocess
root=Path(__file__).resolve().parent
inventory=json.loads((root/'inventory.json').read_text())
for name,digest in inventory.items():
 p=root/name
 if p.is_symlink() or not p.is_file() or not p.resolve().is_relative_to(root):
  raise RuntimeError('nonregular input: '+name)
 if hashlib.sha256(p.read_bytes()).hexdigest()!=digest:raise RuntimeError('input mismatch: '+name)
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
event=json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
if head!=event['pull_request']['head']['sha']:raise RuntimeError('checkout head mismatch')
if event['pull_request']['base']['sha']!='989b015f54fdeb85bf14ad5ea769e15921ca469d':
 raise RuntimeError('base drift: fresh proposal/review needed')
print(json.dumps({'head':head,'base':event['pull_request']['base']['sha'],'inventory':inventory},sort_keys=True))
