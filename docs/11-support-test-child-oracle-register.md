# Supporting tests: board values, served files and verification policy

These tests check small board helpers, selected server responses, file declarations and verification settings. They do not prove the frozen reference model, physical installation, complete offline behavior or semantic requirement coverage. This register separates literal answers from source-derived comparisons and the wider claims each leaves open.

Source reconciliation only. No test execution, finding promotion, property certification, phase exit, new limit or production/test/model/CI change.

## Source and selection

Read fresh main. Every declaration body in the four selected files was inspected: five in model, two in server, ten in static files and nine in traceability. These 26 source declarations are navigation, not executed results or a complete correctness domain. `test/model.test.js` imports production board/position helpers; it is not the frozen O8 reference model.

| Test source | SHA256 |
|---|---|
| `test/model.test.js` | `4f509cd814fc74ae0a210b4a7006d8caf7c06dda568068a4deae80fffe1b3281` |
| `test/server.test.js` | `de09c6a2a1b240b792cabb831dbe66f452ca23cd5bfd5bef405ede150f9ea66d` |
| `test/staticFiles.test.js` | `eca4a6f59e8255149ef1798dcedc80bd1fd176f14486caae013bed67eac89224` |
| `test/traceability.test.js` | `d6a3976269bfd4243f23b699b79d783b0cb7e369858ea116c3cdfec33d34127e` |

## Governing relations and fixture boundaries

PCE-1 fixes a 20-row, 10-column board and no contents outside it. APP-3 fixes existing relative references and correct local response types; APP-5 asks for scripts together rather than import-level delays. APP-1 requires actual installation, full-screen launch and an icon. APP-2 requires complete cached versions and no mixed-version page. DSP-4 and APP-4 retain native gesture and supported-device scope. QA-1 requires verification, not merely a matching tag. QA-2 to QA-6 require actual coverage, browser results, type checks and mutation effectiveness at their stated scope. The literals and source-text checks below can support those claims only within their own boundaries.

Model fixtures use production `createBoard` and `position`. Server fixtures spawn the actual `index.js` with a chosen port, wait for its stdout phrase and kill the child after the test. The free-port probe closes before the server binds, so its result does not reserve that port; no startup bound is declared by this helper. None of that was executed here.

Static-file fixtures read tracked HTML, manifest, worker and script text. The import walker recognizes only lines matching its specific single-line `import ... from` grammar with a single-quoted specifier beginning with `.`. Its APP_SHELL reader extracts a specific array declaration with a regular expression. These extractors are not a general HTML/JavaScript parser or browser dependency graph. PNG checks read three signature characters and width/height header fields; they do not decode or visually inspect the icon.

Traceability fixtures collect requirement IDs from a specific Markdown-row grammar and test tags from single lines beginning `test(` in `.js` files under test/e2e. Generated names, skips, nested assertions and runtime registration are not independently enumerated by that text scan. Reading a threshold or workflow command does not run it or establish repository enforcement settings.

## Board and position children

| Child / source line | Actual assertion and independent relation | Remaining boundary |
|---|---|---|
| MP-01 / 7 | `position(3,7)` equals literal row3/column7. An explicit pair checks this representation example. | No arbitrary numeric/invalid domain or semantic field mapping. |
| MP-02 / 11 | Below (2,5) equals production `position(3,5)`, differs by identity and leaves start equal to production `position(2,5)`. Literal coordinate arithmetic is independent; expected object construction is shared. | No immutable-runtime guarantee, arbitrary values or in-place alias mutation proof. |
| MP-03 / 19 | Created board has 20 rows, each length10, flattened cells empty/null; changing [0][0] leaves [0][1] and [1][0] unfilled. PCE-1 supplies dimensions. | Only two independence witnesses; flat/every does not validate every hostile sparse representation, all pairwise aliases or later writers. |
| MP-04 / 29 | cellAt returns identical endpoint cells at (0,0)/(19,9), undefined at five literal outside coordinates. PCE-1 supplies inside/outside meaning. | Not every coordinate, malformed row, noninteger or inherited-property representation. |
| MP-05 / 38 | Sorted state/action values equal literal three-state/ten-action lists; both objects are frozen. | Token spelling/list identity is not STA-1 transitions or INP-1 key-to-effect correspondence; freezing these flat objects does not freeze game state. |

## Local server children

| Child / source line | Actual assertion and independent relation | Remaining boundary |
|---|---|---|
| SV-01 / 35 | Eight explicit paths return200 and content-type prefixes for HTML/CSS/JS/manifest/PNG/SVG; root contains literal Tetris title. APP-3 supplies correct-type/existing-file obligation. | Not all files, full MIME parsing, response-byte identity, other mount folders, network failure or browser execution. Prefix matching is the selected oracle. |
| SV-02 / 56 | Three supplied paths yield404: missing.js, game/nope.js and /../package.json. | A URL client may normalize dot segments before sending; no assertion records the received path. This is not exhaustive traversal, encoding, exposure or security proof. |

## Static file children

