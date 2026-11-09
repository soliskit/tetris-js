# Private authored browser supervision proposal. Not executed or syntax checked.
import os,sys,json,time,signal,subprocess,pathlib,ctypes,platform,hashlib,secrets
ROOT=pathlib.Path(__file__).resolve().parent
EVER_INTERRUPTED=False
LAST_SIGNAL=None
def interrupted(number,frame):
 global EVER_INTERRUPTED,LAST_SIGNAL
 EVER_INTERRUPTED=True;LAST_SIGNAL=number
def group_exists(group):
 try: os.killpg(group,0); return True
 except ProcessLookupError: return False

def exited_unreaped(process):
 # Observation only. The direct child remains waitable and holds its PID/PGID.
 return os.waitid(os.P_PID,process.pid,os.WEXITED|os.WNOHANG|os.WNOWAIT) is not None

def enable_subreaper():
 # Linux-only explicit prelaunch guard. Fail closed before any subprocess.
 if platform.system() != 'Linux' or not pathlib.Path('/proc/self/stat').is_file(): raise RuntimeError('subreaper requires Linux /proc')
 libc=ctypes.CDLL(None,use_errno=True)
 value=ctypes.c_int(0)
 if libc.prctl(37,ctypes.byref(value),0,0,0)!=0:
  raise OSError(ctypes.get_errno(),'PR_GET_CHILD_SUBREAPER')
 before=value.value
 if libc.prctl(36,1,0,0,0)!=0:
  raise OSError(ctypes.get_errno(),'PR_SET_CHILD_SUBREAPER')
 if libc.prctl(37,ctypes.byref(value),0,0,0)!=0 or value.value!=1:
  raise RuntimeError('subreaper verification failed')
 return {'before':before,'verified':value.value,'scope':'this supervisor process only'}

def group_members(group):
 members=[]
 for entry in pathlib.Path('/proc').iterdir():
  if not entry.name.isdigit(): continue
  try:
   text=(entry/'stat').read_text(); fields=text[text.rfind(')')+2:].split()
   if int(fields[2])==group:
    members.append({'pid':int(entry.name),'state':fields[0],
      'ppid':int(fields[1]),'group':int(fields[2]),'startTime':fields[19]})
  except (FileNotFoundError,ProcessLookupError): continue
 return members

def live_group_members(group):
 return [m['pid'] for m in group_members(group) if m['state'] not in ('Z','X')]

def reap_adopted(group, records):
 # Only already-terminated adopted children. Never reap the retained leader.
 # A waitable child cannot have its PID reused until this supervisor reaps it.
 for member in group_members(group):
  pid=member['pid']
  if pid==group or member['ppid']!=os.getpid() or member['state'] not in ('Z','X'): continue
  observed=os.waitid(os.P_PID,pid,os.WEXITED|os.WNOHANG|os.WNOWAIT)
  if observed is None: continue
  current=next((m for m in group_members(group) if m['pid']==pid),None)
  if current is None or any(current[k]!=member[k] for k in ('pid','ppid','group','startTime')):
   raise RuntimeError('adopted child identity changed')
  reaped,status=os.waitpid(pid,os.WNOHANG)
  if reaped!=pid: raise RuntimeError('adopted child was not reaped')
  records.append({**member,'waitStatus':status})

def settle_scanned(process):
 # Retain the direct leader until all group signals/reaping windows finish.
 result={'group':process.pid,'term':False,'kill':False,'adoptedReaped':[]}
 for sig,seconds,label in [(signal.SIGTERM,5,'term'),(signal.SIGKILL,5,'kill')]:
  reap_adopted(process.pid,result['adoptedReaped'])
  if not live_group_members(process.pid): break
  try: os.killpg(process.pid,sig); result[label]=True
  except ProcessLookupError: pass
  deadline=time.monotonic()+seconds
  while time.monotonic()<deadline:
   reap_adopted(process.pid,result['adoptedReaped'])
   if not live_group_members(process.pid): break
   time.sleep(.05)
 # Give adoption/reaping a separate bounded window while leader still retained.
 deadline=time.monotonic()+5
 while True:
  reap_adopted(process.pid,result['adoptedReaped'])
  others=[m for m in group_members(process.pid) if m['pid']!=process.pid]
  if not others or time.monotonic()>=deadline: break
  time.sleep(.05)
 remaining=group_members(process.pid)
 result['remainingBeforeLeaderReap']=[m for m in remaining if m['pid']!=process.pid]
 result['remainingLiveMembers']=[m['pid'] for m in remaining if m['state'] not in ('Z','X')]
 if result['remainingBeforeLeaderReap'] or result['remainingLiveMembers']:
  result['groupAbsent']=False; result['leaderRetained']=True
  return result
 # All signaling is over. Reap direct leader; never signal the numeric group again.
 process.wait(timeout=2)
 result['groupAbsent']=not group_exists(process.pid)
 result['leaderRetained']=False
 return result

