# Spec21 final review and fixes

Original review fixed point: `aeb688de517947a75e81ae29c9dad10d58c6636a`; reviewed integration: `94e5e3327c0043a40ccb907b78b126129daaf224`. The original Standards and Spec reports below are preserved verbatim. Follow-up reports review immutable runtime/test commit `fd428e9c37cedc3b20c68e5540ba5b37a4ff04a0`.

## Standards

Standards review: `aeb688de517947a75e81ae29c9dad10d58c6636a...94e5e33`.

Documented violations: none found. Read all seven supplied standards sources; `docs/adr/` does not exist. The approved scope-resolution extraction supersedes the older localization-only restriction on scoring edits. Canonical modifier IDs remain stable; additions stay client-side. Reviewed product components/logic/styles, versioned rule data, changed regression tests, shared integrated browser flow, isolated candidate server, deployment guard and Windows/native diagnostics helpers. Tooling-enforced whitespace is omitted.

Baseline judgement call (nonblocking): **Duplicated Code**, `src/logic/voyageHistory.ts:31–52`. Both `currentScoringContext` and `scoringContextKey` independently normalize weights with `Object.fromEntries(Object.entries(...).sort(...))` and disabled IDs with `[...new Set(...)].sort()`. The current implementation works, but future normalization changes require edits in both paths and can make freshly captured contexts differ from restored comparison keys. Extract one context-normalization function, use it when constructing a context and before serialization, and retain the existing key-order/duplicate-ID public-boundary checks. This is a small maintenance suggestion, not a repository-rule violation or a correctness blocker.

No other actionable baseline smells identified. Independent literal test expectations are intentional oracles, and explicit rule-table repetition preserves the approved editable configuration.

Acceptance boundary: this review does not complete #23. Final-candidate Windows native clipboard checks and cleanup confirmation remain pending under the documented clipboard/SSH blocker. #24 remains an open human game checkpoint. No deployment or main merge was performed or approved by this review.

## Spec

Spec review at integrated HEAD `94e5e33`, against fixed point `aeb688de517947a75e81ae29c9dad10d58c6636a`.

1. **[P2] Scoring exclusions erase actual regional encounters.** `src/logic/regionTargets.ts:121` and `:140` skip voyage and border effects listed in `disabledMods`. However, the existing control explicitly promises only “取消勾选后，该词缀不再参与评分” (`src/components/ModBrowser.tsx:71`). Disabling a score contribution does not remove that effect from the imported chart or the game. This violates #21 §4: “目标存在性来自目的地和实际作用范围，不能由当前策略或得分高低凭空制造。非数值遭遇不能因评分模型未计分而自动视为不存在。”

   Reproduction: fill nine owned charts with valid four-way connections; give the center chart `voy-jelly` and the first border `b-divine`. With both enabled, target projection shows friendly jellyfish in all nine regions and the divine-drop reminder in region 1. Exclude these two effects from scoring through the modifier browser: every target disappears, despite unchanged charts, borders, connections and strategy. Executed the projection directly with the same inputs and confirmed `[rare-divine,friendly-jellyfish] / [friendly-jellyfish]…` becomes nine empty target lists. Keep score exclusions in scoring/history context, but derive encounter existence and regional border conditions from actual effects. The current “禁用不参与” regression test encodes the faulty behavior and should be updated.

