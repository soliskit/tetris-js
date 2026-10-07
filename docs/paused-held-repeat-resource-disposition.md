# Ordinary Pause: held soft-repeat resource remains outstanding

Status: Confirmed defect by independently reviewed conditional source argument for the completed ordinary Pause prefix below. Operative only after documentation review, exact-head checks, authorized merge and postmerge publication verification. Not newly Reproduced, native timing evidence, full U4/R1 or Phase4 closure.

## Independent resource criterion

D23 U4 covers gravity, lock-delay and held-key repeat timers, and says these timers are stopped when the game is paused or over. B13's running-resource meaning concerns an outstanding scheduled firing, not merely whether a callback changes gameplay. Drawing and controller polling remain separate resource classes. The original owner timer-scope question and affirmative answer were independently inspected. No grace-until-next-callback exception was adopted.

D22 T3 trusts successful cancellation. The route below never cancels the held S interval at Pause and does not deliver a callback after successful cancellation. U3's exception for failed cancellation during a fault stop does not apply to successful ordinary Pause.

## Ordinary registered event prefix

The public source tree is1e09ad61c19e0b235a231ad8810dae176be4ea77. Choose an ordinary O-first NewGame using twelve valid zero-valued shuffled-factory results: empty dense20x10 board, current O at(0,4), queueT/S/Z, bagJ/L/I, score0, no held piece and no lock delay. InputController's shipped key handlers are registered. Successful storage, scheduler, RAF and nonauthoritative onChange operations are premises, with no competing actor, blur, disconnect, physical S release or delivered gameplay/repeat callback between the events below.

1. Nonmodifier, nonrepeat physical S keydown enters KeyS in heldKeys. GM.softDrop moves the airborne O from(0,4) to(1,4), then updateSoftDrop/startSoftDrop successfully registers the ordinary50ms interval and stores its live handle.
2. P keydown enters KeyP and calls GM.togglePause→handleAction(pause)→guard/runChecked→performAction. GM sets paused, cancels its own gravity timeout, cancels the absent lock delay and saves selected session fields. Successful onChange/requestDraw returns.
3. P keyup removes KeyP only. S remains physically held. Neither P edge calls updateSoftDrop, stopSoftDrop or releaseAllInput. At completed Pause and after P keyup, the same held S interval is still live and has an outstanding scheduled firing.

The O's four cells occupy columns4/5 and rows1/2 after the immediate soft drop, fit the empty board and remain airborne. No lock, rotation, clear or replacement is needed. Focused geometry and the finite resource prefix are stated independently; whole R1 validity is not certified.

## Why the interval survives Pause

GM's Pause branch only cancels its own gravity and lock-delay handles. It has no InputController cancellation reference or hook. The page constructs InputController without retaining a controller reference; ordinary onChange/requestDraw and Pause handlers do not stop its held-repeat resources. No visibility transition occurs in this prefix.

IC.startSoftDrop creates an interval, not a one-shot resource that expires without delivery. Its paused callback later calls stopSoftDrop and returns. Other release paths include S keyup, blur, disconnect and updateSoftDrop after the held condition ends. None occurs before this completed Pause checkpoint. A later self-stop can avoid movement but cannot make the earlier outstanding interval absent.

Confirmed by conditional source argument: this admitted ordinary completed Pause retains the registered held soft-repeat interval, contrary to U4's stopped-resource clause. This is separate from the already-confirmed missing safety checkpoint on a later paused firing and from E2's later Resume rearm/movement disposition. No gameplay mutation, broken gameplay invariant or player harm is claimed by this resource comparison.

## Limits

Historical V38/SRes1 paused-interval observations remain qualified corroboration with their own component, snapshot, scheduler and process limits. This source argument does not rerun them or become native timing evidence. Successful providers, availability of registered event delivery and the selected no-callback/no-release ordering remain premises.

Other held controls, gamepad classes, game over, fault stops, all timer schedules, after-firing checks, full SAF/U4/R1, native UI/devices, persistence, Q2 detector extent and Phase4 remain separate. No correction, permanent test, model, requirement, CI or public-site change is included; stopping-mechanism choice requires later implementation review and approval.
