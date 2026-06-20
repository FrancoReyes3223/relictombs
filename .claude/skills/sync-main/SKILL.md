---
name: sync-main
description: Fast-forward main to match staging. Aborts if diverged. Never force-pushes.
---

Fast-forward `main` to match `staging`. Aborts if main has commits not in staging (diverged). Never force-pushes.

## Steps

1. Check for divergence: run `git log --oneline staging..main` — if there are any commits, abort with a clear message listing them.
2. Check if already in sync: run `git log --oneline main..staging` — if empty, report "main is already up to date with staging" and stop.
3. Run `git checkout main`
4. Run `git merge --ff-only staging` — if this fails for any reason, report the error and abort.
5. Run `git checkout staging` to return to original branch.
6. Report how many commits were fast-forwarded and the new HEAD.

## Safety rules

- **Never** use `git push --force` or any force variant.
- If `--ff-only` fails, do not attempt a regular merge or rebase. Just report the error.
- Always return to `staging` after the operation (even if it fails).
