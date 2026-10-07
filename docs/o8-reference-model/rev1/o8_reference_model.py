"""
O8 independent executable reference model.
Built ONLY from: REQUIREMENTS.md (R), the decision pack text (D16,D17,D18,D20,D21..D34 as labelled in the pack),
SRS geometry table (2-srs_table.txt) and image (1-SRS-pieces.png). No repository/code/tests were consulted.
Source tags in comments: [REQ-ID] = REQUIREMENTS.md row, [B#] = R1 decision, [S#] R2-R5, [T#/U#] fault/timer,
[C#/E#] operation choices, [D32A] operations record Part A, [D16 n] state decision, [Z1] frame principle.
Anything the sources do not fix raises Undefined(<ambiguity id>) unless the caller supplies a choice
(Model(choices=...)). Nothing here claims implementation correctness. Python 3 stdlib only.
"""
import copy, random

KINDS = "IOTSZJL"
# [B2] geometry: table 2-srs_table.txt, (row, col) in box; box 4x4 I, 2x2 O, 3x3 others.
GEOM = {
 'I': [[(1,0),(1,1),(1,2),(1,3)],[(0,2),(1,2),(2,2),(3,2)],[(2,0),(2,1),(2,2),(2,3)],[(0,1),(1,1),(2,1),(3,1)]],
 'J': [[(0,0),(1,0),(1,1),(1,2)],[(0,1),(0,2),(1,1),(2,1)],[(1,0),(1,1),(1,2),(2,2)],[(0,1),(1,1),(2,0),(2,1)]],
 'L': [[(0,2),(1,0),(1,1),(1,2)],[(0,1),(1,1),(2,1),(2,2)],[(1,0),(1,1),(1,2),(2,0)],[(0,0),(0,1),(1,1),(2,1)]],
 'O': [[(0,0),(0,1),(1,0),(1,1)]]*4,
 'S': [[(0,1),(0,2),(1,0),(1,1)],[(0,1),(1,1),(1,2),(2,2)],[(1,1),(1,2),(2,0),(2,1)],[(0,0),(1,0),(1,1),(2,1)]],
 'T': [[(0,1),(1,0),(1,1),(1,2)],[(0,1),(1,1),(1,2),(2,1)],[(1,0),(1,1),(1,2),(2,1)],[(0,1),(1,0),(1,1),(2,0)]],
 'Z': [[(0,0),(0,1),(1,1),(1,2)],[(0,2),(1,1),(1,2),(2,1)],[(1,0),(1,1),(2,1),(2,2)],[(0,1),(1,0),(1,1),(2,0)]],
}
ROWS, COLS = 20, 10          # [PCE-1][B5]
LOCK_DELAY_MS = 500          # [PLY-6]
REPEAT_FIRST_MS, REPEAT_MS, SD_MS = 167, 33, 50   # [INP-2]
LINE_SCORE = {1:100, 2:300, 3:500, 4:800}          # [SCO-1]

class Undefined(Exception):
    """The sources do not define this behaviour (id = ambiguity id in LIMITATIONS)."""

def cells(kind, rot, row, col):
    return [(row+r, col+c) for r, c in GEOM[kind][rot]]

def level_of(score): return score // 1000 + 1                      # [SCO-2][B14]
def gravity_seconds(score):                                         # [PLY-2][B14][S10]
    return max(0.25, 0.7 - 0.02 * (level_of(score) - 1))

class Env:
    """Session environment (inputs, not authoritative state) [D16 s2][V3][U1]."""
    def __init__(self, rng=None, write_ok=lambda: True):
        self.rng = rng or random.Random(0)
        self.write_ok = write_ok            # storage write outcome per attempt [S4,S5]
    def shuffle7(self):                     # random source as input to bag refill [D16 s2][PCE-5]
        b = list(KINDS); self.rng.shuffle(b); return b

