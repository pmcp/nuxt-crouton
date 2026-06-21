---
title: PR 5 — Comment threads as Pi conversations
status: 🟡 ready for dispatch
created: 2026-04-09
parent: notion-slideover-brief.md
related:
  - notion-slideover-brief.md (PR plan, PRs 1–4 shipped)
  - notion-slideover-pr2-brief.md (ActionButton — pattern reference)
  - notion-slideover-pr4-brief.md (FileDiffBlock — most recent dispatch)
  - thinkgraph-assistant-brief.md (Step 1 — Node conversations)
  - project_node_conversations.md (memory — node-level conversations vision)
---

# PR 5 — Comment threads as Pi conversations

Fifth PR in the Notion-style slideover series. PRs 1–4 shipped a Yjs-backed
block editor where Pi can write prose, propose action buttons, open anchored
comment threads, and append inline file diffs. The comment-thread storage
and tools landed in PR 3, but the *loop* is half-built: Pi can drop comments
during a dispatch, and the human can reply via the slideout, but **the
human's reply doesn't trigger Pi to respond**. Pi only reads threads during
a fresh full-node dispatch, so a human reply just sits unread until next
time the user dispatches the whole node.

PR 5 closes that loop. A new "Reply with Pi" affordance on the comment
slideout dispatches a thread-scoped Pi session: Pi receives the conversation
so far, generates one reply via the existing `reply_to_comment` tool, and
exits. From the human's POV, comment threads become real conversations
with the assistant.

The user's hard rule from the parent brief is unchanged: **Pi proposes,
humans act**. Pi only replies when explicitly asked — there is no auto-
trigger on every human message. The user keeps the wheel.

## Why

After PR 3, threads exist but they're a one-way megaphone. Pi can leave
comments during a dispatch; humans can read them and reply; but the reply
goes nowhere. To get a Pi response, the user has to redispatch the whole
node, which:

- Spawns a fresh full-stage Pi session (analyst → builder → ...) when all
  the user wanted was a one-line follow-up
- Loses the thread context unless Pi re-reads the page
- Bills 10–100× the tokens of a focused thread reply
- Doesn't compose with the "ask Pi about this paragraph" mental model the
  text-selection composer was designed to enable

PR 5 reframes the loop:

1. Pi (or the human) opens a thread anchored to a passage
2. Human types a follow-up, hits **Reply with Pi**
3. The browser appends the human reply to the thread (existing path) AND
   posts a thread-scoped dispatch to the Pi worker
4. The worker spins up a small focused session: prompt = "you are continuing
   comment thread X on node Y; here is the full conversation; reply once via
   `reply_to_comment` then exit"
5. Pi calls `reply_to_comment` once, the message lands in the thread via
   the existing PR 3 Yjs round-trip, the slideout updates live
6. Session ends — minimal token spend, no pipeline stage juggling

The infrastructure cost is small because PR 3 already shipped the storage
(`Y.Map<CommentThread>` on the page room) and the worker tools
(`open_comment` / `reply_to_comment` / `resolve_comment`). PR 5 wires the
trigger surface and the focused dispatch path.

## What changes

