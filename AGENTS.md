# Project context

Read `docs/handoff.md` before planning or implementing the mainland Chinese localization. It records the intended outcome, sample requirements, and acceptance criteria.

This workspace forks `one-more-map/one-more-map.github.io`; `origin` is `ren2019/allflame-voyage-cn` and `upstream` is the original English repository. The handoff's Taiwanese implementation paths are reference material; verify them against this source tree before editing.

## Agent skills

### Issue tracker

Track issues and specs in GitHub Issues for `ren2019/allflame-voyage-cn`. Before creating, reading, or updating work items, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage roles. Before triaging or changing an issue's status, read `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout: root `GLOSSARY.md` and `docs/adr/`. Before exploring a domain or recording terms or decisions, read `docs/agents/domain.md`.

### Releases

Before completing an implementation PR or deploying a new version, follow the release-note requirements in `CONTRIBUTING.md` under `发布前检查`. Include concrete local-edition notes in the same PR as the change and verify them against the PR base or last successful deployment.
