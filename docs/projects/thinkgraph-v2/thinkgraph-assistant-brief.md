# ThinkGraph Assistant — Brief

**Date:** 2026-04-04
**Status:** Draft
**Builds on:** [ThinkGraph v2 brief](brief.md), [Convergence brief](thinkgraph-convergence-brief.md)
**Research inputs:** Honcho (Plastic Labs), Mem0, Letta — agent memory systems

---

## One-liner

The assistant is a peer on the canvas that thinks with you, not a sidebar that answers questions.

---

## What This Is

A brief for the ThinkGraph assistant — the AI identity that lives on the canvas, participates in conversations per node, reasons over the graph, and dispatches work. This is not a chatbot bolted onto a graph UI. It's a collaborator with its own presence, memory, and judgment.

The v2 brief describes *what* ThinkGraph does. This brief describes *who* the assistant is and how it interacts.

---

## Core Concept: The Assistant as Graph Peer

The assistant is not a tool you invoke. It's a participant in the graph with its own identity.

| Property | Description |
|----------|-------------|
| **Identity** | Named presence ("Pi") with avatar, visible in Yjs user list |
| **Presence** | Own cursor on the canvas. Moves to the node it's working on. "Pi is looking at 'auth middleware'..." |
| **Memory** | The graph IS its memory. Every node, brief, output, conversation, and connection is context it can reason over |
| **Agency** | Can create nodes, leave comments, start conversations, suggest connections — within bounds you set |
| **Conversations** | Talks per-node, not per-project. Each node has its own chat thread |

### Why "peer" matters

Most AI assistants are request-response: you ask, it answers, context resets. The assistant is different because:

1. **It helped build the graph** — it expanded nodes, synthesized briefs, ran research. It has history with the work.
2. **It can see the whole graph** — not just the current node, but ancestors, siblings, connections, and patterns across branches.
3. **It reasons, not just retrieves** — "What's the riskiest assumption in this branch?" requires synthesis, not keyword search.

This is the insight from Honcho's "dialectic" model: the value isn't in storing facts about the user — it's in reasoning over structured knowledge that both human and AI built together.

---

## The Three Modes

### 1. Conversation (per-node chat)

Each node has its own chat thread embedded in the detail panel. This is the primary interaction surface.

**What it replaces:** The current project-level assistant that's disconnected from individual nodes.

**Why it matters:** The conversation where you narrowed scope, made decisions, and ruled things out is the most valuable context for execution. A brief is a lossy summary. The conversation is the full signal.

**How it works:**
- Open a node's detail panel → chat is right there, below the brief
- Messages are stored per-node (new `node_messages` relation or artifacts)
- The assistant sees: this node's content + conversation + ancestor chain + connected nodes
- When the node dispatches to Pi, the full conversation goes as context
- Conversations persist — pick up where you left off days later

**Interaction examples:**
- Select a node → "What's unclear about this brief?" → assistant identifies gaps
- "Compare this approach to the one in [sibling node]" → assistant reads both, reasons
- "Ready to dispatch?" → assistant pre-checks: brief clarity, context completeness, potential conflicts

### 2. Dialectic (ask the graph)

Natural language queries against the entire graph. Not keyword search — reasoning.

**What it enables:** Questions that require synthesis across nodes, branches, and history.

**How it works:**
- Triggered from canvas (no node selected) or from a node ("in the context of this node, ...")
- Assembles context using progressive disclosure (index → expanded → full)
- For Phase 2B (semantic search): also retrieves by vector similarity
- Answers with reasoning, not just retrieval — can form hypotheses, identify contradictions, surface patterns

**Graduated intensity** (inspired by Honcho):

| Level | When | Cost | Example |
|-------|------|------|---------|
| **Quick** | Direct fact lookup | Haiku | "What's the status of auth work?" |
| **Standard** | Cross-node reasoning | Sonnet | "What are the dependencies between these three features?" |
| **Deep** | Full graph synthesis | Opus | "What's our biggest technical risk right now?" |

Auto-selects level based on query complexity by default. User can override.

**Examples:**
- "What decisions have we made about auth?" → scans all nodes mentioning auth, synthesizes
- "Find contradictions" → compares briefs across branches for conflicting assumptions
- "What's blocking the most work?" → traces dependency chains, identifies bottlenecks
- "Summarize this week's progress" → reads recent node status changes, generates narrative

### 3. Canvas Actions (visible agency)

The assistant takes actions on the canvas that you can see happening in real-time.

**What it looks like:**
- Pi's cursor moves to a node → brief appears → connected nodes light up → new node created
- During expand: cursor moves through the branch, annotations appear on cards
- During brainstorm: assistant creates question nodes in response to your ideas

