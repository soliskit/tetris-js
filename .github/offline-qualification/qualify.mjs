// Private authored proposal. Not run, syntax checked or formatted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash, randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium, webkit} from './ci-runtime/node_modules/playwright/index.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.resolve(process.env.OFFLINE_EVIDENCE);
const ENGINE=process.env.OFFLINE_ENGINE;
assert.ok(['chromium','webkit'].includes(ENGINE));
await fs.mkdir(OUT,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const nonce=randomBytes(32).toString('hex');
const prefixList=['/','/nested/app/'];
const cases=ENGINE==='chromium'?['install-offline-reload','persistent-offline-relaunch','legacy-takeover','foreign-cache-preservation','corrupt-install-rejected']:['document-game-smoke'];
const planned=prefixList.flatMap(prefix=>cases.map(name=>({prefix,name,state:'not-run',errors:[],evidence:{}})));
const slotIndex=Number(process.env.OFFLINE_SLOT_INDEX);assert.ok(Number.isInteger(slotIndex)&&slotIndex>=0&&slotIndex<planned.length);
const slots=[planned[slotIndex]];
let fatal=null,server=null,origin=null,active=null;
const requests=[];
let expected,goodWorker,receipt,badWorker;
const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const save=async()=>fs.writeFile(path.join(OUT,'result.json'),JSON.stringify({nonce,engine:ENGINE,head:process.env.OFFLINE_HEAD,base:'989b015f54fdeb85bf14ad5ea769e15921ca469d',documentSha256:expected?sha(expected):null,workerSha256:goodWorker?sha(goodWorker):null,fatal,slots,requests,ceiling:ENGINE==='chromium'?'Chromium hosted service-worker evidence only':'WebKit online document smoke only, no service-worker qualification'},null,2));
const phase=async(name)=>fs.writeFile(path.join(OUT,'phase.json'),JSON.stringify({name,at:Date.now()}));
// Python owns the60s scenario/10s close timers and terminates/reaps the
// entire process group before accepting results. No Promise.race orphaning.
async function closeContext(context,label){await phase(label);await context.close();await phase('active');}
async function createServer() {
 server=http.createServer(async(req,res)=>{
  const log={url:req.url,method:req.method,mode:active?.mode,at:Date.now()};requests.push(log);
  try {
   const u=new URL(req.url,'http://127.0.0.1');
   if(!active || active.deny) {res.writeHead(503);res.end('network blocked');log.status=503;return;}
   if(!u.pathname.startsWith(active.prefix)) {res.writeHead(404);res.end();log.status=404;return;}
   let relative=decodeURIComponent(u.pathname.slice(active.prefix.length)) || 'index.html';
   assert.ok(!relative.split('/').includes('..'));
   let bytes;
   if(relative==='harness.html') bytes=Buffer.from('<!doctype html><title>qualification control</title>');
   else if(relative==='sw.js' && active.mode==='corrupt') bytes=Buffer.from(badWorker);
   else bytes=await fs.readFile(path.join(HERE,active.mode==='legacy'?'legacy':'candidate',relative));
   log.sha256=sha(bytes);log.status=200;
   res.writeHead(200,{'Content-Type':contentTypes[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store','Service-Worker-Allowed':active.prefix});res.end(bytes);
  }catch(error){log.status=404;log.error=String(error);res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 origin='http://127.0.0.1:'+server.address().port;
}
async function workerReady(page) {
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>navigator.serviceWorker.controller?.state==='activated',null,{timeout:15000});
}
async function snapshotCaches(page) {
 return page.evaluate(async()=>{
  const result={};
  for(const name of (await caches.keys()).sort()) {
   const cache=await caches.open(name);result[name]={};
   for(const request of (await cache.keys()).sort((a,b)=>a.url.localeCompare(b.url))) {
    const response=await cache.match(request);
    result[name][request.url]={status:response.status,headers:[...response.headers],body:[...new Uint8Array(await response.arrayBuffer())]};
   }
  }
  return result;
 });
}
async function documentWitness(page,response,slot,label,sw) {
 assert.ok(response,label+' navigation response');assert.equal(response.status(),200);
 assert.equal(sha(await response.body()),sha(expected),label+' full response byte identity');
 assert.equal(response.fromServiceWorker(),sw,label+' service-worker provenance');
 slot.evidence[label]={documentSha256:sha(await response.body()),fromServiceWorker:response.fromServiceWorker()};
}
async function gameWitness(page,slot,label) {
 await page.locator('#newGameButton').click({timeout:10000});
 await page.locator('#playPauseButton').waitFor({state:'visible',timeout:10000});
 assert.equal(await page.locator('#playPauseButton').isEnabled(),true);
 assert.equal(await page.locator('#playPauseButton').getAttribute('aria-label'),'Pause');
 assert.equal(await page.locator('#menuControls').isVisible(),false);
 assert.equal(await page.locator('#gameOverMessage').isVisible(),false);
 // Existing pinned helpers sample alpha at cell centers. Ghost cells are
 // outlines; start-game active piece occupies four solid centers.
 await page.waitForFunction(()=>{
  const c=document.getElementById('tetris'),ctx=c.getContext('2d'),d=ctx.getImageData(0,0,c.width,c.height).data,size=c.width/10;
  let count=0;for(let r=0;r<20;r++)for(let col=0;col<10;col++){
   const i=(Math.floor((r+.5)*size)*c.width+Math.floor((col+.5)*size))*4;if(d[i+3]>200)count++;
  }return count===4;
 },null,{timeout:10000});
 const canvas=await page.locator('#tetris').evaluate(canvas=>({width:canvas.width,height:canvas.height,rgba:[...canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data]}));
 assert.ok(canvas.width>0 && canvas.height>0 && canvas.rgba.some((v,i)=>i%4===3&&v>0),'nonempty board pixels');
 slot.evidence[label+'Canvas']={occupiedCenters:4,width:canvas.width,height:canvas.height,rgbaSha256:sha(Buffer.from(canvas.rgba))};
 await page.screenshot({path:path.join(OUT,label+'.png'),fullPage:true});
}
try {
 expected=await fs.readFile(path.join(HERE,'candidate/index.html'));
 goodWorker=await fs.readFile(path.join(HERE,'candidate/sw.js'),'utf8');
 receipt=JSON.parse(await fs.readFile(path.join(HERE,'candidate/generation-receipt.json'),'utf8'));
 assert.equal(sha(expected),receipt.documentSha256);assert.equal(sha(goodWorker),receipt.workerSha256);
 const marker='const PAYLOAD = ';
 const start=goodWorker.indexOf(marker)+marker.length;
 const end=goodWorker.indexOf(';\nconst ROOT',start);
 assert.ok(start>=marker.length && end>start);
 const corruptPayload=JSON.parse(goodWorker.slice(start,end));
 corruptPayload['index.html'].body=Buffer.from('wrong document').toString('base64');
 // Deliberately retain the original digest. This worker must not install.
 badWorker=goodWorker.slice(0,start)+JSON.stringify(corruptPayload)+goodWorker.slice(end);
 
 await save();
 await createServer();
 for(const [index,slot] of slots.entries()) {
  let context=null,page=null;
  slot.state='running';active={prefix:slot.prefix,mode:'candidate',deny:false};
  const profile=path.join(OUT,'profile-'+slotIndex);
  const label=ENGINE+'-'+slotIndex;
  const pageErrors=[];
  function watch(p){p.on('pageerror',error=>pageErrors.push(String(error)));}
  async function openContext(offline=false){
   const options={headless:true,viewport:{width:430,height:932},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:ENGINE==='webkit'?'block':'allow'};
   const type=ENGINE==='chromium'?chromium:webkit;
   context=await type.launchPersistentContext(profile,options);
   await context.setOffline(offline);page=await context.newPage();watch(page);
   slot.evidence.browserVersion=context.browser()?.version() ?? null;
   slot.evidence.userAgent=await page.evaluate(()=>navigator.userAgent);
  }
  try {
   await (async()=>{
    await openContext();
    const base=origin+slot.prefix;
    if(slot.name==='document-game-smoke') {
     await documentWitness(page,await page.goto(base),slot,label,false);
     await gameWitness(page,slot,label);
     slot.evidence.serviceWorkerQualification='NOT TESTED: Playwright WebKit service workers unsupported';
    } else if(slot.name==='legacy-takeover') {
     active.mode='legacy';await page.goto(base);await workerReady(page);
     slot.evidence.legacyController=await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL);
     await page.evaluate(()=>{globalThis.__offlineControllerChanges=0;navigator.serviceWorker.addEventListener('controllerchange',()=>globalThis.__offlineControllerChanges++);});
     active.mode='candidate';
     await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
     // The previous controller and new controller share scriptURL. Require a
     // controllerchange event/state transition plus the actual candidate bytes.
     await page.waitForFunction(async()=>{try{await fetch('script.js');return false;}catch{return true;}},null,{timeout:15000});
     await page.waitForFunction(()=>globalThis.__offlineControllerChanges>0,null,{timeout:15000});
     slot.evidence.controllerChanges=await page.evaluate(()=>globalThis.__offlineControllerChanges);
     const probes=await page.evaluate(async()=>{
      const results=[];for(const name of ['script.js','style.css','game/gameManager.js','game/%70osition.js']) {
       try {const r=await fetch(name);results.push({name,rejected:false,status:r.status});}catch{results.push({name,rejected:true});}
      }return results;
     });
     assert.ok(probes.every(p=>p.rejected));slot.evidence.legacyProbes=probes;
     await documentWitness(page,await page.goto(base+'?fresh=1'),slot,label,true);
     await gameWitness(page,slot,label);
    } else if(slot.name==='corrupt-install-rejected') {
     active.mode='corrupt';await page.goto(base+'harness.html');
     slot.evidence.install=await page.evaluate(async()=>{
      const r=await navigator.serviceWorker.register('sw.js');
      const w=r.installing ?? r.waiting ?? r.active;
      if(!w)throw new Error('no install worker observed');
      await new Promise((resolve,reject)=>{if(w.state==='redundant')return resolve();const timer=setTimeout(()=>reject(new Error('redundant timeout')),10000);w.addEventListener('statechange',()=>{if(w.state==='redundant'){clearTimeout(timer);resolve();}});});
      return {state:w.state,active:r.active?.state ?? null,controller:!!navigator.serviceWorker.controller};
     });
     assert.equal(slot.evidence.install.state,'redundant');assert.equal(slot.evidence.install.active,null);assert.equal(slot.evidence.install.controller,false);
    } else {
     let before;
     if(slot.name==='foreign-cache-preservation') {
      await page.goto(base+'harness.html');
      await page.evaluate(async()=>{
       for(const name of ['tetris-version-999-foreign','tetris-pins','foreign-project-cache']) {
        const c=await caches.open(name);await c.put(new URL('./',location.href),new Response('foreign poison '+name));
       }await caches.open('foreign-empty');
      });before=await snapshotCaches(page);slot.evidence.cachesBefore=before;
     }
     await documentWitness(page,await page.goto(base),slot,label+'Install',false);await workerReady(page);
     if(slot.name==='foreign-cache-preservation') {
      slot.evidence.cachesAfterInstall=await snapshotCaches(page);
      assert.deepEqual(slot.evidence.cachesAfterInstall,before,'no foreign-cache mutation');
      await documentWitness(page,await page.reload(),slot,label,true);
      slot.evidence.cachesAfterReload=await snapshotCaches(page);
      assert.deepEqual(slot.evidence.cachesAfterReload,before);
     } else {
      if(slot.name==='persistent-offline-relaunch') {
       await closeContext(context,'intermediate-close');context=null;active.deny=true;await openContext(true);
      } else {active.deny=true;await context.setOffline(true);}
      await documentWitness(page,await page.goto(base+'?offline=1'),slot,label,true);
     }
     const assetHashes={};
     for(const relative of ['manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png']) {
      const result=await page.evaluate(async name=>{const r=await fetch(name);return {status:r.status,bytes:[...new Uint8Array(await r.arrayBuffer())]};},relative);
      assert.equal(result.status,200);
      assetHashes[relative]=sha(Buffer.from(result.bytes));
      assert.equal(assetHashes[relative],sha(await fs.readFile(path.join(HERE,'candidate',relative))));
     }
     slot.evidence.assetHashes=assetHashes;
     await gameWitness(page,slot,label);
    }
    assert.deepEqual(pageErrors,[],'no page runtime errors');slot.evidence.pageErrors=pageErrors;
   })();
   slot.state='passed';
  } catch(error) {slot.state='failed';slot.errors.push(error.stack ?? String(error));}
  finally {
   slot.evidence.pageErrors=pageErrors;
   if(context)try{await closeContext(context,'final-context-close');}catch(error){slot.state='incomplete';slot.errors.push('cleanup: '+String(error));}
   await save();
  }
  // No continuation after a failed/incomplete scenario. Remaining slots stay
  // not-run and prevent any suite pass. No automatic repair/retry.
  if(slot.state!=='passed')break;
 }
}catch(error){fatal=error.stack ?? String(error);}
finally {
 if(server)try{await phase('server-close');await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await phase('settled');}catch(error){fatal=(fatal??'')+'\ncleanup: '+String(error);}
 try {await save();} catch(error){fatal=(fatal??'')+'\nretention: '+String(error);console.error(JSON.stringify({status:'INCONCLUSIVE',fatal,slots}));}
}
const pass=!fatal && slots.length===1 && slots.every(s=>s.state==='passed');
console.log(JSON.stringify({status:pass?'PASS':'INCONCLUSIVE',engine:ENGINE,passed:slots.filter(s=>s.state==='passed').length,planned:slots.length,nonce}));
process.exitCode=pass?0:1;
