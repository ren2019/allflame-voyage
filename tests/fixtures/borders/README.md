# Offline border oracle

`acceptance.json` is a deliberately artificial public scoring fixture, not a collection of client tooltips. It uses nine distinct chart instances with all four connectors, no intrinsic effects except the explicitly specified `voy-pack-1` on the top-left chart in the magnitude case. Header rewards are absent.

The position vectors are literals from #1's accepted contract: 0–11 touch cells 0,1,2,2,5,8,6,7,8,0,3,6. They do not call `borderTouches` or rebuild that mapping. Four corners receive two borders, four edges receive one, and the centre none.

Expected score units use weight 1: direct pack size is 0.16; two matched top-left connections give rare count 1.00 and quantity 0.20 (120% less two 50% reductions). Magnitude increases the sole chart's 5% voyage implicit to 7%, which reaches all nine areas and totals 0.63. All-border pack size is 1.92. These are independent worked examples recorded as literals, not calculations performed by the tests. The numbers describe the existing tool's heuristic, not a new statement about game mechanics.

Wording comes from the independently reviewed `samples/text-library/mappings.reviewed.json` and acquired `library.json` records. The CN/US Maiden Voyage snapshots and their exact locators, hashes, date and visible version are preserved there. `b-sulphdrop` remains a documented conflict (`死者硫磺` vs the real chart header `亡者硫磺`). All 64 borders still lack a real client border corpus. No network is needed for this oracle or its tests.
