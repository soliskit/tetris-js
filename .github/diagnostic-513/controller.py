# SOURCE-ONLY proposed GitHub-hosted one-attempt diagnostic controller.
# This file is not permission to install, test, publish or dispatch anything.
import base64,hashlib,json,os,signal,subprocess,sys,time,shutil,stat
from pathlib import Path
ROOT=Path.cwd();OUT=ROOT/'.diagnostic-owned';START=time.monotonic();END=START+720
RESERVE=30;WORK_END=END-RESERVE;TRANSPORT_LIMIT=20*1024*1024;TRANSPORT_FILES=32;MANIFEST_LIMIT=16*1024;ENCODED_LIMIT=32*1024*1024
STREAM_LIMIT=2*1024*1024;OVERALL_LIMIT=16*1024*1024
STICKY=[];STAGES=[];ERRORS=[]
TITLE='board CSS grow cancels a drag until matching pointerup [INP-5]'
PROJECT='iphone-14-pro-max-webkit';SPEC='e2e/drag-resize.spec.js'
BASE='4f081e149beb02ab67c14c88e80eb56a7005adb1'
NODE=Path(shutil.which('node') or '/nonexistent').resolve()
NODE_SHA256='0adde40d1b7dfa57c8bc83cbc319758c3ec6ebba21363bb2fa752ea6b267ad1b'
GREP=r'board CSS grow cancels a drag until matching pointerup \[INP-5\]$'
def caught(sig,frame):STICKY.append({'signal':sig,'at':time.time()})
for sig in (signal.SIGTERM,signal.SIGINT,signal.SIGHUP):signal.signal(sig,caught)
def need(v,m):
 if not v:raise RuntimeError(m)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def alive_guard():need(not STICKY and time.monotonic()<WORK_END,'sticky stop or launch/finalqualification deadline')
def npm_census():
 root=OUT/'npm-tool';need(root.is_dir() and not root.is_symlink(),'npm root type');rows=[]
 for p in sorted(root.rglob('*')):
  mode=p.lstat();rel=str(p.relative_to(root))
  if stat.S_ISDIR(mode.st_mode):rows.append({'path':rel,'kind':'directory','mode':stat.S_IMODE(mode.st_mode)})
  elif stat.S_ISREG(mode.st_mode):rows.append({'path':rel,'kind':'file','mode':stat.S_IMODE(mode.st_mode),'bytes':mode.st_size,'sha256':sha(p)})
  else:raise RuntimeError('npm special/symlink input rejected')
 rows.sort(key=lambda x:x['path']);expected=json.loads((ROOT/'.github/diagnostic-513/npm-typed-census.json').read_text());need(rows==expected,'typed npm executable inputs drift')
def tool_guard():
 need(NODE.is_file() and sha(NODE)==NODE_SHA256,'exact Node executable drift')
 if (OUT/'npm-tool').exists():npm_census()
 manifest=json.loads((ROOT/'.github/diagnostic-513/manifest.json').read_text())
 for path,h in manifest['files'].items():need(sha(ROOT/path)==h,'source input drift')
def census(sid):
 rows=[]
 for p in Path('/proc').iterdir():
  if not p.name.isdigit():continue
  try:
   fields=(p/'stat').read_text().rsplit(')',1)[1].split()
   if int(fields[3])==sid:rows.append({'pid':int(p.name),'state':fields[0],'pgid':int(fields[2]),'start':fields[19]})
  except (FileNotFoundError,ProcessLookupError):pass
 return rows

