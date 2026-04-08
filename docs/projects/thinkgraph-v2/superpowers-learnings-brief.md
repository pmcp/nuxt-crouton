# Superpowers Learnings — Brief

**Date:** 2026-04-08
**Source:** [obra/superpowers](https://github.com/obra/superpowers) — agentic skills framework by Jesse Vincent (Prime Radiant)
**Read:** README, root `CLAUDE.md`, `skills/writing-skills/SKILL.md`, `skills/subagent-driven-development/SKILL.md`, `skills/brainstorming/SKILL.md`
**Scope:** What we can learn for our `.claude/` skills and agents, and specifically for ThinkGraph + Pi worker.

---

## Part 1 — General learnings for skills and agents

### The ten ideas worth stealing

1. **Skills auto-trigger; they are not slash commands.**
   Superpowers skills fire automatically when the agent recognizes a triggering condition. Our skills are mostly user-invoked (`/commit`, `/deploy`, `/audit`). Their philosophy: "Mandatory workflows, not suggestions."

2. **`description:` = "When to use" ONLY. Never summarize the workflow.**
   The single highest-leverage finding from their eval work:
   > Testing revealed that when a description summarizes the skill's workflow, Claude may follow the description instead of reading the full skill content. A description saying "code review between tasks" caused Claude to do ONE review, even though the skill's flowchart clearly showed TWO reviews.
   Our descriptions often summarize *what* the skill does. That creates a shortcut the agent takes — the body becomes documentation it skips. Rewrite as pure trigger conditions.

3. **TDD for skills (RED → GREEN → REFACTOR).**
   Run a pressure scenario with a fresh subagent *without* the skill, document verbatim rationalizations, write the skill to specifically counter them, re-test. Iron law: "No skill without a failing test first." Every line in their skills exists to plug an observed loophole, not speculation.

4. **Rationalization tables and Red Flags lists.**
   Discipline-enforcing skills include a table of every excuse agents make under pressure, paired with the counter, and a "Red Flags — STOP and Start Over" bullet list of self-check signals.

5. **Subagent-Driven Development as a real architecture, not a vague pattern.**
   - Controller reads plan ONCE, extracts task text + context, never makes the subagent re-read the file.
   - One implementer subagent per task with isolated context.
   - Two-stage review: spec compliance first, then code quality. Order matters.
   - Implementer reports one of four statuses: `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`. Each has a defined handling protocol.
   - Model selection guidance per task complexity (cheap for mechanical, capable for design).
   - Prompt templates as separate files: `implementer-prompt.md`, `spec-reviewer-prompt.md`, `code-quality-reviewer-prompt.md`.

6. **Hard gates with explicit forbidden workarounds.**
   `<HARD-GATE>` blocks with the specific rationalizations enumerated and countered ("simple project doesn't need design" → no, every project goes through this).

7. **Token discipline.**
   Word-count targets: getting-started workflows <150 words, frequently-loaded skills <200 words, other skills <500 words. Skills loaded into every conversation cost tokens forever.

8. **Cross-references without `@`.**
   `superpowers:test-driven-development` style. They forbid `@skills/...` because `@` force-loads at parse time, burning context before the skill is needed.

9. **Workflow as linear pipeline of independently-triggerable skills.**
   `brainstorming → using-git-worktrees → writing-plans → subagent-driven-development → test-driven-development → requesting-code-review → finishing-a-development-branch`
   Each skill names the next. More resilient than one mega-prompt.

10. **Verb-first gerund naming.**
    `creating-skills`, `executing-plans`, `using-git-worktrees`, `condition-based-waiting`. More discoverable when the agent searches by intent than nouns like `commit` / `deploy`.

### What NOT to copy

- The "94% PR rejection rate" framing — that's for an OSS repo with maintainers, not solo dev.
- The "your human partner" terminology — deliberate for them, would be cargo-culting.
- Their git-worktree skill — we work directly on branches and that's fine for solo work.

---

## Part 2 — ThinkGraph + Pi worker application

### What ThinkGraph already does right

ThinkGraph's dispatch architecture is closer to Superpowers' subagent-driven-development than expected:

- **`apps/thinkgraph/server/utils/dispatch-conversation.ts`** — the conversation roundup (Goal / Decisions / Constraints / Open questions / Recommended next steps) is *exactly* the structured handoff superpowers reaches for. The "rejected approaches and WHY they were rejected" line in `ROUNDUP_SYSTEM_PROMPT` is straight out of the brainstorming skill's anti-rationalization playbook.
- **`apps/thinkgraph/server/utils/dispatch-services/pi-agent.ts`** — `buildDispatchContext` + `handoffMeta` matches the "controller extracts task text and provides full context" pattern. Pi never reads the graph itself.
- **Async pickup via Yjs** — Pi has its own context, no inheritance from the dispatching session. Clean isolation guarantee.

### The gaps worth closing (ranked by ROI)

#### 1. (HIGHEST ROI) Define a four-status protocol from Pi → ThinkGraph

Today `pi-agent.ts:96-101` returns `_async: true` and walks away. Pi eventually creates child nodes; that's the only signal. Adopt the superpowers four-status contract:

```
DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
```

Add `pi-status.post.ts` accepting `{ nodeId, status, concerns?, missingContext?, blocker? }`. Update node status from this, not from the absence of work.

**Unblocks:** the CI webhook gap (`project_ci_webhook_gap.md`), two-stage review, AI-as-presence canvas indicators, re-dispatch on failure. ~50 lines of code, foundational for everything below.

#### 2. Two-stage review pipeline after Pi returns

Register two new dispatch services in `dispatch-registry.ts`:
- **`spec-reviewer`** — "Did the children Pi created answer the parent's question with the right `nodeType` and the requested `depth`?" The `depth` option in `pi-agent.ts:14-19` already encodes a spec; nothing checks Pi followed it.
- **`quality-reviewer`** — "Are the children well-formed, non-duplicate, useful?"

Order matters: spec compliance first, then quality. This is the highest-leverage *quality* improvement, after the status protocol unlocks it.

#### 3. Rewrite dispatch service descriptions as trigger conditions

`pi-agent.ts:10` currently:
> 'Send to Pi coding agent — runs on Raspberry Pi with full project context'

Rewrite as:
> 'Use when a node needs deep code investigation in the actual project repo, or when the user asks for hands-on file edits, builds, or test runs'

Same for every other service. When AI canvas participant lands and an agent has to *choose* a dispatch service, descriptions need to be triggers, not feature lists.

#### 4. Eval harness on the dispatch payload (TDD-for-skills applied to dispatch)

The roundup is already cached by message hash (`dispatch-conversation.ts:332-336`) — perfect substrate. RED-GREEN-REFACTOR cycle:
- **RED:** dispatch with deliberately weak context, document Pi's confusions verbatim.
- **GREEN:** add fields/instructions to `buildDispatchContext` or `ROUNDUP_SYSTEM_PROMPT` that pre-empt them.
- **REFACTOR:** find new failure modes, plug.

Build an empirical rationalization table for the dispatch payload.

#### 5. Hard-gate dispatch on phase approval

Per `project_phase_groups.md`, sequential phases should be disabled until previous completes. Make this structural, not UI convention:

- A node cannot dispatch to Pi until its parent phase has `status: 'approved'`.
- Approval is a user action on the phase node.
- Gate lives in `dispatch.post.ts`, not in the UI.

Protects against AI canvas participant impulsively dispatching, suggested-nodes auto-firing, accidental clicks during brainstorms.

#### 6. Pull dispatch service prompts into separate files

`ROUNDUP_SYSTEM_PROMPT` is currently inline in `dispatch-conversation.ts:264-283`. As more services land (Claude API, MCP tools, additional workers), each will want its own roundup shape. Move to `server/utils/dispatch-services/prompts/{pi-agent,spec-reviewer,quality-reviewer}.md` and import. Reviewable and testable in isolation.

#### 7. Token budget the entire dispatch payload

`CONVERSATION_TOKEN_BUDGET = 2000` is great but it's the *only* budget. The rest of `buildDispatchContext` is uncapped. Pi has its own context limits. Add hard cap on total payload + per-section budgets (graph context, parent chain, sibling context, conversation roundup). Test asserts payload stays under N tokens for known inputs.

#### 8. Give the Pi worker its own skills directory

The Pi worker is a Claude Code instance (`project_pi_agent_setup.md`). Give it `~/.claude/skills/` with auto-triggering skills:
- `creating-thinkgraph-children` — Use when receiving a thinkgraph dispatch handoff. Reads handoff metadata, formats children correctly, hits the HTTP API.
- `reporting-status-to-thinkgraph` — Use when finishing or stalling on a thinkgraph dispatch. Posts the four-status protocol.
- `respecting-depth-instructions` — Use when generating thinkgraph children. Counters Pi's natural urge to over-produce.

Each is short, trigger-only description, with rationalization counters. Pi enforces its own discipline instead of relying on a perfect prompt every time.

### The architectural unification

The brainstorm canvas vision, the dispatch system, the review loop, and node-level conversations are all the same primitive: **messages on a node from various participants**, with a controller orchestrating.

- The AI presence on the canvas IS the superpowers controller.
- It dispatches Pi for code work.
- It posts spec-compliance review results as comments on the dispatched node.
- It posts quality review results as a second comment.
- The user sees the review loop play out as messages on the node thread.
- `DONE_WITH_CONCERNS` from Pi → yellow indicator on the node, with concerns visible.

This isn't a new feature. It's seeing that several existing visions (`project_brainstorm_canvas_vision.md`, `project_node_conversations.md`, `project_ai_canvas_presence.md`, `project_phase_groups.md`) describe the same primitive at different angles.

---

## Part 3 — Concrete next actions

### For the broader `.claude/` setup

1. Audit every `description:` field in `.claude/skills/*/SKILL.md`. Rewrite as pure "Use when…" triggers, no workflow summaries. ~30 minutes, highest ROI textual change.
2. Add Red Flags + Rationalization Table to `commit`, `i18n-check`, and the package-boundary docs.
3. Measure word counts of always-loaded files (`CLAUDE.md`, frequently-loaded skills) and trim toward the targets.

### For ThinkGraph + Pi worker

1. **Define and implement the four-status protocol from Pi → ThinkGraph.** Foundational, ~50 lines, unblocks everything else.
2. Register `spec-reviewer` and `quality-reviewer` as dispatch services. Wire them after Pi returns.
3. Rewrite dispatch service descriptions as trigger conditions.
4. Build an eval harness for dispatch payloads using the existing roundup hash cache.
5. Hard-gate dispatch on phase approval in `dispatch.post.ts`.
6. Pull dispatch service prompts into separate files.
7. Token-budget the entire dispatch payload.
8. Set up Pi worker's own `~/.claude/skills/` directory with the three skills above.

---

## References

- Source repo: https://github.com/obra/superpowers
- Blog post: https://blog.fsck.com/2025/10/09/superpowers/
- Related ThinkGraph docs: `dispatch-services-audit.md`, `thinkgraph-assistant-brief.md`, `thinkgraph-convergence-brief.md`
- Related memory entries: `project_thinkgraph_v2.md`, `project_phase_groups.md`, `project_ai_canvas_presence.md`, `project_node_conversations.md`, `project_ci_webhook_gap.md`, `project_pi_agent_setup.md`, `project_pi_dispatch_setup.md`