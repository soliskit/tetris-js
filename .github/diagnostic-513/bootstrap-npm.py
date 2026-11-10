# SOURCE-ONLY proposed runner bootstrap, never run during preparation.
import base64,hashlib,io,json,os,stat,tarfile,urllib.request
from pathlib import Path,PurePosixPath
os.umask(0o022)
ROOT=Path.cwd();OUT=ROOT/'.diagnostic-owned';DEST=OUT/'npm-tool'
URL='https://registry.npmjs.org/npm/-/npm-12.2.0.tgz'
SRI='ZsJjKpTnlmSXOLLXiU1xDCzC4Wlok4IwZmh/aw2KUuXytU7q6qMv/cUT7MoeSf95Slwuw/lRXYefGzGCspHPNQ=='
with urllib.request.urlopen(URL,timeout=45) as response:
 if response.url!=URL:raise RuntimeError('npm download redirect')
 raw=response.read(16*1024*1024+1)
if len(raw)>16*1024*1024 or base64.b64encode(hashlib.sha512(raw).digest()).decode()!=SRI:raise RuntimeError('npm tarball integrity')
if DEST.exists():raise RuntimeError('fresh npm tree required')
DEST.mkdir(mode=0o755)
with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as archive:
 for member in archive.getmembers():
  path=PurePosixPath(member.name)
  if path.parts[0]!='package' or '..' in path.parts or path.is_absolute() or not member.isfile():raise RuntimeError('unapproved npm member kind/path')
  dest=DEST.joinpath(*path.parts[1:]);dest.parent.mkdir(parents=True,exist_ok=True,mode=0o755)
  with dest.open('xb') as target:target.write(archive.extractfile(member).read())
  os.chmod(dest,member.mode)
print(json.dumps({'url':URL,'bytes':len(raw),'sha512':base64.b64encode(hashlib.sha512(raw).digest()).decode(),'npmTree':'typed census must verify before use'}))