def stage(label,args,seconds,extra=None,allow_native_failure=False):
 alive_guard();r={'label':label,'argv':args,'start':time.time(),'disqualifiers':[],'signals':[]};STAGES.append(r)
 tool_guard();env={'PATH':str(NODE.parent)+':/usr/bin:/bin','LANG':'C.UTF-8','LC_ALL':'C.UTF-8','CI':'true','npm_config_ignore_scripts':'true','npm_config_audit':'false','npm_config_fund':'false','npm_config_cache':str(OUT/'npm-cache'),'PLAYWRIGHT_BROWSERS_PATH':str(OUT/'browsers'),'HOME':str(OUT/'home'),'GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','GIT_TERMINAL_PROMPT':'0','npm_config_registry':'https://registry.npmjs.org/','npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null'}
 if extra:env.update(extra)
 child=None;files=[];leaderStart=None;native=None;deadline=min(time.monotonic()+seconds,END-RESERVE)
 def observed_exit():
  z=os.waitid(os.P_PID,child.pid,os.WEXITED|os.WNOHANG|os.WNOWAIT)
  return None if z is None else (z.si_status if z.si_code==os.CLD_EXITED else -z.si_status)
 def output_check():
  total=0
  for previous in STAGES:
   for kind in ('stdout','stderr'):
    p=OUT/(previous['label']+'.'+kind)
    if p.exists():
     size=p.stat().st_size;total+=size
     if size>STREAM_LIMIT:r['disqualifiers'].append('stream-ceiling-exceeded-no-truncation')
  if total>OVERALL_LIMIT:r['disqualifiers'].append('overall-ceiling-exceeded-no-truncation')
 def cleanup():
  nonlocal native
  # Original leader retained with WNOWAIT while identity-checked signals finish.
  for sig,window in ((signal.SIGTERM,5),(signal.SIGKILL,5)):
   members=census(child.pid);leaders=[x for x in members if x['pid']==child.pid]
   need(len(leaders)==1 and leaders[0]['start']==leaderStart,'owned leader identity unavailable')
   for pgid in {x['pgid'] for x in members if x['state']!='Z'}:
    try:os.killpg(pgid,sig);r['signals'].append({'pgid':pgid,'signal':int(sig),'at':time.time()})
    except ProcessLookupError:pass
   until=time.monotonic()+window
   while time.monotonic()<until:
    native=observed_exit()
    if native is not None and not [x for x in census(child.pid) if x['pid']!=child.pid and x['state']!='Z']:return
    time.sleep(.02)
  need(native is not None,'native exit unknown after cleanup')
 try:
  files=[(OUT/(label+'.'+kind)).open('xb') for kind in ('stdout','stderr')]
  # Final cooperative command-launch edge after environment and output setup.
  tool_guard();alive_guard();need(time.monotonic()<deadline,'stage launch deadline')
  child=subprocess.Popen(args,cwd=ROOT,env=env,stdout=files[0],stderr=files[1],start_new_session=True)
  r['leader']=child.pid;members=census(child.pid);leaders=[x for x in members if x['pid']==child.pid];need(len(leaders)==1,'leader bind');leaderStart=leaders[0]['start'];r['leaderStart']=leaderStart
  while True:
   output_check()
   if STICKY:r['disqualifiers'].append('sticky-interrupt')
   if time.monotonic()>=deadline:r['disqualifiers'].append('stage-deadline')
   native=observed_exit()
   if native is not None or r['disqualifiers']:break
   time.sleep(.02)
  descendants=[x for x in census(child.pid) if x['pid']!=child.pid]
  if native is None or descendants:
   r['disqualifiers'].append('forced-or-descendant-cleanup');cleanup()
  native=observed_exit();need(native is not None,'native result absent')
  r['nativeExit']=child.wait(timeout=1);r['leaderReaped']=True;need(r['nativeExit']==native,'native wait mismatch')
  r['remainingSession']=census(child.pid);need(not r['remainingSession'],'session not absent')
 except BaseException as e:
  r['disqualifiers'].append('supervision-error');r['error']=type(e).__name__+': '+str(e)
 finally:
  if child is not None and not r.get('leaderReaped'):
   r['disqualifiers'].append('emergency-cleanup')
   try:
    cleanup();r['nativeExit']=child.wait(timeout=1);r['leaderReaped']=True;r['remainingSession']=census(child.pid)
   except BaseException as e:r['cleanupError']=type(e).__name__;r['remainingSession']='UNKNOWN'
  for f in files:f.close()
  output_check();r['end']=time.time();r['files']={kind:{'bytes':(OUT/(label+'.'+kind)).stat().st_size,'sha256':sha(OUT/(label+'.'+kind))} for kind in ('stdout','stderr') if (OUT/(label+'.'+kind)).exists()}
  if STICKY:r['disqualifiers'].append('late-sticky')
  if time.monotonic()>=deadline:r['disqualifiers'].append('late-stage-settlement')
 need(not r['disqualifiers'] and r.get('leaderReaped') and r.get('remainingSession')==[],'stage unqualified: '+label)
 need(r['nativeExit']==0 or allow_native_failure,'native failure: '+label)
 return r

def specs(doc):
 found=[]
 def visit(suite):
  found.extend(suite.get('specs',[]))
  for child in suite.get('suites',[]):visit(child)
 for suite in doc['suites']:visit(suite)
 return found

