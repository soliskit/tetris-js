# Private authored proposal. Not run or syntax checked.
from pathlib import Path
import base64,hashlib,json,os,sys
root=Path(os.environ['OFFLINE_EVIDENCE'])
files=[];total=0;maximum=8*1024*1024;incomplete=[]
try:
 if not root.is_dir() or root.is_symlink():raise RuntimeError('missing/nonregular evidence directory')
 for p in sorted(root.rglob('*')):
  relative=p.relative_to(root)
  if any(part.startswith('profile-') for part in relative.parts):continue
  if p.suffix not in ('.json','.png','.txt'):continue
  if p.is_symlink() or not p.is_file():raise RuntimeError('nonregular evidence')
  if len(str(relative))>200 or not all(c.isalnum() or c in '._-/' for c in str(relative)):raise RuntimeError('unsafe evidence name')
  # Preserve native startup/import stderr and stdout even when no result JSON
  # was produced. Bound retained text; retain full actual length/hash metadata.
  actual=hashlib.sha256();actual_length=0
  with p.open('rb') as stream:
   while True:
    chunk=stream.read(65536)
    if not chunk:break
    actual.update(chunk);actual_length+=len(chunk)
  cap=65536 if p.suffix=='.txt' else maximum
  with p.open('rb') as stream:data=stream.read(cap+1)
  truncated=len(data)>cap
  if truncated:data=data[:cap];incomplete.append(str(relative)+': truncated')
  total+=len(data)
  if total>maximum:raise RuntimeError('evidence exceeds8MiB log envelope cap')
  files.append((str(relative),data,actual_length,actual.hexdigest(),truncated))
 if 'planned.json' not in [name for name,*_ in files]:incomplete.append('missing planned slots')
 manifest=[{'name':name,'length':len(data),'sha256':hashlib.sha256(data).hexdigest(),'chunks':(len(data)+2249)//2250,'originalLength':original_length,'originalSha256':original_hash,'truncated':truncated} for name,data,original_length,original_hash,truncated in files]
 identity={k:os.environ[k] for k in ['OFFLINE_ENGINE','OFFLINE_HEAD','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT']}
 print('OFFLINE_EVIDENCE_BEGIN '+json.dumps({'identity':identity,'files':manifest,'incomplete':incomplete},sort_keys=True),flush=True)
 for name,data,*_ in files:
  for offset in range(0,len(data),2250):
   print('OFFLINE_EVIDENCE_CHUNK '+json.dumps({'name':name,'index':offset//2250,'base64':base64.b64encode(data[offset:offset+2250]).decode()},sort_keys=True),flush=True)
 print('OFFLINE_EVIDENCE_END '+json.dumps(identity,sort_keys=True),flush=True)
 if incomplete:sys.exit(1)
except BaseException as error:
 print('OFFLINE_EVIDENCE_INCOMPLETE '+type(error).__name__+': '+str(error),file=sys.stderr)
 sys.exit(1)
