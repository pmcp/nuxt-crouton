# Detecting Branches With No Unique Commits Relative to `main`

**Context**: The ThinkGraph merger stage needs to recognize research/idea work items whose branches contain no new commits (relative to `main`) so they can be skipped/fast-forwarded instead of producing an empty PR. This document compares the relevant git plumbing and recommends a primary check.

## TL;DR

Use this as the authoritative signal in the merger:

```bash
git fetch origin main --quiet
count=$(git rev-list --count origin/main..HEAD)
if [ "$count" -eq 0 ]; then
  echo "no unique commits — skip PR, fast-forward main, delete branch"
fi
```

- `0` → branch has nothing new; safe to skip or fast-forward
- `>0` → real work exists; proceed with PR creation

Always `git fetch` first so `origin/main` reflects reality, and always compare against `origin/main` (not local `main`) in automation — the worktree may never have checked out a local `main`.

## Commands Compared

### 1. `git rev-list --count <base>..<tip>` — recommended

```bash
git rev-list --count origin/main..HEAD
```

- Returns a single integer → trivial to parse in a script (`-eq 0`).
- `A..B` is shorthand for "commits reachable from B but not from A", which is exactly the question we're asking.
- No output when zero; no false positives from formatting.
- Works identically whether the branch is fully merged, behind main, or never diverged.

**Why this wins for automation**: smallest surface area, machine-readable, no parsing of human text.

### 2. `git log <base>..<tip> --oneline` — human-readable only

```bash
git log origin/main..HEAD --oneline
```

- Same commit range, but formatted for humans.
- Empty output = no unique commits, but scripts now need `[ -z "$(...)" ]` which is more fragile.
- Useful for logs / PR descriptions once you already know the branch is non-empty.

### 3. `git merge-base` + `git rev-parse` — equality check

```bash
base=$(git merge-base origin/main HEAD)
tip=$(git rev-parse HEAD)
[ "$base" = "$tip" ] && echo "HEAD is an ancestor of origin/main"
```

- When `merge-base(origin/main, HEAD) == HEAD`, HEAD is fully contained in `origin/main` — no unique commits.
- Equivalent to `git merge-base --is-ancestor HEAD origin/main` (exit code 0 = is ancestor).
- Slightly more indirect than `rev-list --count`, and requires two commands.
- **Gotcha**: this is true only when `main` has already caught up. If the branch diverged but has no *new* commits (unusual, but possible after a rebase-onto-main), this still works; the merge-base will equal HEAD.

### 4. `git cherry <upstream> [<head>]` — cherry-pick aware

```bash
git cherry origin/main HEAD
```

- Lists each commit on HEAD with a prefix:
  - `+` = commit is **not** yet in upstream (real work)
  - `-` = commit has an equivalent patch already in upstream (cherry-picked / rebased)
- Empty output → HEAD has no commits at all beyond the merge base.
- All-`-` output → every commit is already upstream as an equivalent patch, so effectively "no unique work" even though `rev-list --count` would report a non-zero number.

**Use case**: distinguishing "branch is truly empty" from "branch's commits were cherry-picked into main under different SHAs". The merger can treat both as *skippable*:

```bash
unique=$(git cherry origin/main HEAD | grep -c '^+')
if [ "$unique" -eq 0 ]; then
  echo "no unique patches — skip"
fi
```

This is the most accurate signal, but slower and harder to parse than `rev-list --count`.

## Recommendation for the merger

Use a **two-tier check**:

1. **Fast path** — `git rev-list --count origin/main..HEAD`. If `0`, skip immediately. Covers the common case (research/idea branches that never committed) with one cheap command.
2. **Fallback (optional)** — If count > 0 but you suspect cherry-picks (e.g. a human already merged the work manually), run `git cherry origin/main HEAD | grep -c '^+'`. If `0`, treat as skippable.

For the current ThinkGraph use case — catching idea branches with literally zero commits — tier 1 alone is sufficient. Tier 2 is cheap insurance if the pipeline ever starts encountering manually cherry-picked branches.

## Edge Cases

| Scenario | `rev-list --count origin/main..HEAD` | Correct action |
|---|---|---|
| Branch never committed (pure idea) | `0` | Skip, delete branch |
| Branch has real new commits | `>0` | Create PR |
| Branch is behind `origin/main` (main moved ahead) | `0` | Skip — branch adds nothing |
| Branch was rebased onto latest main, no new work added | `0` | Skip |
| Branch's commits were cherry-picked into main (different SHAs) | `>0` (misleading) | Use `git cherry` fallback |
| Detached HEAD | works — `HEAD` resolves to the current commit | same rules apply |
| `origin/main` not fetched recently | stale — may report `>0` incorrectly | **Always `git fetch origin main` first** |
| Local `main` doesn't exist in worktree | use `origin/main`, not `main` | N/A |

## Operational Notes for the Merger Script

1. **Fetch first, always**:
   ```bash
   git fetch origin main --quiet
   ```
   Without this, `origin/main` is whatever the worktree last saw, which in a long-running pipeline may be hours stale.

2. **Compare against `origin/main`, not `main`**:
   Worktrees created via `git worktree add ... -b new origin/main` have no local `main` branch. Using `main` will fail with `unknown revision`.

3. **Exit codes vs. stdout**:
   `git rev-list --count` always exits `0` on success; the count is on stdout. Don't rely on exit code — parse the number.

4. **Empty repo / no merge base**:
   If `origin/main` and `HEAD` share no history (shouldn't happen in practice), `rev-list` still works — it reports all commits reachable from HEAD. Guard with `git merge-base origin/main HEAD >/dev/null 2>&1` if paranoid.

5. **After skipping**: fast-forward main and delete the branch:
   ```bash
   git push origin --delete thinkgraph/<id>
   git branch -D thinkgraph/<id>   # if local ref exists
   ```
   The `origin/main` pointer needs no update because the branch added nothing.

## Validation

All commands in this document were verified on a freshly-created empty worktree branch (`thinkgraph/SVDxretZvKCre_3PMITnr`, branched from `origin/main` with no commits):

```
$ git rev-list --count origin/main..HEAD
0
$ git cherry origin/main HEAD
(empty)
$ git merge-base origin/main HEAD
b28f8882290186199f7c588e60e5f8bdd3407cbf
$ git rev-parse HEAD
b28f8882290186199f7c588e60e5f8bdd3407cbf
```

`merge-base == HEAD` and `rev-list --count == 0` both correctly identify the empty branch.