def selected_identity(doc):
 found=specs(doc);need(len(found)==1,'not one native selected spec');spec=found[0]
 need(spec['title']==TITLE and Path(spec['file']).resolve()==ROOT/SPEC,'selected spec identity mismatch')
 need(len(spec['tests'])==1 and spec['tests'][0]['projectName']==PROJECT,'selected project mismatch');return spec['tests'][0]

def main():
 need(not OUT.exists(),'preexisting attempt directory');OUT.mkdir(mode=0o700);(OUT/'home').mkdir();status='INCOMPLETE'
 try:
  need(os.environ.get('GITHUB_ACTIONS')=='true' and os.environ['GITHUB_REPOSITORY']=='soliskit/tetris-js','GitHub-only route')
  need(os.environ['GITHUB_SHA']==os.environ['DIAGNOSTIC_EXPECTED_SHA'],'dispatch SHA drift');need(os.environ['GITHUB_REF']==os.environ['DIAGNOSTIC_EXPECTED_REF'] and os.environ['GITHUB_REF'].startswith('refs/heads/diagnostic/513-'),'isolated nonmain ref')
  # Source identities are bound to approved publication; no source repair occurs.
  stage('01-source',['/usr/bin/git','show','-s','--format=%H%n%P%n%T','HEAD'],20)
  source=(OUT/'01-source.stdout').read_text().splitlines();need(source[0]==os.environ['GITHUB_SHA'] and source[1]==BASE,'not exactly one diagnostic commit on approved base')
  stage('01b-source-diff',['/usr/bin/git','diff','--name-only',BASE,'HEAD'],20)
  need(set((OUT/'01b-source-diff.stdout').read_text().splitlines())=={'.github/workflows/pages.yml','.github/diagnostic-513/controller.py','.github/diagnostic-513/manifest.json','.github/diagnostic-513/bootstrap-npm.py','.github/diagnostic-513/npm-typed-census.json','e2e/drag-resize.spec.js','e2e/resize-setup-witness.js'},'diagnostic source scope drift')
  manifest=json.loads((ROOT/'.github/diagnostic-513/manifest.json').read_text())
  for path,h in manifest['files'].items():need(sha(ROOT/path)==h,'published source hash drift: '+path)
  stage('02-tool-version',[str(NODE),'--version'],10);need((OUT/'02-tool-version.stdout').read_text().strip()=='v26.13.0','Node version drift')
  stage('03-owned-npm',['/usr/bin/python3','-I','.github/diagnostic-513/bootstrap-npm.py'],90);npm_census()
  npm=[str(NODE),str(OUT/'npm-tool/bin/npm-cli.js')]
  stage('04-npm-version',npm+['--version'],10);need((OUT/'04-npm-version.stdout').read_text().strip()=='12.2.0','npm version drift')
  stage('05-ci',npm+['ci','--ignore-scripts','--no-audit','--no-fund'],180)
  stage('06-tool-package',[str(NODE),'-e',"const fs=require('fs');const v=require('playwright/package.json').version;console.log(JSON.stringify({node:process.version,playwright:v}));process.exit(v==='1.65.0'?0:1)"],10)
  stage('07-lint',[str(NODE),'node_modules/eslint/bin/eslint.js',SPEC,'e2e/resize-setup-witness.js'],30)
  stage('08-format',[str(NODE),'node_modules/prettier/bin/prettier.cjs','--check',SPEC,'e2e/resize-setup-witness.js'],30)
  cli=[str(NODE),'node_modules/@playwright/test/cli.js','test',SPEC,'--project='+PROJECT,'--grep='+GREP,'--workers=1','--retries=0','--repeat-each=1']
  stage('09-list',cli+['--list','--reporter=json'],30);selected_identity(json.loads((OUT/'09-list.stdout').read_text()))
  stage('10-webkit-install',[str(NODE),'node_modules/playwright/cli.js','install','webkit'],180)
  result=stage('11-target',cli+['--reporter=list,json'],120,{'PLAYWRIGHT_JSON_OUTPUT_FILE':str(OUT/'target-results.json')},True)
  need((OUT/'target-results.json').stat().st_size<=STREAM_LIMIT,'JSON report ceiling')
  test=selected_identity(json.loads((OUT/'target-results.json').read_text()));need(len(test['results'])==1 and test['results'][0]['retry']==0,'repeat/retry/result drift')
  native=test['results'][0]['status'];need(native in ('passed','failed','timedOut'),'unexpected native status')
  need((result['nativeExit']==0)==(native=='passed'),'native JSON/exit disagreement')
  stdout=(OUT/'11-target.stdout').read_text();markers=[x.split('DRAG-RESIZE-OBSERVER-WITNESS ',1)[1] for x in stdout.splitlines() if 'DRAG-RESIZE-OBSERVER-WITNESS ' in x]
  need(len(markers)==1,'missing/duplicate witness marker');w=json.loads(markers[0]);need(w['project']==PROJECT and w['title']==TITLE and w['witness'] is not None,'witness identity')
  need(w['witness']['dropped']==0 and w['witness']['captureFailed'] is False,'witness incomplete')
  (OUT/'diagnostic-outcome.json').write_text(json.dumps({'nativeExit':result['nativeExit'],'nativeStatus':native,'witnessComplete':True,'instrumentedPassIsNotOriginalQualification':True,'causalInterpretation':'UNRESOLVED_SOURCE_REVIEW_REQUIRED'},indent=2)+'\n')
  status='INSTRUMENTED_PASS_NOT_QUALIFICATION' if native=='passed' else 'NATIVE_TEST_FAILED_WITNESS_RETAINED'
 except BaseException as e:ERRORS.append(type(e).__name__+': '+str(e))
 finally:
  if STICKY or time.monotonic()>=WORK_END or ERRORS:status='INCOMPLETE'
  receipt={'status':status,'sourceSHA':os.environ.get('GITHUB_SHA'),'sourceRef':os.environ.get('GITHUB_REF'),'stages':STAGES,'errors':ERRORS,'sticky':STICKY,'elapsed':time.monotonic()-START,'limits':'720sec cooperative/30reserve/2MiB per stdout/stderr +16MiB overall after observation; no truncation/hard quota; npm/browser scratch/node_modules/reports uncapped; escaped sessions/host loss not proven absent'}
  (OUT/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
  # Bounded native-log transport. Positive earlier receipt is provisional until
  # terminal closure AND live exit/native job checks. Any late flag invalidates.
  try:
   alive_guard();files=sorted(p for p in OUT.iterdir() if p.is_file());need(len(files)<=TRANSPORT_FILES,'transport file count');transport=[];total=0
   for p in files:
    alive_guard();size=p.stat().st_size;need(size<=4*1024*1024,'transport file ceiling');total+=size;need(total<=TRANSPORT_LIMIT,'transport aggregate ceiling')
    raw=p.read_bytes();need(len(raw)==size,'transport file changed');transport.append({'name':p.name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'chunks':(len(raw)+3071)//3072})
   manifest=json.dumps({'sourceSHA':os.environ.get('GITHUB_SHA'),'receiptSHA256':sha(OUT/'receipt.json'),'files':transport},separators=(',',':')).encode();need(len(manifest)<=MANIFEST_LIMIT,'manifest ceiling');alive_guard()
   encoded=0
   def emit(line):
    nonlocal encoded
    alive_guard();encoded+=len(line.encode())+1;need(encoded<=ENCODED_LIMIT,'native transport ceiling');print(line,flush=True);alive_guard()
   emit('DIAG513-BEGIN '+base64.b64encode(manifest).decode())
   for entry in transport:
    alive_guard();raw=(OUT/entry['name']).read_bytes();need(hashlib.sha256(raw).hexdigest()==entry['sha256'],'transport source changed')
    for index in range(entry['chunks']):emit('DIAG513-CHUNK '+entry['name']+' '+str(index)+' '+base64.b64encode(raw[index*3072:(index+1)*3072]).decode())
   alive_guard();emit('DIAG513-END '+hashlib.sha256(manifest).hexdigest());alive_guard()
  except BaseException as e:
   status='INCOMPLETE';receipt['status']=status;receipt['transportError']=type(e).__name__+': '+str(e)
   try:(OUT/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
   except BaseException:pass
   print('DIAG513-INVALIDATED transport-or-late-closeout',flush=True)
  if STICKY or time.monotonic()>=WORK_END:
   status='INCOMPLETE';print('DIAG513-INVALIDATED final-live-boundary',flush=True)
 return 0 if status=='INSTRUMENTED_PASS_NOT_QUALIFICATION' else 1
if __name__=='__main__':
 result=main()
 if STICKY or time.monotonic()>=WORK_END:
  print('DIAG513-INVALIDATED pre-native-exit',flush=True);result=1
 sys.exit(result)
