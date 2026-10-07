# Self-consistency checks of the model against its own source-derived predicates. TEST CONTROLS (stubs) below are
# NOT specification: kicks=[(0,0)] and spawn columns are placeholders for undefined points K1/A2.
import random, sys, re, os
import re, os
import importlib.util, glob
_p = os.environ.get('O8_MODEL') or sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'o8_reference_model*.py')))[-1]
_sp = importlib.util.spec_from_file_location('o8m', _p); _m = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(_m)
globals().update({k: v for k, v in vars(_m).items() if not k.startswith('__')})
def stub_choices():
    return dict(kicks=lambda k,a,b:[(0,0)],
                spawn=lambda k:(0,3 if k!='O' else 4),
                release_repeat=lambda:'waiting', opening_queue=list('IOT'), suppress_on_start=True, suppress_on_blur=True)
def run(seed, n=3000):
    rng=random.Random(seed); env=Env(random.Random(seed), write_ok=lambda: rng.random()<0.9)
    m=Model(env,stub_choices()); m.new_game(); ops=0
    names=['move','rotate','gravity_tick','soft_drop','hard_drop','lock_expire','hold','pause','resume','page_hidden','continue_game',
           'open_confirm','press','release','repeat_fire','new_game','fault']
    for i in range(n):
        o=rng.choice(names)
        if o=='move': m.move(rng.choice([-1,1]))
        elif o=='rotate': m.rotate(rng.random()<.5)
        elif o=='press': m.press(rng.choice('ABC'),rng.choice(['left','right','down']))
        elif o=='release': m.release(rng.choice('ABC'))
        elif o=='repeat_fire': m.repeat_fire(rng.choice(['h','sd']))
        elif o=='fault':
            if rng.random()<.01: m.fault_stop(); m.new_game()
        elif o=='open_confirm':
            m.open_confirm(); 
            if rng.random()<.5: m.answer(rng.choice(['new_game','cancel','other']))
        else: getattr(m,o)()
        if m.fault_reported: m.fault_reported=False
        v=valid_state(m)
        assert not v,(seed,i,o,v)
        ops+=1
    return m
for s in range(30): run(s)
print('random-play validity: ok')
# geometry vs supplied table text (path given by env var O8_TABLE; table file is a supplied input)
tp=os.environ.get('O8_TABLE','/downloads/o8-pack-v4-2-srs_table-224692c4.txt'); tab={}; cur=None
for l in open(tp):
    mm=re.match(r'(\w) \(box',l)
    if mm: cur=mm.group(1); tab[cur]=[]; continue
    mm=re.match(r'\s+state \d:(.*)',l)
    if mm: tab[cur].append(sorted((int(a),int(b)) for a,b in re.findall(r'\((\d),(\d)\)',mm.group(1))))
for k in KINDS:
    for st in range(4): assert sorted(GEOM[k][st])==tab[k][st],(k,st)
print('GEOM == table for all 28 states: ok')
m0=Model(Env(),stub_choices()); assert valid_state(m0)==[], valid_state(m0)   # opening state valid
try: Model(Env(),dict(kicks=None)); raise SystemExit('expected Undefined A9')
except Undefined as e: assert str(e)=='A9'
print('opening-state checks: ok')
# directed checks of spec rules
env=Env(random.Random(1)); m=Model(env,stub_choices()); m.new_game()
assert m.level()==1 and abs(gravity_seconds(0)-0.7)<1e-12 and abs(gravity_seconds(10000)-0.5)<1e-12 and gravity_seconds(100000)==0.25
# PCE-5: first seven pieces all different
first=[m.piece[0]]+m.queue+m.bag; assert sorted(first)==sorted(KINDS) or len(set(first))==7
# SCO-1 line clear: fill row 19 except cols 0-3 then drop I flat
m.board=[[None]*10 for _ in range(20)]
for c in range(4,10): m.board[19][c]=m.board[18][c]='T'
m.piece=('I',2,17,0); m.lowest=19; m.count=0; m.lock_running=True   # I state2 row 2 of box -> board row 19
m.lock_expire(); assert m.score==100 or m.score==300, m.score
# pause during lock delay: count 14 -> 15, 15 -> 16 and resume locks at once
m2=Model(Env(random.Random(2)),stub_choices()); m2.new_game()
m2.board=[[None]*10 for _ in range(20)]; m2.piece=('O',0,18,4); m2.lowest=19; m2.count=14; m2.lock_running=True; m2.hold_used=False
m2.pause(); assert m2.count==15 and m2.mode=='paused' and not m2.lock_running and valid_state(m2)==[]
m2.resume(); assert m2.lock_running and m2.count==15
m2.pause(); assert m2.count==16 and valid_state(m2)==[]
m2.resume(); assert m2.piece[2]!=18 or m2.board[19][4]=='O'   # locked at once
# storage S4/S5/S9, continue C4
fail=[False]; m3=Model(Env(random.Random(3),write_ok=lambda: not fail[0]),stub_choices()); m3.new_game(); m3.pause()
assert m3.eligible=='true' and m3.item16 is False and m3.continue_available() is True
m3.resume(); fail[0]=True; m3.pause()                      # failed save -> previous withdrawn from Continue (S5)
assert m3.item16 is True and m3.continue_available() is False
fail[0]=False; m3.resume(); m3.pause(); assert m3.item16 is False and m3.continue_available()   # S9 cleared by success
m3.mode='over'; m3._game_over(); assert m3.eligible=='false' and not m3.continue_available()    # STA-3/S2
# Continue restores paused; bag/ count exact
m4=Model(Env(random.Random(4)),stub_choices()); m4.new_game(); m4.pause(); snap=m4.snapshot(); m4._game_over() if False else None
m4.mode='over'; m4.piece=None; m4.count=None; m4.lowest=None; m4.bag=None; m4.held=None; m4.hold_used=None
m4.continue_game(); assert m4.mode=='paused' and m4.snapshot()==snap and valid_state(m4)==[], 'continue exact'
# atomicity: missing choice leaves state untouched (rev4)
ch=stub_choices(); del ch['suppress_on_start']
ma=Model(Env(random.Random(5)),ch); before=(ma.mode,ma.board,ma.queue,ma.piece,ma.score,ma.bag)
try: ma.new_game(); raise SystemExit('expected Undefined A10')
except Undefined as e: assert str(e)=='A10'
assert (ma.mode,ma.board,ma.queue,ma.piece,ma.score,ma.bag)==before and valid_state(ma)==[]
mb=Model(Env(random.Random(6)),stub_choices()); mb.new_game(); del mb.ch['suppress_on_blur']
try: mb.press('A','left'); mb.blur(); raise SystemExit('expected Undefined')
except Undefined: pass
assert mb.hrep=='waiting' and valid_state(mb)==[]
mc=Model(Env(random.Random(7)),stub_choices()); mc.new_game(); n=mc.gravity_restarts; mc.soft_drop(); assert mc.gravity_restarts==n+1
print('directed checks: ok')