| Surface | New |
|---|---|
| `apps/thinkgraph/app/components/CommentSlideout.vue` | New "Reply with Pi" button next to the existing "Reply" button. Disables while a dispatch is in flight for that thread. Shows a "Pi is thinking…" placeholder row at the bottom of the focused thread until the new message arrives over Yjs. |
| `apps/thinkgraph/app/composables/useNodeComments.ts` | Add `pendingPiThreads: Set<string>` reactive state + `markPendingPi(threadId)` / `clearPendingPi(threadId)`. Auto-clears when a new Pi-authored message lands on the thread (observed via the existing commentsMap observer). |
| `apps/thinkgraph/server/api/teams/[id]/dispatch/comment-reply.post.ts` (NEW) | Thread-scoped dispatch endpoint. Body: `{ nodeId, threadId, history }`. Validates membership, forwards to the Pi worker's `/dispatch` endpoint with a new payload shape, returns `{ accepted, reason? }`. Mirrors `dispatch/work-item.post.ts` but skips all the work-item-loading / context-building / handoff-artifacts machinery. |
| `apps/thinkgraph-worker/src/index.ts` | Extend the existing `POST /dispatch` handler to recognise a `mode: 'comment-reply'` payload. Routes to a new `startCommentReplySession` instead of `startSession`. |
| `apps/thinkgraph-worker/src/session-manager.ts` | New `startCommentReplySession(payload)` that builds a focused agent session with a thread-scoped prompt. Reuses the existing page-pool + comment-tools — Pi calls `reply_to_comment` exactly as it does today. Different session-key scheme (`${nodeId}#thread:${threadId}`) so it doesn't collide with a running full-node dispatch. |
| `apps/thinkgraph-worker/src/session-manager.ts` (cont.) | New `buildCommentReplyPrompt(payload)` private method — small focused prompt template, no stage routing. |

## What does NOT change

- The existing `/dispatch` handler payload shape stays backward-compatible.
  Comment-reply requests are distinguished by a new `mode` field; the old
  work-item path is unchanged.
- The PR 1 `output` field, the chat panel, the agent activity feed, the
  artifacts array, the dispatch / pipeline / artifacts code for full-node
  dispatches. Coexistence rule applies — full-node dispatches behave
  identically.
- The schema. No new collections. No new columns on `thinkgraph_nodes`.
  Threads continue to live in `commentsMap` on the page room.
- The PR 3 `comment-tools` worker module. Pi keeps using `reply_to_comment`
  exactly as it does today — no new tools.
- The collab room types. Reuse the existing `page` room from PR 1.
- `CommentAnchor` mark, `useNodeComments` mark sync loop, click-to-focus
  delegation. PR 3 surfaces are untouched.

---

# PR 5 brief (dispatchable)

Add a "Reply with Pi" affordance to the comment slideout and wire a thread-
scoped dispatch path through the Nitro server and Pi worker so each click
results in one focused Pi reply on that thread. No new comment storage,
no new worker tools — Pi reuses the existing `reply_to_comment` tool from
PR 3. Read PRs 2–4 briefs first if you don't have context on the existing
slideover surfaces.

## Background

After PR 4, the per-node block editor has four Pi-writable surfaces:
paragraphs, action buttons, anchored comment threads, and inline file
diffs. The thread storage is a `Y.Map<CommentThread>` on the page room
(`thinkgraph-node-${teamId}-${nodeId}`, roomType `page`), shared by the
browser slideout (`useNodeComments`) and the worker (`yjs-page-client`'s
`commentsMap`).

Pi can already open / reply to / resolve threads via the worker tools in
`apps/thinkgraph-worker/src/comment-tools.ts`. What's missing is the
*trigger*: today Pi only reads threads when the user runs a full-node
dispatch via `POST /api/teams/[id]/dispatch/work-item`, which spins up
a heavy stage-routed session (analyst / builder / reviewer / ...).

