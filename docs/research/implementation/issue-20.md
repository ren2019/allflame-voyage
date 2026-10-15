# #20 compact search references

Implements https://github.com/ren2019/allflame-voyage/issues/20 under spec #21.

- Reusable `CompactCopyText` accepts a label and complete search string. ImportPanel uses it for all three existing references without changing their exact strings or candidate/reference meaning.
- Default view contains a name and 28px copy glyph. The name opens a native modal dialog with selected read-only text, manual full selection, copy and close actions. Escape closes it and native dialog restores opener focus.
- Clipboard writes are awaited. Pending is explicit; only resolution produces the success check. Rejection or missing API opens/retains the manual-copy dialog and announces failure. Row feedback remains visible after closing the dialog.
- Styles use shared semantic theme variables. No solver, reservation, persistence or deployment changes.

## Validation

TDD at the already-approved whole-page interaction seam; only the external clipboard API is substituted.

1. First browser test failed against the old three always-open inputs, then passed after compact component integration.
2. Deferred clipboard rejection failed to show fallback before failure handling, then passed after handling was added. Pending did not announce success.
3. Missing clipboard API inside the modal failed its accessible failure-state assertion, then passed after the dialog received a status region.
4. Browser tests preserve literal expectations for all three original regex strings and verify 28px icon size, keyboard modal, complete selection, focus restore, success and failure in both current themes.
5. `OFFLINE_ACCEPTANCE=1 PLAYWRIGHT_PORT=4320 npm exec -- playwright test tests/browser/compact-copy.spec.ts --grep-invert '390px'`: 4 passed.
6. `npm run build`: passed (existing Vite bundle-size advisory). `git diff --check`: passed.

A fifth 390px viewport test is retained. It exposed the existing main grid's intrinsic minimum width, putting the reference controls offscreen at x588. Ticket #19 owns the coordinated global mobile layout correction; rerun the complete five-test suite after its integration. This is an explicit pending integration check, not a passed narrow-screen claim.

Controlled API tests do not constitute Windows Edge native clipboard acceptance. That remains part of #23.
