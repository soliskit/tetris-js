# Phase 3 drawing and controller conditional-fault supplement

SAF5/D23U2 candidate observations, not findings disposition, native browser failure proof, source-rule selection or certification. Phase3 remains open. No production, public-site, permanent-test, CI or executable-model changes; clean-author isolation is a coordinator process boundary, not a tested property of these artifacts. V15-V17 are later private evidence, separate from D45.

## Source and expectation
D23U2 counts fault reported when a small noninterrupting player notice and a separate test-observable signal occur; no stored fault record is required. Drawing/polling loops keep running. Source drawSafely catches and resets drawnBoard/drawnPreviews/lastSnapshot, logs console.error once perload and schedules retry. Poll catch logs console.error and continues while connected. Neither handler directly changes DOM or creates a notice. This is source evidence for these paths, not a universal notice-absence proof.

## V15 two adapters
Chrome154/Node22.23.3, declaredRNG0.3/injectedclock, conditional one-shot CanvasclearRect or getGamepads throw. Actual JSON gates: onefault and oneconsoleerror each/0pageerrors, RAFexecutions/padreads advance, stable opaque-cell geometry/bodytext/storage/Pause/dialogclosed after40clockms, then ArrowLeft shifts1column. Actual recoverypixels inspected clearS/ghost/previews/score0/no notice visible. Source/JSON/pixel reviewer did not rerun browser; source comparison reported trailingnewline difference and lacked index.html, not exactserved-byte attestation.

These are visible/storage projections, not proof every authoritative A1-A16 item is unchanged. Recovery screenshots cannot exclude a transient notice. Conditional adapters do not prove nativefault reachability, hardwarebehavior or elapseddeadlines. No storedfaultrecord is expected.

Harnessfailures retained: initialRAFcounter overwritten byclock, initialviewportwidthchange did not resize board and drawfault occurred onlyafterlaterLeft. Secondattempt waiting for canvaswidth change timedout and createdno freshJSON. Finalwrap afterclock plus explicit canvasCSS310px/screenshotflush and40clockms deliversfault before recovery snapshot. Failedoutput is not recovery evidence.

## V16 ten method-first-call cuts
One-shot conditionalthrows atclearRect,beginPath,moveTo,lineTo,stroke,roundRect,fill,save,restore,translate. All10actual JSON show matchingfailedMethod/onefault/oneconsolelog/0pageerrors/RAFandpolladvance/bodytext+storage stable. Eight retain opaque-current centers and subsequentLeftshift. RoundRect andrestore atghostdrawing yield translucent current; alpha>200 sampler returns zero before/afterLeft. That is lost observation, not disappearedpiece or stoppedinput. Actual pixels showdimS stillvisible. V16 roundRect/restore PNGs have identical bytes, so those images alone do not establish which method was injected; method identity comes from separate JSON/script context. Source/JSON/pixel review supports this distinction, no browser rerun.

## V17 measured alpha and followup
Separate roundRect/restore fixtures observe actual boardcontext globalAlpha1→0.5 afterrecovery/afterLeft→1 afterexplicitCSSresize305. Currentpixelalpha255→128→255. Loweralpha>80 center sample recovers originalfourS cells, observesArrowLeftshift1column atalpha128, and retainsmovedgeometry afterresize. Coordinator asserted actualJSON beforehandoff; independent source/JSON/pixel review, no browser rerun. DimLeft andopaqueResize images inspected; resizePNG may precedefinal40ms sample, so geometry equality is fromJSON, not presumed samecaptureinstant.

Measured: context/pixelalpha and geometry above. Inferredcause: ghost save/globalAlpha0.5/roundRect/stroke/restore sequence leaves alpha0.5 whenroundRect orrestore throws; drawSafely cache reset doesnotresetcontextalpha; canvaswidth/heightassignments duringresize resetcontextstate. Save-stackdepth wasnotinstrumented/proved. FollowupLeft observation shows ArrowLeft moved in these two fixtures, not that input recovery is universally settled; v16's opaque-only projection could not observe the dim state, so those runs cannot show whether it recovered.

## Open scope
Dim-render-untilresize is a conditionalcandidate, unclassified. Tenmethods are not allcallpositions/contexts/propertysetters/persistentfailures; initialgetContext/getImageData/setTransform/observerprecatch/modulefailures remain open. No fullcontextrestoration, allcutpoint containment, full A1-A16/stateframe, nativefault/platformreachability, physicaldevice/Safari/elapsedproof or Phase3closure. Missingnotice remains source/finiteDOM/pixel candidate, not universal proof.