This PR adds a focused dispatch path scoped to one thread on one node.
The user clicks "Reply with Pi" on a thread, the slideout posts the human
reply (via existing `replyToComment`) AND fires a small dispatch with the
thread history baked into the payload. The worker builds a tiny prompt
("you are replying to thread X; here is the conversation; reply once and
exit") and runs a Pi session that uses the existing `reply_to_comment`
tool. No new comment surface, no new Yjs schema.

## Goal

After this PR ships:

1. The comment slideout shows a "Reply with Pi" button next to the existing
   "Reply" button on every focused thread (open threads only — resolved
   threads have neither).
2. Clicking "Reply with Pi" with a non-empty draft body:
   - Posts the human reply to the thread via the existing `replyToComment`
     path (so it lands in the thread immediately and syncs to other tabs)
   - Marks the thread as `pendingPiReply` in the slideout's local state
   - POSTs to a new server endpoint with the thread id and the full message
     history (post-human-reply state)
   - Clears the reply textarea
3. The new Nitro endpoint forwards the request to the Pi worker's existing
   `/dispatch` endpoint with `mode: 'comment-reply'` and a payload carrying
   `{ nodeId, threadId, history }`. Membership is checked via
   `resolveTeamAndCheckMembership` — same auth as work-item dispatch.
4. The worker recognises `mode: 'comment-reply'`, builds a focused prompt,
   and starts a Pi session keyed by `${nodeId}#thread:${threadId}` (not
   plain `nodeId`) so it doesn't collide with a full-node dispatch already
   running on the same node.
5. The session prompt explicitly tells Pi: "you are continuing comment
   thread X anchored to '<quote>' on node Y. Here is the conversation
   so far. Reply ONCE via `reply_to_comment(threadId='X', body='...')`
   and exit. Do not call any other tools."
6. Pi calls `reply_to_comment`, the message lands in the thread via Yjs,
   the slideout's existing observer fires, the focused thread re-renders
   with the new Pi message at the bottom.
7. The slideout's observer detects that a new `pi`-authored message landed
   on a `pendingPiReply` thread and clears the pending flag, removing the
   "Pi is thinking…" placeholder.
8. The button is disabled while `pendingPiReply` is set for that thread —
   the user can't fire two concurrent replies on the same thread.
9. Existing flows still work: full-node `dispatch/work-item` is unchanged,
   the agent activity feed still streams, action buttons / file diffs /
   text-selection comments still function.

## Files you'll touch

### Browser side

- `apps/thinkgraph/app/composables/useNodeComments.ts`
  Add reactive state for pending Pi replies — a `Set<threadId>` exposed
  as `pendingPiThreads` (shallowReactive or a `ref<Set<string>>` cloned
  on mutation, whichever pattern the rest of the file already uses for
  reactive sets). Add `markPendingPi(threadId)` and an auto-clear path
  in the existing commentsMap observer: when a thread's last message is
  authored by `'pi'` AND the thread is in `pendingPiThreads`, remove it.
  This piggybacks on the existing observer instead of timing out — the
  ground truth is "did a Pi message arrive on this thread".

- `apps/thinkgraph/app/components/CommentSlideout.vue`
  Add a "Reply with Pi" `UButton` next to the existing "Reply" button on
  the focused-thread reply form. Use icon `i-lucide-sparkles` and color
  `primary`. The button:
  - Is disabled when the textarea is empty OR when the thread is in
    `pendingPiThreads`
  - On click: calls `replyToComment(threadId, { body })` first (so the
    human's message lands in the thread), then `markPendingPi(threadId)`,
    then `$fetch('/api/teams/<teamId>/dispatch/comment-reply', {...})`.
    The thread state used for the `history` payload field is read from
    the focused thread AFTER the local `replyToComment` so Pi sees the
    human's just-typed message.
  - Wraps the fetch in try/catch — on error, calls `clearPendingPi` and
    surfaces a `useToast()` error. Don't roll back the human's reply on
    failure (it's already in the thread; the user can retry).
  - The teamId is needed for the URL — hoist it from the existing
    `provideNodeActionHandlers` registry context (PR 2 patterns) or
    pass via prop. Check what's already available; do not add a new
    `provide` if one fits.
  - When `pendingPiThreads.has(thread.id)` is true, render a small
    "Pi is thinking…" row at the bottom of the messages list (above the
    reply form), with an animated `i-lucide-loader-2` spinner and muted
    text. Use `text-xs italic text-muted` for tone.

- `apps/thinkgraph/server/api/teams/[id]/dispatch/comment-reply.post.ts` (NEW)
  Mirror the structure of `dispatch/work-item.post.ts` but skip all the
  work-item-loading / context-building / template detection / handoff-
  artifacts machinery. The endpoint:
  - Resolves team + membership via `resolveTeamAndCheckMembership` (auth)
  - Reads `{ nodeId, threadId, history }` from the body
  - Validates: nodeId is a non-empty string, threadId is a non-empty
    string, history is a non-empty array of `{ author, body, ... }` objects
  - Builds a payload for the Pi worker:
    ```ts
    {
      mode: 'comment-reply',
      nodeId,
      threadId,
      history,           // verbatim — worker formats it into the prompt
      teamId: team.id,
      teamSlug: team.slug || team.id,
      callbackUrl: <existing /dispatch/webhook URL>,
    }
    ```
  - POSTs to `${piWorkerUrl}/dispatch` with the dispatch secret, exactly
    like work-item dispatch does
  - Returns `{ accepted, error? }` to the browser
  - Does NOT update `node.status`, does NOT touch `artifacts`, does NOT
    write any handoff metadata. This is a side conversation — the node's
    canonical state is irrelevant.

### Worker side

- `apps/thinkgraph-worker/src/index.ts`
  Extend the existing `POST /dispatch` handler. Right after the `payload`
  is parsed and before the existing `workItemId/prompt` validation, branch
  on `payload.mode === 'comment-reply'`:
  - If true: validate `payload.nodeId`, `payload.threadId`, `payload.history`,
    then call `sessionManager.startCommentReplySession(payload)` and
    return 202. The session-key collision check is internal to the
    session manager (different key scheme).
  - If false: existing path, unchanged.

- `apps/thinkgraph-worker/src/session-manager.ts`
  Add a new public method `startCommentReplySession(payload)`:
  - Type the payload as a new `CommentReplyDispatchPayload` interface in
    the same file. Fields: `nodeId, threadId, history, teamId, teamSlug,
    callbackUrl?`. `history` is `Array<{ author: 'human' | 'pi', body: string,
    authorLabel?: string, createdAt?: number }>`.
  - Session lock key: `${nodeId}#thread:${threadId}`. Reject (with a log
    line) if already running. This allows a comment-reply session to run
    even while a full-node dispatch is active on the same node — the two
    use disjoint key spaces.
  - Skip the `update_workitem` tool, skip the stage routing, skip the
    pipeline-closing instructions. Build the prompt via a new
    `buildCommentReplyPrompt(payload)` private method.
  - Inject `createPageTools` + `createCommentTools` as today (the file-diff
    tools and PM tools are NOT needed but injecting them costs nothing —
    Pi just won't call them. Choose: include all of them for symmetry,
    or include only `commentTools` to constrain Pi to one tool. Recommend
    `commentTools` only — keeps the prompt cleaner).
  - On session completion, release the session-key lock.

- `apps/thinkgraph-worker/src/session-manager.ts` (cont.)
  New private method `buildCommentReplyPrompt(payload: CommentReplyDispatchPayload): string`.
  Template:
  ```
  You are Pi, replying to a comment thread on a ThinkGraph node.

  ## Context
  Node ID: {nodeId}
  Thread ID: {threadId}

  ## Conversation so far
  {formatted message history — "Human:" / "Pi:" prefixed lines, in order}

  ## Your task
  Reply to the most recent human message ONCE, calling reply_to_comment
  with threadId={threadId}. Do not call any other tools. Do not open
  new threads. Do not append blocks or file diffs. Keep your reply
  focused and conversational — this is a chat, not a deliverable. Two
  to four sentences is typical.

  After your reply lands, exit the session.
  ```
  Format the message history as: `Human: <body>` / `Pi: <body>` lines
  joined by `\n\n`. If `authorLabel` is present, use it instead of the
  default `Human` / `Pi` label.

## Files to read but not modify

- `apps/thinkgraph/server/api/teams/[id]/dispatch/work-item.post.ts` —
  pattern for the new endpoint. Note how it calls `resolveTeamAndCheck-
  Membership`, builds the Pi worker payload, posts with the dispatch
  secret, returns `{ accepted }`. Your endpoint is a simpler subset.
- `apps/thinkgraph-worker/src/index.ts` — pattern for adding a new
  branch to the existing `/dispatch` handler. Stay backward-compatible
  with the existing `workItemId/prompt` payload shape.
- `apps/thinkgraph-worker/src/session-manager.ts` `startSession` (around
  line 110) and `buildAgentPrompt` (around line 537) — patterns for
  session lifecycle and prompt construction. Your `startCommentReply-
  Session` is structurally simpler (no stage routing, no
  `update_workitem`, no callback streaming for v1).
- `apps/thinkgraph-worker/src/comment-tools.ts` — confirm the
  `reply_to_comment` tool signature is unchanged. Pi will use this exact
  tool from the new session.
- `apps/thinkgraph/app/composables/useNodeComments.ts` — read the
  existing observer + Y.Map mutation patterns before adding `pending-
  PiThreads` state. Match whatever reactive-set pattern is already there.
- `apps/thinkgraph/app/components/CommentSlideout.vue` — the focused-
  thread reply form lives in the `v-if="focusedThreadId === thread.id"`
  block. The new button slots in next to the existing Reply button.
- `notion-slideover-pr3-brief.md` ("Hard constraints") — same hard
  rules apply.

## Hard constraints

- **DO NOT modify any file under `packages/`.** The
  `.claude/.package-edit-approved` gate is enforced. The new components
  and endpoint live in `apps/thinkgraph` and `apps/thinkgraph-worker`.
- **DO NOT touch the existing `output` field, the work-item dispatch
  pipeline, the chat panel, the agent activity feed, the artifacts code,
  or PR 4's file-diff surfaces.** Coexistence with everything that
  shipped in PRs 1–4 is mandatory. Run a full-node dispatch after your
  change to verify the existing path still works end-to-end.
- **DO NOT add a new comment-storage tool to the worker.** Pi reuses
  `reply_to_comment` from PR 3. The whole point is the focused dispatch
  path, not new tool surface area.
- **DO NOT auto-trigger Pi on every human reply.** The "Reply with Pi"
  button is the explicit trigger. The plain "Reply" button continues
  to do exactly what it did in PR 3 — append the human message to the
  thread and stop. The user keeps the wheel.
- **DO NOT change the session-lock key for full-node dispatches.** Only
  the new comment-reply session uses the `#thread:` suffix. Full-node
  dispatch keys stay as plain `nodeId` so existing collision behaviour
  is preserved.
- **DO NOT bake the "Pi thinking" indicator into the Y.Map.** It's
  local UI state in the slideout. Pushing it through Yjs would mean
  remote tabs see a thinking spinner that they can't dismiss if the
  worker dies mid-session — and clutters the comment store with
  ephemeral state. Local state, observer-driven clear, is sufficient.
- **DO NOT add a new collection or schema column.** Comment-reply
  dispatches are stateless from the DB's POV — no row updates, no
  artifacts mutation. The conversation lives in the page room.
- **DO NOT use `setTimeout` / `sleep` to fix race conditions.** The
  observer-driven clear (PR 3 pattern) is the correct mechanism for
  removing the "Pi thinking" flag when the reply lands.
- **DO NOT use `git add .` or `git add -A`** — stage specific files.
- After the change, run `pnpm typecheck` from the thinkgraph app
  directory AND `pnpm typecheck` from the thinkgraph-worker directory.
  Verify no NEW errors at NEW line numbers in YOUR new files vs the
  existing baseline (the same baseline noise pattern documented in
  PR 4 brief still applies — pre-existing errors in `crouton-triage`,
  `crouton/src/module.ts`, and vue-tsc auto-imports across all apps
  are NOT yours to fix).
- Use the `/commit` skill, scope `thinkgraph`. Single commit covering
  browser + Nitro endpoint + worker changes. Same single-commit pattern
  as PRs 2, 3, 4 — the round-trip needs all three sides to land
  atomically.

## Acceptance criteria

1. From the browser, with a focused open thread that has at least one
   message, typing a reply and clicking "Reply with Pi" results in:
   - The human reply appearing immediately in the thread
   - A "Pi is thinking…" placeholder appearing below it
   - A Pi-authored reply landing within ~3–10 seconds (depending on
     model latency) and the placeholder disappearing
2. Clicking "Reply with Pi" twice in quick succession on the same thread
   only fires one dispatch — the button is disabled while pending.
3. Opening the same node in a second browser tab shows the human reply,
   the Pi reply, and (during the session) optionally the placeholder
   in the originating tab. The second tab does NOT need to see the
   placeholder — it's local UI state.
4. The dispatch is scoped: while a full-node dispatch is active on the
   same node (e.g. via the existing `dispatch/work-item` endpoint),
   "Reply with Pi" still works because the session keys don't collide.
   (Verify by manually starting a full-node dispatch in one tab and
   firing a comment reply in another. Both Pi sessions run, both write
   to the same Yjs page room without interference.)
5. If the worker is unreachable, the human reply still lands in the
   thread (the local `replyToComment` ran first), but the slideout
   surfaces a toast with the error and clears the pending flag so the
   user can retry.
6. The plain "Reply" button still works exactly as in PR 3 — appends
   a human message to the thread, no dispatch, no pending state.
7. Existing dispatch flow still works: full-node `dispatch/work-item`
   unchanged, action buttons (PR 2) still click, comment threads
   (PR 3) still open via text selection, file diffs (PR 4) still render.
8. `pnpm typecheck` from `apps/thinkgraph` shows no new errors in the
   new files. `tsc --noEmit` from `apps/thinkgraph-worker` is clean
   (zero errors — the worker has no baseline noise).
9. Single commit, scope `thinkgraph`, type `feat`, follows project
   commit conventions.

## Out of scope (do not do)

- **Auto-triggering Pi on every human reply.** Explicit button only.
- **Multi-message Pi replies on a single dispatch.** The prompt asks Pi
  to reply ONCE and exit. If the user wants a longer back-and-forth,
  they reply again. Keeps token spend bounded and the UX predictable.
- **Streaming Pi's reply token-by-token into the placeholder.** The
  reply lands as a whole message via the existing Yjs round-trip.
  Streaming is a polish item that requires routing the agent activity
  feed into the slideout — separate PR.
- **A "Pi reply with context" mode that bundles the surrounding doc
  paragraphs into the prompt.** Pi sees only the thread + the anchor
  quote in v1. Doc-aware replies are a follow-up.
- **Cross-thread reasoning** ("Pi, what's the relationship between this
  thread and the one above?"). One thread per dispatch.
- **A "Pi proactively replies to threads it sees" background poller.**
  Out of scope and arguably an antipattern — would burn tokens silently.
- **Persisting the "Pi thinking" flag across reloads.** Local state.
  If the user reloads mid-dispatch, the placeholder disappears; the
  Pi reply still lands when it lands.
- **A get_comment_thread worker tool that lets Pi pull live thread
  state.** Not needed in v1 — the dispatch payload carries the history.
  If Pi needs live state in a future iteration (e.g. to detect a third
  party replied mid-session), that's a separate PR.
- **An `update_workitem`-style status signal for comment replies.**
  Comment replies don't change node state; the node lifecycle is
  decoupled from the conversation.
- **Cancellation.** No "stop Pi mid-reply" affordance. Replies are
  short and bounded; if the user really needs to interrupt, they can
  ignore the result.
- **Resolving the thread automatically when Pi replies.** The user
  decides when a thread is done.
- **Editing or deleting messages.** Append-only, same as PR 3.

## Done means

A user can have a real conversation with Pi inside a comment thread
without leaving the slideover or running a full-node dispatch. Each
reply costs one focused Pi session. The thread storage, the Yjs sync,
and the worker tools are all reused from PR 3 — the only new pieces
are the explicit trigger button, a thin Nitro endpoint, and a focused
session entry point in the worker. Old skills, full-node dispatches,
file diffs, action buttons, and text-selection comments all keep
working unchanged.