class Model:
    def __init__(self, env=None, choices=None, storage=None, high=0):
        self.env = env or Env()
        self.ch = choices or {}
        # persisted representation [D16 1.4]; session item 16 [D17/D20]
        self.eligible = None if storage is None else storage.get('eligible')
        self.save = None if storage is None else storage.get('save')
        self.high = high
        self.item16 = False
        self.fault_reported = False
        self.last_gravity_request_s = None
        self._open()

    # ---------- opening state [STA-1][DSP-8][B6]: game over, empty board
    def _open(self):
        self.mode = 'over'
        self.board = [[None]*COLS for _ in range(ROWS)]
        self.piece = None; self.held = None; self.hold_used = None
        self.queue = self._fresh_queue_placeholder(); self.bag = None
        self.score = 0; self.count = None; self.lowest = None
        self.confirm = None
        self.tokens = []            # [(token, dir)] oldest->newest [B12]
        self.suppressed = set()     # tokens that must not repeat until re-pressed [C3][E2][E3]
        self.hrep = 'idle'; self.sd = 'idle'
        self.touch = None; self.pid = 0
        self.gravity_running = False; self.lock_running = False
    def _fresh_queue_placeholder(self):
        # [B7] queue has three valid pieces in every mode. The sources do not say what the opening queue is.
        if 'opening_queue' in self.ch: return list(self.ch['opening_queue'])
        return []   # A9: opening queue content unspecified; empty placeholder, valid_state(B7) not claimed at opening

    # ---------- helpers
    def fits(self, kind, rot, row, col):                            # [PCE-6][B6]
        for r, c in cells(kind, rot, row, col):
            if not (0 <= r < ROWS and 0 <= c < COLS) or self.board[r][c] is not None: return False
        return True
    def piece_fits(self): k, ro, r, c = self.piece; return self.fits(k, ro, r, c)
    def resting(self):                                              # [B14]
        if self.mode == 'over' or self.piece is None: return False
        k, ro, r, c = self.piece; return not self.fits(k, ro, r+1, c)
    def landing_row(self):                                          # [B14][PLY-5]
        k, ro, r, c = self.piece
        while self.fits(k, ro, r+1, c): r += 1
        return r
    def max_row(self):
        k, ro, r, c = self.piece; return max(rr for rr, _ in cells(k, ro, r, c))
    def level(self): return level_of(self.score)
    def _spawn_pos(self, kind):
        f = self.ch.get('spawn')
        if f is None: raise Undefined('A2')
        return f(kind)
    def _draw(self):                                                # deal one piece [PCE-5][D32A lock row]
        if not self.bag: self.bag = self.env.shuffle7()
        return self.bag.pop(0)                                      # order convention: front of shuffled list (A3)
    def _next_from_queue(self):
        nxt = self.queue.pop(0); self.queue.append(self._draw()); return nxt
    def _set_score(self, s):
        self.score = s
        if s > self.high: self.high = s                              # [SCO-3] (persist timing unspecified, A7)

    # ---------- persistence [S1..S9][STA-4]
    def _withdraw(self):                                            # [S1][S4][S9]
        self.item16 = True
        if self.env.write_ok(): self.eligible = 'false'
    def snapshot(self):
        return dict(board=copy.deepcopy(self.board), piece=self.piece, held=self.held, hold_used=self.hold_used,
                    queue=list(self.queue), bag=None if self.bag is None else list(self.bag),
                    score=self.score, reset_count=self.count, lowest=self.lowest)
    def _save(self):                                                # [STA-4][S5][S9]
        if self.env.write_ok():
            self.save = self.snapshot(); self.eligible = 'true'; self.item16 = False
        else:
            self._withdraw()
    def validate_save(self, p):
        """[SAF-1][B16] accept whole or reject whole. Returns restored state dict or None.
        Payload field names/format are NOT specified by the sources (A8): this is a semantic payload."""
        try:
            need = ('board','piece','held','hold_used','queue','score','reset_count')
            if not isinstance(p, dict) or any(k not in p for k in need): return None
            st = dict(p); st.setdefault('bag', None); st.setdefault('lowest', None)
            tmp = copy.copy(self); tmp.__dict__ = dict(self.__dict__)
            tmp.board = st['board']; tmp.piece = st['piece']; tmp.held = st['held']; tmp.hold_used = st['hold_used']
            tmp.queue = st['queue']; tmp.bag = st['bag'] if st['bag'] is not None else []
            tmp.score = st['score']; tmp.count = st['reset_count']; tmp.mode = 'paused'
            tmp.confirm = None; tmp.touch = None
            if not _well_formed_piece(st['piece']): return None
            if not (isinstance(st['board'], list) and len(st['board']) == ROWS and
                    all(isinstance(rw, list) and len(rw) == COLS and all(x is None or x in tuple(KINDS) for x in rw) for rw in st['board'])): return None
            if not tmp.piece_fits(): return None
            if st['lowest'] is None: st['lowest'] = tmp.max_row()      # L1 [B16]
            tmp.lowest = st['lowest']
            if not _is_int(tmp.lowest) or not (tmp.max_row() <= tmp.lowest <= 19): return None
            if not _is_int(tmp.count) or not (0 <= tmp.count <= 16): return None
            if tmp.count == 16 and not tmp.resting(): return None     # [B9.1]
            if not (st['held'] is None or st['held'] in tuple(KINDS)): return None
            if not isinstance(st['hold_used'], bool): return None
            if not (isinstance(st['queue'], list) and len(st['queue']) == 3 and all(x in tuple(KINDS) for x in st['queue'])): return None
            if st['bag'] is not None:
                b = st['bag']
                if not (isinstance(b, list) and all(x in tuple(KINDS) for x in b) and len(set(b)) == len(b)): return None
            if not (_is_int(st['score']) and st['score'] >= 0): return None
            st['_bag_given'] = st['bag'] is not None
            return st
        except Exception:
            return None
    def continue_available(self, read_ok=True):                     # [D20 1.2 item5][S7]
        if not read_ok: return 'either'      # S7: failed read "may" make it unavailable (nondeterministic)
        return self.eligible == 'true' and not self.item16 and self.save is not None and self.validate_save(self.save) is not None

    # ---------- game start / pieces
    def _spawn(self, kind):
        """New current piece [PCE-3][B9.2]. Returns False (ordinary game over) when no room [STA-3]."""
        row, col = self._spawn_pos(kind)
        self.pid += 1
        self.piece = (kind, 0, row, col); self.count = 0
        if self.touch: self.touch['controls'] = False               # [INP-5][B12]
        if not self.piece_fits():
            self._game_over(); return False
        self.lowest = self.max_row()
        self._sync_lock_on_arrival()
        return True
    def _sync_lock_on_arrival(self):                                # [PLY-6] "appearing"; [B13]
        self.lock_running = self.resting()
    def _start_game(self):                                          # [STA-1][B8]
        self.board = [[None]*COLS for _ in range(ROWS)]
        self._set_score_reset(0)
        self.held = None; self.hold_used = False
        self.bag = self.env.shuffle7()
        cur = self.bag.pop(0); self.queue = [self.bag.pop(0) for _ in range(3)]   # first 7 distinct [PCE-5]
        self.mode = 'playing'; self.confirm = None; self.touch = None
        self.hrep = 'idle'; self.sd = 'idle'; self.suppressed = {t for t, _ in self.tokens}  # A10
        self.gravity_running = True
        self._withdraw()                                            # [STA-1][S1][S2][S9]
        self._spawn(cur)
    def _set_score_reset(self, s): self.score = s
    def _game_over(self):                                           # [STA-3][S2][B6]
        self.mode = 'over'
        self.gravity_running = False; self.lock_running = False
        self.hrep = 'idle'; self.sd = 'idle'; self.confirm = None
        self.piece = None; self.held = None; self.hold_used = None; self.bag = None
        self.count = None; self.lowest = None; self.touch = None   # no semantic value [B6,B8,B10,B12]; board kept [DSP-8]
        self._withdraw()

    # ---------- confirmation dialog [STA-1][B12][D32A ops 1-3]
    def new_game(self):
        """New Game from game over [STA-1]; refused while playing; from paused it is the confirmation flow."""
        if self.mode == 'over': self._start_game()
    def open_confirm(self):
        if self.mode == 'paused' and self.confirm is None: self.confirm = 'cancel'      # Cancel selected on open
    def select(self, choice):
        if self.confirm is not None and choice in ('cancel', 'new_game'): self.confirm = choice
    def answer(self, what):
        """what: 'new_game' | 'cancel' | 'other' (Escape, outside click, any other action) [STA-1]."""
        if self.confirm is None: return
        if what == 'new_game': self.confirm = None; self._start_game()
        else: self.confirm = None   # stays paused; the 'other' action's own effect: A6

    # ---------- movement core
    def _settle(self, event, was_resting):
        """Apply B9.2/PLY-6 after a successful position change. event in {'fall','move','rotate'}."""
        new_low = self.max_row() > self.lowest
        if new_low: self.lowest = self.max_row(); self.count = 0
        if not self.resting():
            self.lock_running = False; return                          # moving off a ledge cancels [PLY-6]
        if event == 'fall':
            if new_low or self.count < 15: self.lock_running = True     # delay starts; count unchanged
            else: self._lock()                                          # count 15, no new row: lock at once [PLY-6][B9.2]
            return
        # move / rotate leaving the piece resting
        if new_low: self.lock_running = True; return                    # count 0, restart, no increment [B9.2]
        if was_resting:
            if self.count < 15: self.count += 1; self.lock_running = True
            # count == 15: delay not restarted, running deadline continues [B9.2]
        else:                                                           # became resting by a move/rotation (A4)
            if self.count < 15: self.count += 1; self.lock_running = True  # literal B9.2 text
            else: self._lock()                                          # "landing locks at once" [PLY-6]
    def move(self, d):                                                  # [PLY-1]
        if self.mode != 'playing': return
        k, ro, r, c = self.piece
        if self.fits(k, ro, r, c+d):
            was = self.resting(); self.piece = (k, ro, r, c+d); self._settle('move', was)
    def rotate(self, cw=True):                                          # [PCE-4]
        if self.mode != 'playing': return
        k, ro, r, c = self.piece
        if k == 'O': return
        kicks = self.ch.get('kicks')
        if kicks is None: raise Undefined('K1')
        for direction in ((1, -1) if cw else (-1, 1)):
            nro = (ro + direction) % 4
            for dr, dc in kicks(k, ro, nro):
                if self.fits(k, nro, r+dr, c+dc):
                    was = self.resting(); self.piece = (k, nro, r+dr, c+dc); self._settle('rotate', was); return
    def _fall_one(self):
        k, ro, r, c = self.piece
        if self.fits(k, ro, r+1, c):
            self.piece = (k, ro, r+1, c); self._settle('fall', False); return True
        return False
    def gravity_tick(self):                                             # [PLY-2]; blocked tick: no effect (A11)
        if self.mode == 'playing' and self.gravity_running:
            self._fall_one(); self._gravity_req()
    def _gravity_req(self): self.last_gravity_request_s = gravity_seconds(self.score)
    def soft_drop(self):                                                # [PLY-3]
        if self.mode != 'playing': return
        self._fall_one()
        if self.mode == 'playing': self._gravity_req()                  # restarts gravity timer
    def hard_drop(self):                                                # [PLY-4]
        if self.mode != 'playing': return
        k, ro, r, c = self.piece; self.piece = (k, ro, self.landing_row(), c); self._lock()
    def lock_expire(self):                                              # [PLY-6]
        if self.mode == 'playing' and self.lock_running: self._lock()
    def _lock(self):                                                    # [D32A Lock][SCO-1][C1]
        k, ro, r, c = self.piece
        for rr, cc in cells(k, ro, r, c): self.board[rr][cc] = k
        full = [i for i in range(ROWS) if all(x is not None for x in self.board[i])]
        if full:
            keep = [row for i, row in enumerate(self.board) if i not in full]
            self.board = [[None]*COLS for _ in full] + keep
            self._set_score(self.score + LINE_SCORE[len(full)])
        self.lock_running = False; self.hold_used = False
        nxt = self._next_from_queue()
        ok = self._spawn(nxt)
        if ok and full: self._save()                                   # save after turn completes; none if game over [C1]
    def hold(self):                                                     # [PLY-7][B8]
        if self.mode != 'playing' or self.hold_used: return           # unavailable: no effect (A12)
        cur = self.piece[0]
        if self.held is None: new = self._next_from_queue(); self.held = cur
        else: new = self.held; self.held = cur
        ok = self._spawn(new)
        if ok: self.hold_used = True

    # ---------- pause / resume [STA-2][STA-4][STA-5][B9.2]
    def pause(self):
        if self.mode != 'playing': return
        if self.lock_running:                                           # counts as one reset
            self.count = 16 if self.count == 15 else self.count + 1
        self.mode = 'paused'; self.gravity_running = False; self.lock_running = False
        self.hrep = 'idle'; self.sd = 'idle'
        self._save()
    def page_hidden(self): self.pause()                                 # [STA-5]
    def resume(self):
        if self.confirm is not None: self.answer('other'); return      # dismiss only (A6)
        if self.mode != 'paused': return
        self.mode = 'playing'; self.gravity_running = True
        self.suppressed = {t for t, _ in self.tokens}                  # [C3][E2][E3]
        if self.resting():
            if self.count == 16: self._lock()                          # [B9.2]
            else: self.lock_running = True
    def continue_game(self, read_ok=True):                              # [STA-4][B16][C4]
        if self.mode != 'over': return
        avail = self.continue_available(read_ok)
        if avail == 'either': raise Undefined('S7-nondeterministic')
        if not avail:
            if self.eligible == 'true' and not self.item16 and self.save is not None: self._withdraw()  # invalid: rejected whole [SAF-1]
            return
        st = self.validate_save(self.save)
        self.board = copy.deepcopy(st['board']); self.piece = tuple(st['piece']); self.held = st['held']
        self.hold_used = st['hold_used']; self.queue = list(st['queue']); self.score = st['score']
        self.count = st['reset_count']; self.lowest = st['lowest']
        self.bag = list(st['bag']) if st['bag'] is not None else self.env.shuffle7()   # fresh bag if none [STA-4]
        self.mode = 'paused'; self.gravity_running = False; self.lock_running = False
        self.hrep = 'idle'; self.sd = 'idle'; self.touch = None; self.pid += 1
        # item16 unchanged by Continue [C4]; saved game stays stored (A13)

    # ---------- held controls [INP-2][INP-3][B12][C3][E2]
    def _active_h(self):
        t = [(tok, d) for tok, d in self.tokens if d in ('left', 'right') and tok not in self.suppressed]
        return t[-1][1] if t else None
    def press(self, token, d, modified=False):
        if modified: return                                             # never counts as held [INP-3]
        if any(t == token for t, _ in self.tokens): return             # keyboard auto-repeat ignored [INP-3]
        self.tokens.append((token, d))
        if self.mode != 'playing': return
        if d in ('left', 'right'):
            self.move(-1 if d == 'left' else 1)
            if self.mode == 'playing': self.hrep = 'waiting'           # first repeat after 167 ms
        elif d == 'down':
            self.soft_drop()
            if self.mode == 'playing': self.sd = 'dropping'
    def release(self, token):
        old = self._active_h()
        self.tokens = [(t, d) for t, d in self.tokens if t != token]; self.suppressed.discard(token)
        if self.mode != 'playing': return
        new = self._active_h()
        if new is None: self.hrep = 'idle'
        elif new != old:                      # returned to a still-held other direction [INP-2]
            f = self.ch.get('release_repeat')
            if f is None: raise Undefined('A5')
            self.hrep = f()
        if not any(d == 'down' and t not in self.suppressed for t, d in self.tokens): self.sd = 'idle'
    def repeat_fire(self, which):
        if self.mode != 'playing': return
        if which == 'h' and self.hrep in ('waiting', 'repeating') and self._active_h():
            self.move(-1 if self._active_h() == 'left' else 1)
            if self.mode == 'playing': self.hrep = 'repeating'
        elif which == 'sd' and self.sd == 'dropping': self.soft_drop()
    def blur(self):                                                     # [INP-2] repeating stops (tokens: A10)
        self.hrep = 'idle'; self.sd = 'idle'; self.suppressed = {t for t, _ in self.tokens}

    # ---------- touch [INP-5][C2][E1] (semantic only; pixel geometry is out of model, see LIMITATIONS)
    def touch_begin(self):
        if self.mode == 'playing' and self.piece: self.touch = dict(controls=True, pid=self.pid, excursion=False)
    def touch_move_cols(self, n):
        if self.touch and self.touch['controls'] and self.touch['pid'] == self.pid:
            self.touch['excursion'] = True
            for _ in range(abs(n)): self.move(1 if n > 0 else -1)
    def touch_drop_rows(self, n):
        if self.touch and self.touch['controls'] and self.touch['pid'] == self.pid:
            self.touch['excursion'] = True
            for _ in range(n): self.soft_drop()
    def touch_end(self, never_beyond_10px, ends_within_10px):
        t = self.touch; self.touch = None
        if t and t['controls'] and t['pid'] == self.pid and never_beyond_10px and ends_within_10px and not t['excursion']:
            self.rotate(True)        # tap rotation direction: A14 (read as clockwise)
    def touch_cancel(self): self.touch = None                           # no rotation [C2]

    # ---------- SAF-3 safe terminal [D16 s7-8][T1][U3][S3]
    def fault_stop(self):
        self.mode = 'over'; self.gravity_running = False; self.lock_running = False
        self.hrep = 'idle'; self.sd = 'idle'; self.fault_reported = True   # last good save kept: eligible/save untouched
        # ordinary contents retained (F2); R1 validity NOT required here [B1][D16 s8]