| Child / source line | Actual assertion and independent relation | Remaining boundary |
|---|---|---|
| SF-01 / 26 | At least five double-quoted src/href matches; each avoids leading slash/http(s) and exists locally. APP-3 supplies relative/existing relation. | Not all syntax, CSS/module/worker/dynamic references or URL schemes. A filesystem path predicate is not browser URL resolution from every folder. |
| SF-02 / 35 | Recursive regex import set has at least seven entries; sorted modulepreload hrefs equal that set. APP-5 supplies requested-module policy. | Production source supplies the expected graph through a restricted extractor; dynamic/side-effect/other-syntax imports and actual parallel loading/timing are not established. |
| SF-03 / 52 | Recognized element IDs occur in HTML; five canvas IDs have canvas-tag text; dialog-tag text exists; no literal getElementById(' appears in script. | Same-source name joins, not DOM uniqueness, actual lookup/type results, native focus or complete element-use discovery. Count thresholds are test guards, not requirements. |
| SF-04 / 64 | Viewport content includes five exact settings including viewport-fit and zoom restrictions. | Metadata inclusion is not actual notch layout, prevented pinch/double tap or supported-device behavior. |
| SF-05 / 71 | HTML includes four literal manifest/apple-icon/install/status-bar tags. | Declaration presence is not successful home-screen install, full-screen launch, icon appearance or supported platform receipt. |
| SF-06 / 82 | Manifest names/display/orientation/start/scope equal fixed literals; two colors match six-hex grammar. APP-1 supplies launch intent. | Selected manifest policy, not native acceptance/installation/fullscreen or actual color/icon identity. |
| SF-07 / 93 | Manifest icon paths avoid leading slash; PNG header dimensions equal declared sizes, type is image/png;192/512 sizes, maskable purpose and180 apple icon are present. | No image decoding, crop/safe-area pixels, appearance, browser icon selection or complete relative-URL semantics. Header labels alone do not authenticate a valid rendered icon. |
| SF-08 / 105 | Every regex-extracted APP_SHELL entry avoids leading slash and exists except './'. | Selected list/file check, not download completion, response identity, cache ownership, serving/version policy or native offline availability. |
| SF-09 / 112 | APP_SHELL includes root/HTML/CSS/script/manifest, every current game-directory entry and each manifest icon. | Source-directory/list inclusion is not independently complete browser dependency discovery; CSS assets/dynamic refs/download results and mixed-version histories remain separate. |
| SF-10 / 119 | Script contains literal serviceWorker.register('sw.js') pattern. APP-2/APP-3 supply relative registration intent. | Not actual registration success, scope, activation, controlled page, cache operation or swallowed registration-failure behavior. |

## Traceability and verification-policy children

| Child / source line | Actual assertion and independent relation | Remaining boundary |
|---|---|---|
| QA-01 / 22 | Regex requirement list has at least40 IDs and Set cardinality equals list length. | Uniqueness for recognized rows only; not complete requirements grammar or semantic consistency. |
| QA-02 / 27 | Text-selected test lines exceed100 and none lacks a tag. | No runtime registration, generated-case coverage, skips or correctness/importance of each tagged assertion. |
| QA-03 / 33 | All extracted tags occur in extracted requirement IDs. | Name membership, not evidence that the test verifies the named requirement. |
| QA-04 / 38 | Every extracted requirement ID occurs in some extracted tag. | The title's "verified" is stronger than the asserted tag relation. Full QA-1 needs independent per-assertion expected-value and scope correspondence. No new finding classification here. |
| QA-05 / 43 | npm test string includes coverage flag/include pattern and100 line/branch/function thresholds. | Configuration text, not actual instrumentation, executed coverage, unreachable-code removal or threshold failure enforcement under all invocations. |
| QA-06 / 50 | e2e command ends with coverage script; script text includes threshold100 and metric-list pattern. | Text linkage, not complete collected Chromium execution, converter fidelity, every branch or measured threshold result. |
| QA-07 / 58 | Config text includes WebKit430x932; workflow text includes install and e2e commands. | No passing receipt, other project success, simulated/native equivalence or physical supported-device evidence. |
| QA-08 / 66 | Five compiler options true, exact game/script and worker include lists, exact typecheck command, workflow typecheck string. | Selected settings, not all "strictest" options, include resolution, actual typecheck results or every browser-loaded file. Workflow string presence does not prove execution order by itself. |
| QA-09 / 78 | Mutation glob/break100/command prefix, package command, weekly/PR workflow patterns and qualifying unit-test file inclusion match selected policy. | No mutation result, exclusion correctness, timeout/loop bounds, semantic effectiveness, complete trigger enforcement or all small wrong changes. Only source files matching the selected game-import regex are checked for command inclusion. |

## Closeout join

These children fill source-reading navigation for the four containers left unjoined in the [Phase4 matrix](5-phase-4-closeout-matrix.md). They do not certify important-assertion selection or any requirement. MP rows concern production primitives, not O8 model independence/correspondence. SV/SF rows join APP-1 to APP-5 and selected DSP-4 metadata; they do not replace browser/native/cache child obligations. QA rows join QA-1 to QA-6 at text-policy scope only.

Next exact work is independently binding each important assertion to its adopted expected relation and fixture domain, retaining actual execution receipts separately. Phase4 mixed-domain discharge and every-candidate disposition remain unmet. No Phase5-10 advancement follows from completing source-container navigation.
