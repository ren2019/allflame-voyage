# Issue tracker: GitHub

Issues and specs live in `ren2019/allflame-voyage-cn` on GitHub. Use the `gh` CLI with `--repo ren2019/allflame-voyage-cn` for issue operations, so the upstream remote cannot redirect work to the original author's repository.

## Conventions

- Create one issue per implementation ticket; specs also live in issues.
- Create issues with `gh issue create --repo ren2019/allflame-voyage-cn --title "..." --body-file <path>`. Put multiline bodies in a temporary file, preserving actual newlines.
- Read an issue with `gh issue view <number> --repo ren2019/allflame-voyage-cn --json number,title,body,labels,comments`.
- List issues with `gh issue list --repo ren2019/allflame-voyage-cn --state open --json number,title,body,labels`, adding label filters as needed.
- Use `gh issue comment`, `gh issue edit --add-label` / `--remove-label`, and `gh issue close` for comments, labels, and resolution.
- Use the role strings in `triage-labels.md` for triage state.

When a skill says "publish to the issue tracker", create a GitHub issue here. When it says "fetch the relevant ticket", read the referenced issue here.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set to `yes` if external PRs should enter the triage queue later.

GitHub issues and PRs share a number space. For an ambiguous reference, try `gh pr view <number>` and fall back to `gh issue view <number>`.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`, holding Notes, Decisions-so-far, and Fog.
- Child ticket: a GitHub sub-issue of the map, labelled `wayfinder:<type>` (`research`, `prototype`, `grilling`, or `task`). Use the installed CLI's sub-issue support, or `gh api --method POST repos/ren2019/allflame-voyage-cn/issues/<parent>/sub_issues -F sub_issue_id=<child-database-id>`. If unavailable, add a task list to the map and `Part of #<map>` to each child.
- Blocking: use native issue dependencies: `gh api --method POST repos/ren2019/allflame-voyage-cn/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-database-id>`. Obtain database IDs with `gh api repos/ren2019/allflame-voyage-cn/issues/<number> --jq .id`; these are not issue numbers or node IDs. If dependencies are unavailable, use `Blocked by: #<number>` lines.
- Frontier: inspect open map children, excluding assigned tickets and tickets with open blockers. Choose the first eligible ticket in map order. Native `issue_dependencies_summary.blocked_by` counts open blockers.
- Claim: assign the ticket to the driving developer before work with `gh issue edit <number> --repo ren2019/allflame-voyage-cn --add-assignee @me`.
- Resolve: comment with the answer, close the child, and append a summary and link to the map's Decisions-so-far.

Create missing wayfinding labels when that workflow is first used.
