---
name: issue-sanity-check
description: Before picking up a GitHub issue, run a deliberately pessimistic sanity check — does this issue still make sense, and should it even be done? Hunts for reasons NOT to do it (already done, obsolete, duplicate, contradicts current patterns, wrong premise, cheaper alternative, net-negative) and returns a proceed / reshape / drop verdict with evidence. Use the moment you claim or are handed an issue, before doing the work or opening sign-off gates.
allowed-tools: Bash, Read, Grep, Glob
---

# Issue Sanity-Check — should this issue even be done?

**The reflex when you pick up an issue is to start building it. This skill is the
opposite reflex: spend two minutes trying to *kill* the issue first.** An issue is
a snapshot of what someone believed at the time they wrote it — the code, the
priorities, or the premise may have moved since. Dutifully implementing a stale or
wrong-premise issue is worse than slow: it ships work that shouldn't exist, then
costs more to unwind.

So before any code, any branch, any other sign-off gate (schema / test / UI): read
the issue as a **skeptic whose job is to find the reason not to do it.** Default to
suspicion. Most issues survive — but the ones that don't are exactly the ones a
straight-to-work reflex would have wasted a whole build on.

> This is a *fast* gate (minutes, not a research project) and a *cheap* one to pass.
> It is not a license to bikeshed every ticket — it's a tripwire for the few that
> are genuinely stale, redundant, or built on a premise that no longer holds.

## When to use

- **Default / first step** the moment you claim an issue, are handed one, or a
  session opens on an existing issue — *before* doing the work or opening the
  schema/test/UI sign-off gates. It slots into the Task Execution Workflow right
  after "claim the issue".
- On ask: "should we do this?", "sanity-check this issue", "is this still worth
  doing", "gut-check #NN".
- **Skip** for a trivial, obvious, just-written chore you fully understand (a typo
  fix, a one-line doc tweak) — there's no premise to be wrong. When in doubt, run
  it; it's cheap.

## The skeptic's checklist

Read the issue (title, body, hypothesis, comments, linked issues/PRs) and the
relevant code, then try to answer **yes** to any of these. One solid yes is enough
to *not* proceed straight to building.

1. **Already done / partially done?** Has the code, a merged PR, or another issue
   already delivered this — in whole or in part? (`git log --oneline --grep`, search
   the codebase for the thing it asks for, check closed PRs/issues.)
2. **Obsolete?** Did a later decision, refactor, or `CLAUDE.md` rule overtake it?
   Does it target a file/package/pattern that no longer exists or has been replaced
   (e.g. references Pages not Workers, v3 component names, a deprecated API)?
3. **Duplicate / overlapping?** Is there another open issue or epic covering the
   same ground? Should these be merged rather than worked twice?
4. **Premise sound?** Does the issue assume something that isn't true — a bug that
   doesn't reproduce, a "users want X" with no evidence, a constraint that's been
   lifted? If the *why* is shaky, the *what* doesn't matter.
5. **Contradicts current patterns?** Does it ask for something `CLAUDE.md` or the
   established architecture explicitly steers against (Pinia, `database: true`,
   Options API, `resolveComponent` detection, prod-by-default deploys, squash-merge)?
6. **Cheaper / simpler path?** Is there an existing VueUse composable, Nuxt UI
   component, UnJS/OSS tool, or crouton package that already solves this (the
   `ecosystem-check` instinct)? Would a 10-line fix do what the issue scopes as a
   feature?
7. **Net-negative or not worth it?** Does the cost (complexity, maintenance, ripple
   across `packages/*`, risk) plausibly exceed the benefit? Is it solving a problem
   nobody actually has right now?
8. **Right altitude / scope?** Is it so big it should be an epic with sub-issues
   (route to `task-decompose`/`github-tasks`), or so vague there's no testable
   "done"? An un-scopeable issue isn't ready to build.

Spend your time where the issue is weakest — you don't need to exhaustively check
all eight. The goal is one good reason to stop, or honest confidence there isn't one.

## The verdict (REQUIRED — this is the deliverable)

End with one of three verdicts and the evidence behind it. Keep it tight.

- **✅ Proceed** — survived the skeptic. Note the one or two checks that mattered
  (e.g. "not duplicated; premise confirmed by repro") and continue to the work /
  next sign-off gate.
- **🔄 Reshape** — there's a real need but the issue as written is wrong: wrong
  scope, stale details, better approach, should-be-an-epic, overlaps another issue.
  Say what should change, then **confirm the reshape with the human before building**
  (and update the issue body / split it).
- **🛑 Drop** — it shouldn't be done: already delivered, obsolete, premise false,
  net-negative. Say why, with the evidence, and **surface it to the human** rather
  than silently closing — the call to close is theirs.

For **reshape** and **drop**, do not proceed to the work. Bring the verdict to the
human (`AskUserQuestion` if interactive, or a comment on the issue with the 🤖
provenance header) and let them decide. **Proceed** needs no permission — just note
it and carry on.

### Verdict template (copy-paste)

```markdown
## 🔎 Sanity-check — #NN

- **Verdict:** ✅ Proceed | 🔄 Reshape | 🛑 Drop
- **Why:** <the one or two checks that decided it, with evidence — a commit SHA,
  a file path, a linked issue, a CLAUDE.md rule>
- **If reshape/drop:** <what should change instead, or why it shouldn't be done>
```

A real verdict cites something concrete (a commit, a path, a rule, a linked issue).
"Seems fine" / "looks stale" is not a verdict — find the evidence or admit there
isn't any and proceed.

## How this fits the workflow

This is **step 1** of the Task Execution Workflow in `CLAUDE.md` — claim the issue,
then sanity-check it *before* Test/Schema/UI sign-off and before any code. It pairs
with:

- **`bug-archaeology`** — for *bugs*, that gate (find how/when it broke) runs first;
  this skill asks the prior question of whether the issue is worth doing at all.
- **`ecosystem-check`** — when check 6 (cheaper path) bites, that's where you
  confirm the prior art before deciding to build vs adopt.
- **`github-tasks` / `task-decompose`** — when check 8 (scope) bites, that's where
  an over-large issue becomes an epic + sub-issues.

The point is cultural, not bureaucratic: **a skeptical pause is cheaper than a
wasted build.** Run it, find the reason to stop or the confidence to go, then move.
