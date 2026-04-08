# Discovery: get_workitem does not expose ancestor worktrees

**Date**: 2026-04-07
**Work item**: 03f2G7_D20Zk9-rRQWPu-
**Verdict**: ✅ Confirmed real issue. Two independent gaps reinforce it.

## Question

> Instructions say to check "ancestor context for a worktree value" but
> get_workitem output only includes the current item's fields. Is this a
> real issue?

## Answer

Yes — and there are **two** independent places where the worktree value
should be reachable but isn't:

### Gap 1 — `get_workitem` tool returns no ancestors at all

`apps/thinkgraph-worker/src/pm-tools.ts:158-188` — the tool's
description claims:

> "Get the current work item details including brief, output,
> **ancestors**, and artifacts."

…but the actual implementation returns only flat fields for the current
item:

```ts
return textResult(JSON.stringify({
  id, title, type, status, brief, output, worktree,
  skill, assignee, provider, projectId, parentId,
}))
```

No `ancestors`, no `artifacts`. The description is a lie. Verified live
during this session — calling `get_workitem` on the current node
returned exactly those keys, parentId only (no expansion).

### Gap 2 — The dispatch context chain omits `worktree`

`apps/thinkgraph/server/utils/context-builder.ts:532-553` —
`formatProgressiveContextMarkdown` is what builds the "Context chain"
block injected into every dispatched agent's system prompt. For each
ancestor entry it renders:

- `title`
- `nodeType` + `status` (as a meta line)
- `summary` (index layer) **or** `output / brief / title` (full layer)

**Worktree is never included.** I can confirm this from my own
dispatched system prompt: the parent node "Changing title of node"
appears as `(meta, waiting)` with a free-text body, but no `worktree:
…` line.

## Why merger instructions break

`apps/thinkgraph-worker/src/session-manager.ts:794` (merger stage):

> "Look in the ancestor context for a `worktree` value — that's the
> branch name (e.g., `thinkgraph/abc123`)."

There is no such value to find. A merger agent following this
instruction has two options:

1. Guess the convention `thinkgraph/<nodeId>` and probe with `git
   ls-remote` (what the parent node 's merger apparently failed at — see
   the parent retrospective: "no branch matching the work item ID …
   exists locally or on origin").
2. Signal red and stop.

Both are bad outcomes when the actual fix is small.

## Recommended fix (one of two — pick the cheapest)

### Option A — Surface worktrees in the context chain (preferred)

In `formatProgressiveContextMarkdown`, when an entry has a `worktree`
value, append a line:

```ts
if (entry.worktree) lines.push(`   worktree: \`${entry.worktree}\``)
```

This requires `NodeContextEntry` to carry `worktree` (currently it
doesn't — see the type around line 500). Add it to the entry builder
that reads from the DB row. Cheap: one field, one render line, zero new
tool calls per dispatch.

**Pro**: Every stage that already reads the context chain (analyst,
builder, reviewer, merger, launcher) automatically gains visibility.
**Con**: Slightly larger prompts, but worktree strings are ~30 chars.

### Option B — Make `get_workitem` actually return ancestors

Extend the tool to walk `parentId` and return an `ancestors: []` array
including each ancestor's `id, title, status, worktree, output`. Update
the description to match.

**Pro**: Matches the existing (lying) description; gives builders
on-demand access without bloating every prompt.
**Con**: Adds a DB walk per call; agents have to remember to call it;
analyst stage instructions would need updating to mention it.

**Recommendation**: Do **A**. The merger instruction at line 794
literally says "Look in the **ancestor context**" — that phrase
already points at the prompt context chain, not a tool call. Fixing the
context chain matches existing wording and benefits every stage.

Optionally also do **B** lite: drop the word "ancestors" from the
`get_workitem` description so it stops misrepresenting itself.

## Files to change (for the builder follow-up)

1. `apps/thinkgraph/server/utils/context-builder.ts`
   - Add `worktree?: string` to `NodeContextEntry` (around line 495).
   - Populate it in whichever function maps DB rows → entries (search
     for `nodeType:` assignments to find the builders).
   - In `formatProgressiveContextMarkdown` (line 532), append a
     `worktree:` line when present.

2. `apps/thinkgraph-worker/src/pm-tools.ts:161`
   - Either drop "ancestors" from the description, or implement the
     ancestor walk.

3. No instruction changes needed in `session-manager.ts` if Option A is
   taken — the existing wording becomes correct.

## Evidence trail

- Tool implementation: `apps/thinkgraph-worker/src/pm-tools.ts:158-188`
- Tool description claim: same file, line 161
- Context chain renderer: `apps/thinkgraph/server/utils/context-builder.ts:532-553`
- Merger instruction relying on missing data: `apps/thinkgraph-worker/src/session-manager.ts:794`
- Reviewer instruction with same dependency: same file, line 1481
- Live `get_workitem` response observed during this session: keys =
  `id, title, type, status, brief, output, worktree, skill, assignee,
  provider, projectId, parentId` — no `ancestors`, no `artifacts`.
- Own system prompt context chain: parent "Changing title of node"
  rendered without any `worktree:` line, despite the parent
  retrospective showing the merger looked for one.