No further concrete spec defects found in the reviewed theme/calibration, keeper/compact-copy, border-affinity, history, comparison and integration changes. Windows Edge native clipboard acceptance (#23) remains pending, and real game acceptance (#24) remains human-owned and open; neither is treated as passed or as an implementation defect here. This review does not authorize deployment or merging.

## Fixes and red–green evidence

- Actual chart/border effects now determine encounter existence regardless of score-only exclusions. The pure approved rule boundary first failed with nine missing jellyfish, then passed 15/15. The new literal assertions retain the recipient's divine 100 / strongbox 98 / jellyfish 10, exact sources and supplier/recipient scope. Logs: [RED](review/target-red.log), [GREEN](review/target-green.log). The earlier incorrect “禁用不参与” expectation was removed.
- A derived nine-chart whole-page fixture uses real import, modifier controls, displayed scoring, target details and export. Disabling jellyfish/boxes changes 14.4 to 12.0; disabling divine changes it to 0.0. All original target names and priorities remain, including nine jellyfish and exact border/supplier details; exported state changes only disabled IDs. Against the old target projection the browser test fails with 0 instead of 9 jellyfish. Restoring the fix passes all four regional browser tests. Logs: [old-runtime sensitivity RED](review/browser-red.log), [GREEN](review/browser-green.log). Derived examples are not game field evidence.
- One private normalization function now serves context capture and serialized keys. Existing boundary checks remain; a literal stored JSON-key test adds duplicate-ID and unordered-weight compatibility coverage. It passed before extraction (5 history tests), then 5 history + 18 comparison tests passed afterward. Logs: [before](review/history-before.log), [after](review/history-after.log). No scoring version or stored key bytes changed.
- `diagnostics/os-first-ssh-failure.log` was normalized CRLF → LF only; the diagnostic body/facts are unchanged. `git diff --check aeb688d...HEAD` passes.

## Current full execution and remaining gates

Clean source `fd428e9c37cedc3b20c68e5540ba5b37a4ff04a0` ran `OFFLINE_ACCEPTANCE=1 PLAYWRIGHT_PORT=4392 npm run verify`: all six execution stages passed (536 unit tests, 64 OCR tooltips + 12 aliases, text-library audit, 5 deployment tests, production build and 68 offline browser tests). Build: 64 files, SHA-256 `f43c9f9ea4f2921000a3ec456229d6da465cfa417cecb5ad2f8ce0188fb5ac2d`. Exact archive: `/tmp/allflame-implement-21/spec21-candidate-fd428e9/dist`.

**The aggregate command exited 1.** After all six stages passed, the unchanged legacy localization ledger rejected `src/logic/scoring.ts`'s byte hash. This is the approved #21 shared-scope extraction from `4441d10`; the old ledger expects the original file structure. Its only recorded issue is `Core algorithm changed: src/logic/scoring.ts`. No hash was silently updated and no broad rerun was made. Raw [stages](automated/stages.json), [coverage gate](automated/coverage.json) and [full log](automated/full-verify.log) preserve the failure. The 27 legacy group matches do not establish this specification or current Windows acceptance; the executed Spec21 coverage is mapped below.

| Spec21 behavior | Executed evidence in current full run |
| --- | --- |
| Normal shell, theme and calibration controls; desktop/390px | `chinese-shell`, `theme`, `calibration`, `calibration-mode` browser suites |
| Encounter scope, actual effects despite scoring exclusions, grouping, thresholds and details | `region-targets` browser suite (4 tests), `regionTargets` rule suite (15 tests) |
| Per-strategy complete keeper strings and compact clipboard pending/success/failure | `keeper-assistant`, `compact-copy` browser suites; `keeperAssistant` rule suite |
| Twelve-border independent score and required boundary | `border-affinity` browser suite; `borderAffinity` rule suite |
| Completion, retention/consumption, restore, duplicate-event protection | `voyage-history`, `spec21-integration`, `planning-cycle` browser suites; `voyage-history` unit suite |
| Personal historical comparison and canonical score context | `voyage-comparison` browser/unit suites; `voyage-history` unit suite |
| Existing parser, solver, scoring and material protection outcomes | Full unit report; seven-strategy `solve`, `filler-candidates`, `planning-cycle` browser suites |

Current report source/build is [candidate.json](candidate.json); raw unit/browser reports and all logs are under `automated/`. **Native acceptance is NOT RUN for this new source/build**, #23 remains open, and #24 game fieldwork remains pending. Older native failure/screenshots retain product `d2e835c` ownership in [windows/README.md](windows/README.md). No production/server or Windows configuration was changed.

## Standards follow-up

Standards follow-up: immutable delta `94e5e33..fd428e9c37cedc3b20c68e5540ba5b37a4ff04a0`.

The reported nonblocking Duplicated Code issue is resolved. `src/logic/voyageHistory.ts` now defines one private `normalizeScoringContext`; both capture and key serialization call it. The extraction retains the previous property order, weight-key sorting with the same comparator, disabled-ID deduplication and sorting, and all context fields. Therefore existing serialized context keys remain compatible. No scoring/version migration is needed. The added public-boundary regression checks an independently specified exact JSON key, including unordered weights and duplicate disabled IDs.

Inspected the remaining runtime/test delta: regional encounters now survive scoring exclusions; the new rule and browser regressions distinguish actual target presence/source from score changes. This introduces no documented standards violations or actionable baseline smells. The diagnostics line-ending normalization is tooling-enforced and omitted from findings.

Targeted verification on frozen worktree HEAD `fd428e9c37cedc3b20c68e5540ba5b37a4ff04a0`: `npm exec -- vitest run tests/voyage-history.test.ts tests/voyage-comparison.test.ts src/logic/regionTargets.test.ts` — 3 files, 38 tests passed. Browser regression execution belongs to the root's ongoing full verification; this follow-up does not claim it ran.

No remaining Standards findings in this delta. Original review report is preserved. #23 native Windows acceptance remains pending, as does #24 human game acceptance. No deployment or main merge occurred.

## Spec follow-up

Follow-up Spec review of `94e5e33..fd428e9c37cedc3b20c68e5540ba5b37a4ff04a0`, using the frozen review-fixes worktree.

**Original P2 resolved. No new actionable defects found in this delta.**

The target projection no longer filters chart or border effects through score-only `disabledMods`. Shared connection geometry, actual effects, sources, grouping and regional border priority remain intact. This satisfies #21 §4: “目标存在性来自目的地和实际作用范围…非数值遭遇不能因评分模型未计分而自动视为不存在。” Scoring and history comparability continue to honor their exclusions.

Independent verification: executed a nine-chart projection containing a central adjacent-box/jellyfish supplier and a divine border. Compared the complete projection (including sources and weights) before and after successively excluding these effects from scoring: all projections remained identical, jellyfish appeared in all nine regions, the recipient retained divine 100 / strongbox 98 / jellyfish 10, and input planning data remained unchanged. The original scorer independently changed from 14.4 to 12 to 0.

Also inspected the scoring-context normalization refactor: canonical field order, sorted weights and sorted/deduplicated disabled IDs preserve existing context-key bytes. Ran the two focused suites at the exact reviewed commit: regional targets 15/15 and voyage history 5/5 passed.

Scope: this follow-up checks the original reported defect and subsequent code delta. It does not supersede full integration evidence. Native Windows Edge clipboard acceptance (#23) remains pending; real game acceptance (#24) remains unperformed. No deployment or merge authorization is implied.