def _is_int(x): return isinstance(x, int) and not isinstance(x, bool)
def _well_formed_piece(p):
    return (isinstance(p, (tuple, list)) and len(p) == 4 and p[0] in tuple(KINDS) and all(_is_int(x) for x in p[1:]) and
            0 <= p[1] < (1 if p[0] == 'O' else 4) )   # O: only its first state valid [B2][PCE-4]

def valid_state(m):
    """R1 predicates B4-B14 on one committed (non-fault) state. Returns list of violated predicate ids."""
    bad = []
    if m.mode not in ('playing', 'paused', 'over'): bad.append('B4')
    if not (len(m.board) == ROWS and all(len(r) == COLS and all(x is None or x in tuple(KINDS) for x in r) for r in m.board)): bad.append('B5')
    if not (len(m.queue) == 3 and all(x in tuple(KINDS) for x in m.queue)): bad.append('B7')
    if not (_is_int(m.score) and m.score >= 0): bad.append('B11')
    if not isinstance(m.item16, bool): bad.append('D20-item16')
    if m.mode in ('playing', 'paused'):
        if not (m.piece and _well_formed_piece(m.piece) and m.piece_fits()): bad.append('B6')
        else:
            if not (_is_int(m.lowest) and m.max_row() <= m.lowest <= 19): bad.append('B9.1-lowest')
            if not (_is_int(m.count) and 0 <= m.count <= 16): bad.append('B9.1-count')
            elif m.count == 16 and not (m.mode == 'paused' and m.resting()): bad.append('B9.1-16')
        if not (m.held is None or m.held in tuple(KINDS)): bad.append('B8')
        if not isinstance(m.hold_used, bool): bad.append('B8')
        if not (isinstance(m.bag, list) and len(set(m.bag)) == len(m.bag) and all(x in tuple(KINDS) for x in m.bag)): bad.append('B10')
        if m.confirm is not None and (m.mode != 'paused' or m.confirm not in ('cancel', 'new_game')): bad.append('B12-confirm')
        # B13 resources
        if m.mode == 'playing':
            if not m.gravity_running: bad.append('B13-gravity')
            if m.lock_running != m.resting(): bad.append('B13-lock')
            act = m._active_h() is not None
            if (m.hrep != 'idle') != act and m.hrep != 'idle': bad.append('B13-hrep')
            if m.sd == 'dropping' and not any(d == 'down' for _, d in m.tokens): bad.append('B13-sd')
        else:
            if m.gravity_running or m.lock_running or m.hrep != 'idle' or m.sd != 'idle': bad.append('B13-paused')
    else:
        if m.gravity_running or m.lock_running or m.hrep != 'idle' or m.sd != 'idle': bad.append('B13-over')
        if m.piece is not None: bad.append('B6-over')
    return bad