def settle(process):
 try:
  return settle_scanned(process)
 except BaseException as error:
  record={'group':process.pid,'groupAbsent':False,'cleanupError':type(error).__name__+': '+str(error)}
  # Never signal a numeric group after its direct leader was reaped.
  if process.returncode is None:
   try: os.killpg(process.pid,signal.SIGKILL); record['emergencyKill']=True
   except ProcessLookupError: pass
   except BaseException as kill_error: record['killError']=str(kill_error)
   # Keep observing/reaping for a bounded5s despite a scanner/reaper exception.
   deadline=time.monotonic()+5; adopted=[]
   while time.monotonic()<deadline:
    try:
     reap_adopted(process.pid,adopted)
     if not [m for m in group_members(process.pid) if m['pid']!=process.pid] and exited_unreaped(process):
      process.wait(timeout=1); record['emergencyLeaderReaped']=True; break
    except BaseException as cleanup_error: record['secondaryCleanupError']=str(cleanup_error)
    time.sleep(.05)
   record['adoptedReaped']=adopted
   record['leaderRetained']=process.returncode is None
  return record

def save(file,data):file.write_text(json.dumps(data,indent=2)+'\n')
def main():
 evidence=pathlib.Path(os.environ['OFFLINE_EVIDENCE'])
 engine=os.environ.get('OFFLINE_ENGINE')
 cases=['install-offline-reload','persistent-offline-relaunch','legacy-takeover','foreign-cache-preservation','corrupt-install-rejected'] if engine=='chromium' else ['document-game-smoke']
 slots=[{'number':i,'prefix':prefix,'name':name,'state':'not-run','errors':[]} for i,(prefix,name) in enumerate((p,n) for p in ['/','/nested/app/'] for n in cases)]
 failures=[];retention=[];nonce=secrets.token_hex(32)
 def persist():
  try:save(evidence/'supervisor.json',{'nonce':nonce,'engine':engine,'head':os.environ.get('OFFLINE_HEAD'),'slots':slots,'failures':failures,'retentionErrors':retention,'interrupted':EVER_INTERRUPTED})
  except BaseException as error:retention.append(str(error))
 try:
  if evidence.is_symlink():raise RuntimeError('nonregular evidence directory')
  evidence.mkdir(parents=False,exist_ok=True)
  persist()
  if engine not in ['chromium','webkit']:raise RuntimeError('engine')
  for sig in [signal.SIGINT,signal.SIGTERM,signal.SIGHUP]:signal.signal(sig,interrupted)
  enable_subreaper()
  total_deadline=time.monotonic()+660
  for slot in slots:
   if EVER_INTERRUPTED or time.monotonic()>=total_deadline:raise RuntimeError('outer deadline/interruption')
   directory=evidence/('slot-'+str(slot['number']));directory.mkdir()
   env=dict(os.environ,OFFLINE_SLOT_INDEX=str(slot['number']),OFFLINE_EVIDENCE=str(directory))
   process=None;slot['state']='running'
   try:
    with (directory/'stdout.txt').open('xb') as out,(directory/'stderr.txt').open('xb') as err:
     process=subprocess.Popen(['node',str(ROOT/'qualify.mjs')],env=env,stdout=out,stderr=err,start_new_session=True)
     deadline=min(total_deadline,time.monotonic()+60);phase_name=None;close_deadline=None
     while True:
      now=time.monotonic()
      if EVER_INTERRUPTED or now>=deadline:raise RuntimeError('scenario timeout/interruption')
      if exited_unreaped(process):break
      phase_file=directory/'phase.json'
      if phase_file.exists():
       phase=json.loads(phase_file.read_text())['name']
       if phase!=phase_name:
        phase_name=phase
        close_deadline=now+10 if phase in ['intermediate-close','final-context-close','server-close'] else None
       if close_deadline is not None and now>=close_deadline:raise RuntimeError('close timeout: '+phase_name)
      time.sleep(.05)
   except BaseException as error:slot['errors'].append(type(error).__name__+': '+str(error))
   finally:
    if process is not None:
     slot['cleanup']=settle(process);slot['rc']=process.returncode
     if not slot['cleanup']['groupAbsent']:slot['errors'].append('group absence unconfirmed')
     if process.returncode!=0:slot['errors'].append('scenario nonzero exit')
    try:
     result=json.loads((directory/'result.json').read_text());slot['result']=result
     if result['fatal'] or len(result['slots'])!=1 or result['slots'][0]['state']!='passed':slot['errors'].append('scenario evidence not passed')
    except BaseException as error:slot['errors'].append('missing/invalid scenario evidence: '+str(error))
    slot['state']='passed' if not slot['errors'] else 'incomplete'
    persist()
   if slot['state']!='passed' or retention:break
 except BaseException as error:failures.append(type(error).__name__+': '+str(error))
 finally:
  persist()
  if retention:print('EVIDENCE_RETENTION_INCOMPLETE '+json.dumps({'slots':slots,'errors':retention}),file=sys.stderr)
 return 0 if not failures and not retention and not EVER_INTERRUPTED and all(s['state']=='passed' for s in slots) else 1
if __name__=='__main__':sys.exit(main())
