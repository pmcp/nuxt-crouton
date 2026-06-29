# AGENTS.md — the portable method

This is the **stack-neutral constitution**: how we work, independent of what we build it
with. It is the **Method** layer of the harness (epic #952) — the loop, the gates, the
issue/commit discipline, the writing rules. It assumes nothing about the framework,
database, host, or UI library.

The **stack adapter** — the framework/DB/host/UI specifics and the concrete tools that
implement the gates and stages below — lives in `CLAUDE.md` (and per-area docs). When this
file says "your stack's X", `CLAUDE.md` names the actual X. A team on a different stack
keeps this file and swaps `CLAUDE.md`.

> Layers (epic #952): **Method** (this file, portable) · **Stage-profile**
> (`harness.config.mjs`, declared) · **Stack-adapter** (`CLAUDE.md`, swappable). Skills and
> agents each carry a `layer:` tag (`method`/`stage`/`stack`) — `node scripts/harness-layers.mjs`.

## Working style

Optimise for **clarity and maintainability** over ceremony. Start simple; add complexity only
when proven necessary (KISS). Prefer reuse to reinvention — check the ecosystem before building
new infrastructure. Wrap async work in error handling and return a `{ data, error }` shape.
Write **general-purpose** solutions that work for all valid inputs, not just the example in front
of you. Match the surrounding code's idiom, naming, and comment density.

## The loop

Every task runs the same loop:

```
issue-first → decompose → stage-gated work → sign-off gates → commit → observe → retro
```

1. **Issue-first (HARD GATE).** Before writing code for any new feature/initiative, open the
   tracking issue — an **epic + sub-issues** for anything multi-step. A missing issue is a
   failing build: stop and open it. The issue is the unit of work.
2. **Decompose.** Break an initiative into an epic and a tree of sub-issues, each a single
   coherent change. Agents can do this recursively (see *Decomposition pipeline*).
3. **Stage-gated work.** What gates fire depends on the work's **stage** (see *Stages*).
4. **Sign-off gates.** Before building something expensive-to-reverse, get a human to sign off
   on the *right thing* (see *Sign-off gates*).
5. **Commit.** Small, atomic, conventional commits (see *Commits*).
6. **Land via a PR**, not a direct push to the trunk; `Closes #NN` auto-closes the issue.
7. **Observe + retro.** Measure the harness itself; at epic close, run a postmortem so the loop
   tightens over time.

## Stages

"Stage" is a **declared** concept, not a folder name hardcoded across the docs. The stage model
(`harness.config.mjs`) maps each stage to its path prefixes, the gates that fire there, its
deploy target, and whether its edits are guarded. Resolve any path with
`node scripts/harness-stages.mjs <path>` (or `stageForPath`/`gateMode` from
`scripts/harness-stages.mjs`) — don't re-derive a rule from the folder name by hand.

The default profile ships three stages; rename or repoint them in that one file (the canonical
example: rename `poc` → `spike` for a scrum flow — gates travel with the stage, not the name):

- **incubator** (`poc`/`spike`) — experimental, safe-to-fail; no required gates; preview deploys.
- **launched** (`app`) — real apps; test-first is opt-in; staging deploys.
- **shared** (`package`) — code many consumers inherit; test-first required; edits are guarded.

The stage decides: whether **test-first** is `on`/`opt-in`/`off`, the default **deploy target**,
and whether **edits need approval**. Edit-guarded stages require explicit approval before a
shared-code change (the approval is scoped, granted once per initiative, never committed).

## Sign-off gates

A probabilistic runtime needs **gates + observation** where a human should decide. A gate
proposes the *right thing* and **holds** for sign-off before the expensive step:

- **Schema sign-off** — agree the **data model** before generating code from it.
- **UI sign-off** — agree the **look** (a live preview or a static mockup) before building UI.
- **Test sign-off** — agree the **test** (a committed *failing* test as the contract) before
  writing the logic that makes it green. "Done" = that test passes.
- **Code review** — review the diff for correctness and simplification.

Pick the gate by **what the change is** (data model → schema, look → UI, logic → test). All gates
share one **revision/approval loop**: hold on a `blocked` status; the **only** signal that
resumes is a **reply comment containing `lgtm`/`approve`** — not a reaction, not a label.
Anything else is a change request; iterate until approved. Be conservative — when unsure whether a
diff is in scope for a gate, don't gate.

## Issues — the unit of work

- **Search before creating.** Sessions are ephemeral; a teammate (or a past you) may already have
  opened the epic. Continue an existing one rather than duplicating.
- **Map every issue to a real component** (the package/app/area it changes), never a generic
  "root". Exactly one `type:*`; an **epic** carries `epic` instead of a type. Labels are
  source-controlled — add a new component's label when you add the component.
- **Mark in progress the moment you start** (a status label), `blocked` when waiting, and drop the
  status on close.
- **Recurring/standing chores are standalone**, never sub-issues of a deliverable epic (a
  never-closing child pins the epic open forever).

### Write issues as hypotheses (default)

Frame work as an assumption, not a task list — so we can later check whether we were right:

1. **We think that** — *if* we do X, *then* outcome Y (and Y is what we want).
2. **We'll do that by** — the work.
3. **We'll be right if** — the success conditions.
4. **We'll know by** — the signals we'll measure.

It's a lens over the sections below (open the body with a `## Hypothesis`), not a competing
heading. Trivial chores may opt out.

### Record what you *didn't* do

When a decision had genuine alternatives, write a short **Considered & rejected** note
(`option → ❌ why not`). A "why not" stops future-us re-litigating settled questions.

### Write for two audiences (issues, PRs, commits)

- **👤 For humans** (lead with this) — plain language a busy person skims in seconds: what
  changed, why it matters, what to expect. A diagram only when it makes the change *easier* to
  understand, never decoration.
- **🤖 For agents** — precise and structured: scope, exact paths/symbols, behaviour changes,
  acceptance criteria, follow-ups, links.

### How to test (required on every closeable issue/PR)

A `## 🧪 How to test` section written for someone who knows the *concept* but not the code: what
changed, where you'll see it (the concrete surface, named as a user would), numbered steps with the
before/after contrast, and any test data needed. It's the acceptance check — if a non-developer
can't follow it, it's not done.

### The epic is the verification unit

Sub-issues are the work; the **epic** verifies. When an epic's last child merges, post one
`## 🧪 Verify the whole thing` rollup (what landed · where to test · one stitched walkthrough),
**walk up the tree** (a parent epic never auto-closes), run the **postmortem**, and close the epic
only on confirmation. Human-action tasks (a sign-off, a decision, a manual run) are discrete
**assigned** issues closed by a confirming comment — never a bare comment buried elsewhere.

### Agent-posted comments lead with a provenance header

A comment an agent posts under a **human** account must disclaim it (`> 🤖 **<tool>** · interactive
agent · posted from <account> (not <human>) · _<context>_`); a comment from an unmistakable **bot**
account just names the source. Issue/PR *bodies* are already clearly agent-authored work items.

### Link issues & PRs in chat

When you mention an issue/PR to a human, render the full clickable URL — a bare `#NN` isn't
clickable. (Commit messages keep bare `(#NN)`; PR bodies use `Closes #NN` so the issue auto-closes.)

## Commits

Conventional format: `<type>(<scope>): <description>` — types `feat|fix|refactor|docs|test|chore|
perf|style`; scopes are the stack adapter's component names. Subject under ~72 chars; explain
**why**, not what. Body carries the same 👤/🤖 split. **Never** batch unrelated changes into one
commit; **never** stage indiscriminately — stage the specific files for each intent. Run the doc-sync
and the project's type/lint checks before committing.

### Merge policy — preserve curated commits

Optimise history for an **agent doing archaeology later** (`blame` a line → read its *why*; `bisect`
a regression → land on a small diff). Land a PR **preserving its commits** (merge or rebase) — do
**not** squash by default. Squash **only** when a PR's own history is noisy (`wip`, `oops`,
half-broken states). The real requirement: every commit on the trunk is atomic, green, single-concern,
and carries a real "why". One PR = one coherent change set (an epic + its sub-issues is fine).

## Decomposition pipeline (agents)

One task → a tree of issues worked by agents: an **orchestrator** reads the epic and fans it into
sub-issues; a **decomposer** recursively applies a *leaf test* (single coherent change · bounded files
· clear/testable acceptance · doable in one focused run) — leaf ⇒ spawn a **worker**, too big ⇒ split
and recurse; a **worker** implements one leaf on an isolated branch and opens a PR. Hard stop-conditions
(max depth, max children) prevent runaway. Invariants: GitHub is the source of truth; spawned agents are
**synchronous** (no fire-and-forget); hand off by **spawning**, not labeling; a block comment is a
self-contained **handoff** (a cold session resumes from it); verify an artifact exists before reporting
it done.

## Bug work — archaeology first (HARD GATE)

The moment a bug, crash, failed build, or "this used to work" is reported, step 0 is to find **how and
when it was introduced** (`git log -S`/`-G`, `blame`, `bisect`) — or rule it a non-code cause (stale
install, env, data) — and **record that finding** on the issue/PR *before* fixing. A symptom-first fix
can "repair" code that was never broken.

## Observe the harness

Treat the harness as a system worth measuring. Track its always-on context budget (size, redundancy,
and the split by layer — method/stage/stack), and reconstruct how the agent loops actually ran. At the
close of an epic, run a **postmortem** (what went well / what was hard, evidence-backed / 1–3 concrete
improvement proposals) and mint accepted proposals as their own tracked tasks. This is how the loop
tightens over time.

## Maintaining this method

When you add or change a skill, agent, or gate, keep this file and the stack adapter in sync, and keep
each skill/agent's `layer:` tag honest. This file must stay **stack-neutral** — if you find yourself
writing a framework/DB/host/UI noun here, it belongs in the stack adapter, not in the method.
