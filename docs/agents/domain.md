# Domain docs

## Before exploring

Read root `GLOSSARY.md` and ADRs in `docs/adr/` that concern the area being explored.

If these documents do not exist, proceed silently. Create them lazily through domain modeling when terms or decisions are resolved.

## Layout

This repository uses a single context:

- `GLOSSARY.md`: shared domain vocabulary at the repository root.
- `docs/adr/`: architectural decision records.

If a root `GLOSSARY-MAP.md` is introduced later, follow its pointers to the relevant context glossaries and check context-specific ADRs as well.

## Vocabulary and decisions

Use glossary terms in issue titles, design proposals, hypotheses, and tests. If a needed concept is missing, reconsider the terminology or record the gap for domain modeling.

Explicitly surface proposals that conflict with an existing ADR, identify that ADR, and explain why its decision should be reopened.
