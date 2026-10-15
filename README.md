# Allflame Voyage Solver

Planner + auto-solver for the **Voyage Board** in Path of Exile 3.29 *Curse of the
Allflame*. 

国服个人内网版的Mac启动/停止、固定HTTPS地址和Windows Edge证书及现场
验收步骤见 [手动内网部署](docs/local-deployment.md)。

本 fork 的日常代码在 `main`；原英文仓库通过 `upstream` 保留为上游。
后续更新请按 [同步上游](docs/upstream-sync.md) 合并，保留国服改动和提交历史。
GitHub Pages 仅允许手动触发，合并 `main` 不自动发布公网。

## Features

- 3×3 Voyage Board with the 12 border-modifier segments (corners get 2, edges 1, center 0)
- Chart library with per-chart editor (name, level, voyage mod, connector edges)
- Paste-importer for Ctrl+C chart item text (format is a guess until launch - unmatched
  mod lines are kept as raw text, nothing is lost)
- Live score panel with per-stat bonus breakdown and connector validity check
- Auto-solver: exhaustive (optimal) for pools ≤ 9 charts without rotation, hill-climbing
  with restarts otherwise; configurable reward weights and connector rule
- Independent Divine, Meatfish and Magic Ethereal keeper protections for Alc & Go and
  Speedrun Strongboxes, so imported charts can be used when a protection is switched off
- Share layouts via URL, autosave to localStorage, JSON export/import
