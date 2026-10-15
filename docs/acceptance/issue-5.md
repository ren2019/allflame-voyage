# Issue #5 — 十二边界词缀选择与效果

## Scope and confirmed seams

Started from integration `5eb8360`. Implements presentation and search for the existing 64 canonical border IDs. `src/data/mods.ts`, `src/logic/scoring.ts` and `src/logic/solver.ts` are unchanged. Public `scoreBoard` and actual browser controls are the test seams already confirmed in #1 Testing Decisions; no new product test interface or artificial score UI was introduced.

`src/data/borderLocale.ts` exports `BORDER_CHOICES`, `localizedBorder(id)` and `matchesBorderQuery(id, query)`. A choice exposes canonical `id`, acquired Chinese `text`, original `englishText`, `status`, `statusLabel` and the complete original `evidence` record including sources, locators, version/date, notes and client references. Unknown IDs do not create choices. Existing English short labels and aliases remain searchable; normalized Chinese source text is searchable without changing the effect definitions.

Board controls and ModBrowser show acquired Simplified Chinese wording. Every option exposes evidence status. Source-only rows say “仅来源，待客户端校准”; the sulphur conflict says “译名冲突，待客户端核对” in both controls and the selected border tooltip, with a visible warning icon on the selected pill. Compact UI summaries omit repeated scope words and put key tiers first; they are presentation summaries, never new clipboard aliases. Selected pills truncate visually to fit the original grid, while their tooltip and opened chooser expose the entire wording and status. Selection still stores the original ID, including `b-sulphdrop` when explicitly chosen. No claim is made that its disputed wording is calibrated.

## Red → green evidence

1. Wrote the real-browser twelve-control Chinese search/select/replace/clear scenario before implementation. After installing the worktree dependencies, it failed waiting for border position 0's control, which lacked a stable position label and Chinese search wording. Implemented the border adapter and chooser. The same scenario passed (3.0s).
2. Added the real-browser source-only and sulphur-conflict disclosure scenario. It reached the original ModBrowser and failed waiting for the Chinese search placeholder. Implemented ModBrowser border wording, status, search and copy. Both browser scenarios passed (4.5s total). An earlier incorrect test button name was corrected to the actual existing `Mods` control before checking the missing Chinese ModBrowser behavior. Two accidentally overlapping red runs conflicted over Playwright trace files; sequential green runs completed cleanly.
3. Added regression acceptance for unchanged scoring through `scoreBoard`: 12 literal per-position vectors, all four corners together, direct effects, positive and negative per-connection effects, matched versus unmatched connectors, and magnitude applied to the original chart implicit. These existing algorithm behaviors passed without algorithm edits. Each Chinese selection is checked against the independent reviewed wording/ID and a literal worked score, then against the same original ID configuration.
4. Added an observable compact-label assertion so selected tiers remain distinguishable inside the original narrow grid. It failed with the full repeated-scope sentence; deriving a compact Chinese summary passed while preserving the full sentence in chooser and tooltip.

`tests/fixtures/borders/acceptance.json` and its README are the fixed offline oracle. The nine charts are an explicitly artificial model, not fabricated client samples. Expected positions and numbers are stored independently; tests neither call `borderTouches` to build expectations nor recompute expected scoring from the implementation. All 64 wording/ID pairs are checked against the separate reviewed corpus, with provenance and status preserved. Browser JSON exports additionally prove that every one of the twelve controls stores `b-pack-1`, replacement stores `b-pack-2`, clearing stores null, and the disputed sulphur option stores the unchanged `b-sulphdrop` ID.

## Verification

- `npx vitest run tests/border-acceptance.test.ts`: 83 passed.
- `npm test`: 330 passed across 16 files; border OCR regression also passed all 64 current tooltips and 12 aliases.
- `PLAYWRIGHT_PORT=4175 npm run test:browser -- tests/browser/borders.spec.ts`: 2 passed.
- `PLAYWRIGHT_PORT=4175 npm run test:browser`: all 12 existing import and new border scenarios passed.
- `npm run build`: passed. Vite reports the existing-style single-bundle size warning; the full auditable text library increases the application bundle.

## Remaining real-client evidence gaps

All 64 borders currently lack real national-client border tooltip samples: 63 are PoEDB-only reviewed candidates and one is a known wording conflict. The acquired `b-sulphdrop` sentence says “死者硫磺”, while the two real chart headers say “亡者硫磺”. This ticket retains both the source provenance and conflict; it does not silently replace the sentence or mark it confirmed. Browser and offline heuristic checks demonstrate the application's mappings and original behavior, not correctness of uncollected client text or an actual game board. Target Windows/client placement verification remains an explicitly separate field acceptance gap.
