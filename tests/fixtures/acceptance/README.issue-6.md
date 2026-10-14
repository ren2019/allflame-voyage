# Issue #6 offline acceptance models

These eight datasets are **artificial internal AppState models**, not copied national-client items. They use the unchanged application's existing modifier IDs, effects and connector geometry. Acquired Chinese implicit sentences come from `samples/text-library/library.json`; most are source-only PoEDB candidates. Unknown client Corner/Junction/Crossing names are not invented and no text is passed off as a real copy sample.

Each `strategy-*.json` stores a complete AppState. Each matching `.expected.json` stores its source, distinct inventory IDs, a separate complete feasible witness, expected connection count, protected placement, material requirements and example consumption/survival sets. The starting board pins only the explicitly preserved cell 0, with rotation 3; eight cells remain empty. The independent witness uses all nine instances. Browser scenarios turn the strategy on through its actual card, solve normally and select multiple candidates. The artificial witnesses are verified through public strict connectivity and the original inventory eligibility API before random solve regression. No unique optimum, ranking or arrangement is required.

| Dataset | Material composition | Witness connections | Configuration |
| --- | --- | --- | --- |
| strategy-alc | Nine unbanked sulphur charts | 8 | Original highway layout; all protection categories on |
| strategy-anchor | One Anchorfield and eight quantity fillers | 12 | Original one-Anchorfield pool cap; all protections on |
| strategy-speedrun | One Operative centre and eight quantity fillers | 12 | Centre choice `opbox`; all protections on |
| strategy-meatfish | Two Starfish, one Pantheon, two Sea Pillars, two Golden Lanterns, one possessed-rares and one no-equipment | 10 | Original layout; all protections on |
| strategy-ethereal | Four 4000-Wisp charts, three Golden Lanterns, two minimum-Magic fillers | 11 | Original layout; all protections on |
| strategy-divine-rares | One Sea Pillar, three five-Strongbox feeders, five voyage-rares | 12 | Divine border at segment 1; all protections on |
| strategy-divine-boxes | One Pelagic Abyss, three five-Strongbox feeders, five voyage-rares | 12 | Divine border at segment 1; all protections on |
| retry-insufficient | Eight charts, then the explicit ninth chart in the oracle | 12 after addition | Original `any` mode deliberately exercises the short-pool validity caveat; protections off |

The seven strategy datasets and retry are ready for **offline application acceptance**: their witnesses and eligibility have passed, as have actual browser selection and solving. This status does not claim client calibration or game execution. Material readiness is the original recommendation/warning model; position bonuses, quantities, layout penalties and centre preferences remain original soft objectives. The original pool caps, banking and protected placements are hard inventory restrictions. The UI designation additionally requires nine distinct eligible inventory instances before calling a candidate executable; solver/scoring/connectivity implementations are unchanged.

`strategy-rules.upstream.json` was captured from commit `5a717bf` before modifying strategy display strings. It retains all non-display fields, including IDs, weights, rule bonuses, connector layouts, pool limits, material counts, banking counts and flags. Tests compare the localized definitions against this baseline; it is not regenerated from current code.

`game-search.expected.json` is an independent collection of acquired candidate phrases and deliberately derived numeric header cases. Its stored source locators retain provenance/status. It exercises every existing strategy recipe, plus every mechanic in the master keeper recipe. Real single-chart locators are independently checked against both acquired copies in `samples/charted.zh-CN.txt`, including advanced crab roll text and `区域等级`. Controlled browser clipboard writes demonstrate the web page's copy order and content; actual Windows clipboard permissions and in-game matches remain field acceptance.
