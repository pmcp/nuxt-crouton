# ThinkGraph — Vision Brief

## One-liner

Multi-project control panel for crouton apps. AI builds, you steer.

---

## The core model

ThinkGraph is a **coordination layer between humans and AI**, structured as a graph of discrete units of work.

The fundamental primitive is the **node** — not the conversation, not the terminal session.
Each node represents a concrete step in building a crouton app. What you see on the canvas is **work flowing through a pipeline**, not chat history.

ThinkGraph doesn't do the work. It dispatches, tracks, and routes. The skill chain (`/discover → /architect → /generate → /compose → /deploy`) is the engine. ThinkGraph is the dashboard.

---

## What a node is

Every node has three parts:

| Part | Description |
|---|---|
| **Brief** | What needs to happen. The input — written by you, proposed by AI, or inherited from a parent. |
| **Output** | What was produced. A schema, generated code, a deployed URL, a review decision. |
| **Assignee + Provider** | Who's responsible and what tool executes it. |

A node is **done** when it has an output. The next node in the chain auto-queues.

---

## Assignee vs Provider

| Concept | What it means | Examples |
|---|---|---|
| **Assignee** | Who is responsible | `pi`, `human`, `client` |
| **Provider** | What tool executes | `codex`, `claude-code`, `flux`, `openai`, `anthropic` |

One node assigned to Pi could use Codex or Claude Code. One assigned to `human` has no provider — it waits for you. This separation lets you compare providers on the same brief.

---

## Node types

6 types, mapped to the crouton skill chain:

| Type | Skill | Purpose | Typical assignee |
|---|---|---|---|
| **discover** | `/discover` | Understand client needs | human or pi |
| **architect** | `/architect` | Design schemas, data model, packages | pi |
| **generate** | `/generate` | Run CLI, generate collections, write code | pi |
| **compose** | `/compose` | Build pages, wire components, apply theme | pi |
| **review** | — | Review output, give feedback | human or client |
| **deploy** | — | Deploy to Cloudflare | pi |

---

## Status lifecycle

```
queued → active → done
              ↘ waiting (needs input from someone else)
              ↘ blocked (something is wrong)
```

5 statuses. Simple.

---

## Planning pass

When a new project lands, ThinkGraph can propose a work breakdown:

1. AI reads the project brief
2. Proposes a task breakdown as **draft** child nodes
3. You review, reshape, approve
4. Approved nodes solidify and are ready for dispatch

The AI proposes, the human decides.

---

## Context chain

Each dispatched node receives context from its ancestors via their **outputs** — not raw session logs.

When you dispatch node C, it gets:
- The project brief
- Node A's output (e.g. schema from architect)
- Node B's output (e.g. generated code from generate)
- Node C's own brief

Context travels as structured outputs, keeping token usage bounded.

**Open consideration:** For long chains (10+ nodes), accumulated context may need summarisation. A dedicated summarisation node could compress the ancestor chain. Not needed for v1 — revisit when chains get deep.

---

## Multi-AI patterns

The graph structure naturally supports multiple providers:

- **Comparison**: Two sibling nodes, same brief, different providers (Codex vs Claude Code). Review node picks the winner.
- **Mixed pipeline**: Architect (Pi/Codex) → Generate (Pi/Codex) → Brand assets (Flux) → Deploy (Pi). Each node uses the right tool.
- **Independent review**: After Pi completes, spawn a review node targeting a different AI for a second opinion before human review.

No special architecture needed — these emerge from the node model.

---

## Visual language

Node status is visible on the canvas without opening anything. Follow Nuxt UI patterns and tokens:

| Status | Visual |
|---|---|
| Active | Subtle pulse animation |
| Waiting | Warning color accent |
| Done | Success color, solid |
| Blocked | Error color accent |
| Draft/Queued | Muted, reduced opacity |

When a node is selected, its context chain highlights — ancestor nodes illuminate, non-context nodes dim.

---

## Open questions

1. **Cost visibility** — Token counter per node and per project run. Important for agency economics.
2. **Context depth** — When to auto-trigger summarisation on deep ancestor chains.
3. **Planning pass triggers** — Does every new project get an AI-proposed breakdown, or only on request?