**Bounded agency:**
- Creates nodes: yes (idea, research templates)
- Modifies existing briefs: only with conversation context (you discussed it)
- Dispatches pipeline: never without explicit "go"
- Deletes nodes: never
- Suggests connections: yes (dashed preview edges, you confirm)

---

## Infrastructure (what exists vs. what's needed)

### Already built
- **Yjs presence** — CroutonFlow has cursors, user list, CollabRoom Durable Object
- **Context assembly** — 3 scopes, progressive disclosure, 12K token budget
- **MCP tools** — 8 tools for graph manipulation
- **Pi dispatch** — HTTP dispatch to worker via `pi-api.pmcp.dev`
- **Search** — `search-graph` MCP tool (keyword-based today)

### Needed for conversations (Mode 1)
- `node_messages` storage (D1 table or collection)
- Chat UI in node detail panel
- Context builder includes conversation when dispatching
- Message-aware MCP tool or extend `get-thinking-path`

### Needed for dialectic (Mode 2)
- Semantic search via Vectorize (convergence brief Phase 2B)
- Dialectic endpoint: `POST /api/teams/[id]/thinkgraph/ask`
- Intensity auto-selector (query complexity → model choice)
- Response includes source node references (clickable)

### Needed for canvas actions (Mode 3)
- Pi worker connects to Yjs room as WebSocket client
- Cursor/selection state synced via awareness protocol
- Action queue: assistant announces intent before executing
- Activity feed: log of what the assistant did and why

---

## What We Take From the Research

| Source | Concept | How we use it |
|--------|---------|---------------|
| **Honcho** | Dialectic — reasoning over knowledge, not just retrieval | Mode 2: graduated intensity, ask-the-graph |
| **Honcho** | Peer paradigm — agents are first-class entities | The assistant has identity, history, presence |
| **Honcho** | Background "dreaming" — async reflection | Post-expand reflection step: re-read branch, suggest cross-connections |
| **Honcho** | Representations — living summaries that evolve | `get-digest` becomes a persistent, auto-updating summary node |
| **Mem0** | Structured memory scopes (user/session/agent) | Already have this: project/branch/node context scopes |
| **Letta** | Agent self-edits memory via tool calls | Assistant updates node briefs/status through MCP tools it already has |

### What we explicitly don't take
- **External memory service** — the graph is the memory. No Honcho/Mem0 dependency.
- **Generic user modeling** — we don't need to "learn about the user." We need to reason about the work.
- **Separate vector store for memory** — Vectorize for semantic search (Phase 2B) serves this purpose natively.

---

## Build Sequence

This is additive to the convergence brief phases, not a replacement.

### Step 1: Node conversations
**Prereq:** None (can start now)
- Add `node_messages` table
- Chat UI in detail panel
- Include conversation in dispatch context
- This alone is the highest-leverage change

### Step 2: Ask the graph
**Prereq:** Convergence Phase 2B (semantic search)
- Dialectic endpoint with graduated intensity
- Source references in responses
- Canvas-level query UI (command palette or floating input)

### Step 3: Canvas presence
**Prereq:** Node conversations + Yjs infrastructure review
- Pi worker joins Yjs room
- Cursor movements during expand/dispatch
- Activity feed
- Suggested connections (dashed edges)

### Step 4: Background reflection
**Prereq:** Ask the graph + pipeline formalization (Convergence Phase 2C)
- Post-expand analysis: "here's what I notice about this branch"
- Cross-branch pattern detection
- Auto-updating digest nodes

---

## Key Decisions (make before building)

1. **Message storage** — new D1 table `thinkgraph_node_messages` vs. store in `artifacts` JSON? Table is cleaner, artifacts is zero-migration.
2. **Conversation in dispatch** — full history or AI-compressed summary? Full is more context but costs tokens. Suggest: compress if >20 messages.
3. **Dialectic endpoint** — standalone route or extend existing MCP `search-graph`? Suggest: new endpoint, search-graph stays for simple lookups.
4. **Canvas presence scope** — always connected to Yjs, or only when actively working on a node? Always-on feels alive but costs a WebSocket connection.
5. **Agency boundaries** — can the assistant create nodes unprompted (e.g., "I noticed a gap")? Suggest: yes, but as "suggested" nodes (dashed border, user confirms).

---

## Success Criteria

1. You open a node and continue yesterday's conversation — context is preserved
2. You ask "what's risky about this plan?" and get an answer that references nodes across three branches
3. You see Pi's cursor move to a node during dispatch — it feels like someone is working
4. The assistant suggests a connection you didn't see — and it's right
5. A brainstorm session flows: you throw ideas, the assistant asks clarifying questions, research nodes spawn automatically
6. You never have to re-explain context the assistant already has