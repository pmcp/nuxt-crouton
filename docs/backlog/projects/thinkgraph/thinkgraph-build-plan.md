# ThinkGraph — Build Plan

## One-liner

Your thinking belongs to you. Branch, explore, and merge ideas across any AI.

---

## The Problem

When working with AI on complex problems:

1. **Context pollution** — Conversations get messy. You go too far down one path and can't get back cleanly. You'd want to "save your place" and try another direction without losing the original.

2. **Ideas get lost** — You say "not now" to a v2 idea and it disappears forever. There's no structured way to park future ideas while staying focused on v1.

3. **Thinking is trapped** — Your insights are locked in ChatGPT's history, or Claude's, or scattered across both. No portability.

4. **Starting over** — When you revisit an old project, you start from zero. The reasoning that led to decisions is gone.

5. **No cross-AI workflow** — You might want Claude for deep analysis, Gemini for creative divergence, Cursor for prototyping. But they don't share context.

---

## The Solution

A **visual thinking graph** where:

- Every insight/decision is a **node**
- Nodes connect in a **tree structure** (parent → children)
- You can **branch** to explore different directions
- You can **star** valuable insights
- You can **park** future ideas (v2/v3) without losing them
- You can **generate portable context** from any selection
- **Any AI** can read the graph and continue
- **Multiple entry points**: auto-capture where possible, paste fallback where not

---

## Key Resources

### nuxt-crouton (the framework we're building on)

- **GitHub**: https://github.com/pmcp/nuxt-crouton
- **Docs**: https://github.com/pmcp/crouton-docs (or https://crouton-docs.vercel.app)
- **What it is**: Nuxt 3 layers for instant CRUD functionality
- **Key packages**:
  - `@fyit/crouton` — base CRUD layer
  - `@fyit/crouton-collection-generator` — CLI to scaffold collections

### llm CLI (Simon Willison's tool)

- **GitHub**: https://github.com/simonw/llm
- **Docs**: https://llm.datasette.io/en/stable/
- **What it is**: CLI tool to talk to any LLM (Claude, GPT, Gemini, local models)
- **Why it matters**:
  - Auto-logs all prompts/responses to SQLite
  - Plugin system for different AI providers
  - Tool/function support — AI can call your code
  - Conversation continuity with `llm -c`
- **Install**: `pip install llm` or `brew install llm`
- **Example**:
  ```bash
  llm keys set anthropic  # paste API key
  llm -m claude-4-opus "Explore auth patterns"
  llm -c "Go deeper on OAuth"  # continues conversation
  ```

### Vue-flow (graph visualization)

- **Docs**: https://vueflow.dev/
- **What it is**: Vue 3 component for node-based graph UIs
- **Install**: `npm install @vue-flow/core`

### Yjs (real-time sync)

- **Docs**: https://docs.yjs.dev/
- **What it is**: CRDT-based real-time collaboration
- **Why it matters**: Multiple agents/tabs can update the graph simultaneously

### Dagre (graph layout)

- **What it is**: Automatic tree/DAG layout algorithm
- **Use with Vue-flow**: `@vue-flow/layout` package

---

## Inspiration

### Simon Willison's approach

From https://simonw.substack.com/p/building-a-tool-to-copy-paste-share:

- **Single HTML file tools** — No build step, just works
- **Combine existing pieces** — Reference existing code, let AI figure out the integration
- **Reduce friction incrementally** — Don't build perfect, build useful
- **GitHub Gists as storage** — Free, authenticated, shareable
- **Unix philosophy** — Small tools that pipe together

### ChatGPT branching (what exists)

ChatGPT added "branch conversations" in Sept 2025. But:
- Locked to ChatGPT only
- No merging across branches
- Can't select pieces from different branches
- No portable context

ThinkGraph goes further: cross-AI, mergeable, portable.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ThinkGraph                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   llm CLI    │    │  Paste Input │    │  MCP Server  │      │
│  │ (auto-logs)  │    │  (fallback)  │    │ (Cursor etc) │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             ▼                                   │
│                   ┌──────────────────┐                          │
│                   │  Decision Parser │                          │
│                   └────────┬─────────┘                          │
│                            ▼                                    │
│                   ┌──────────────────┐                          │
│                   │   Yjs Document   │ ← real-time sync         │
│                   │  (shared graph)  │                          │
│                   └────────┬─────────┘                          │
│                            ▼                                    │
│                   ┌──────────────────┐                          │
│                   │    SQLite DB     │ ← persistence            │
│                   │  (nuxt-crouton)  │                          │
│                   └────────┬─────────┘                          │
│                            ▼                                    │
│                   ┌──────────────────┐                          │
│                   │   Vue-flow UI    │                          │
│                   │  (graph view)    │                          │
│                   └──────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Input Methods (Auto + Fallback)

| Method | When it works | How |
|--------|---------------|-----|
| **llm CLI** | Terminal workflows | Auto-logs to SQLite, extract decisions |
| **llm tool** | llm with `--functions` | AI calls `log_decision()` directly |
| **MCP Server** | Cursor, Claude Code | Tool integration |
| **Paste input** | claude.ai, ChatGPT, Gemini web | Manual fallback, parses `DECISION:` blocks |
| **Claude Code logs** | After sessions | Import from `~/.claude/projects/*.jsonl` |

**Principle:** Automatic where possible, paste fallback where not. Same destination, different entry points.

---

## Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Nuxt 3 + nuxt-crouton | Crouton provides instant CRUD |
| Database | SQLite | Via nuxt-crouton, file-based |
| Real-time sync | Yjs | For multi-agent/multi-tab |
| Graph UI | Vue-flow + dagre | Node-based visualization |
| AI interface | `llm` CLI | Simon Willison's tool |

### nuxt-crouton setup

```bash
# Install the layers
pnpm add @fyit/crouton

# For collection generator CLI
pnpm add -D @fyit/crouton-collection-generator
```

**nuxt.config.ts:**
```typescript
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton'
  ]
})
```

**Generate collections:**
```bash
# Use the generator CLI to scaffold CRUD for decisions
pnpm crouton generate decisions

# This creates:
# - components/decisions/...
# - pages/decisions/...
# - server/api/decisions/...
# - database schema
```

Check the nuxt-crouton docs for the exact collection schema format the generator expects.

---

## Data Model

### decisions

```sql
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'insight',      -- idea, insight, decision, question
  path_type TEXT,                   -- diverge, deep_dive, prototype, converge, validate, park
  starred INTEGER DEFAULT 0,
  branch_name TEXT DEFAULT 'main',
  version_tag TEXT DEFAULT 'v1',    -- v1, v2, v3, extra
  parent_id TEXT,                   -- tree structure
  source TEXT,                      -- 'llm', 'paste', 'mcp', 'import'
  model TEXT,                       -- which AI model created this
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES decisions(id)
);
```

### decision_sources (for merges)

```sql
CREATE TABLE decision_sources (
  decision_id TEXT,
  source_id TEXT,
  PRIMARY KEY (decision_id, source_id),
  FOREIGN KEY (decision_id) REFERENCES decisions(id),
  FOREIGN KEY (source_id) REFERENCES decisions(id)
);
```

### Indexes

```sql
CREATE INDEX idx_decisions_branch ON decisions(branch_name);
CREATE INDEX idx_decisions_starred ON decisions(starred);
CREATE INDEX idx_decisions_parent ON decisions(parent_id);
CREATE INDEX idx_decisions_version ON decisions(version_tag);
```

---

## Path Types

These emerged from analyzing how thinking actually works when exploring with AI:

| Type | Icon | Purpose | When to use | Suggested AI |
|------|------|---------|-------------|--------------|
| **Diverge** | 🌱 | Generate many options | Starting exploration, brainstorming | Gemini, Claude |
| **Deep dive** | 🔬 | Explore one idea fully | Found something interesting, go deeper | Claude, Perplexity |
| **Prototype** | 🔨 | Make it real | Validated idea, ready to build | Cursor, Lovable, v0 |
| **Converge** | 🔀 | Merge insights from branches | Multiple good paths, need to synthesize | Claude |
| **Validate** | ❓ | Stress-test, poke holes | Before committing, challenge assumptions | Claude, ChatGPT |
| **Park** | 📦 | Save for later | Good idea but not now (v2/v3) | — |

**The thinking pattern:**
```
Diverge (generate options)
    ↓
Deep dive (explore promising ones)
    ↓
Validate (stress-test)
    ↓
Converge (synthesize best parts)
    ↓
Prototype (build it)

At any point: Park ideas for later
```

---

## Conceptual Background

### "Breeding" model for ideas

Not git-style branching (linear). More like **genetic algorithms**:

1. **Diverge** — Generate many options (like a population)
2. **Explore** — Let each path develop independently
3. **Select** — Human stars the good "genes" (insights)
4. **Recombine** — Merge selected pieces into new combinations
5. **Repeat**

Example:
```
"Give me 10 music app ideas"
    ├── Branch 1: Social listening → explored → found "Discord integration"
    ├── Branch 2: AI DJ → explored → found "crowd feedback loop"  
    └── Branch 3: Mood-based → explored → found "biometrics angle"

Recombine: Discord + crowd feedback + biometrics = new idea
```

### Decisions as portable context

A decision node isn't just text. It's **compressed context** that any agent can read:

```
Full conversation: 50 messages, 10k tokens
Decision chain: 5 nodes, 500 tokens

Any AI reads the 5 decisions → instantly "caught up"
```

This enables:
- Handoff between AIs
- Parallel exploration by different agents
- Coming back weeks later and understanding the journey

---

## Core Flows

### Flow 1: Start path from node

```
Click decision node
       ↓
Pick path type (diverge/deep dive/prototype/etc.)
       ↓
Pick method:
  - "Open in llm CLI" → copies command to clipboard
  - "Open claude.ai" → generates context, opens tab
  - "Copy context" → portable context to clipboard
       ↓
Explore with chosen AI
       ↓
Decisions flow back via:
  - llm auto-logging (if using llm)
  - Paste input (if using web AI)
```

### Flow 2: llm CLI workflow (recommended)

The `llm` CLI auto-logs everything to SQLite. ThinkGraph can read those logs.

**Basic usage:**
```bash
# Install
pip install llm
# or: brew install llm

# Set up API keys
llm keys set anthropic    # paste Claude API key
llm keys set openai       # paste OpenAI key

# Run prompts (auto-logged to ~/.llm/logs.db)
llm -m claude-4-opus "Explore auth patterns for ThinkGraph"

# Continue conversation (same context)
llm -c "What about OAuth specifically?"
llm -c "Compare with API keys"

# Switch models mid-conversation
llm -c "Summarize what we found" -m gpt-4o
```

**With decision logging tool:**
```bash
# Define a tool inline that logs to ThinkGraph
llm --functions '
def log_decision(content, branch="main", decision_type="insight"):
    """Log a key decision or insight to ThinkGraph"""
    import httpx
    response = httpx.post("http://localhost:3000/api/decisions", json={
        "content": content,
        "branch_name": branch,
        "type": decision_type,
        "source": "llm"
    })
    return {"logged": True, "id": response.json().get("id")}
' -m claude-4-opus "Explore auth patterns. When you find key insights, log them."
```

**Where llm stores logs:**
```bash
# Find the database
llm logs path
# Usually: ~/.llm/logs.db

# Browse with Datasette
pip install datasette
datasette "$(llm logs path)"
# Opens web UI at http://127.0.0.1:8001

# Or query directly
sqlite3 "$(llm logs path)" "SELECT * FROM responses ORDER BY id DESC LIMIT 5"
```

**ThinkGraph imports from llm logs:**
```bash
# Future CLI command
thinkgraph import --from-llm --since "2024-01-01"

# Or via API
GET /api/llm/import?since=2024-01-01
# Returns candidate decisions extracted from llm logs
```

### Flow 3: Paste fallback

```
1. Explore in claude.ai / ChatGPT / Gemini
2. AI outputs structured format:
   
   DECISION: {"content": "OAuth better for teams", "type": "insight", "branch": "auth"}
   DECISION: {"content": "Need refresh token flow", "type": "decision", "branch": "auth"}

3. Copy output
4. Paste into ThinkGraph "Quick Add" input
5. Parser extracts decisions
6. Review and confirm → added to graph
```

### Flow 4: Multi-select → Generate brief

```
Shift+click nodes across branches: D3, D6, B2, C1
       ↓
Click "Generate brief"
       ↓
Pick format:
  - Markdown summary
  - AI context (prompt-ready)
  - Lovable/Cursor brief
  - Custom template
       ↓
Output ready to use
```

### Flow 5: Import from llm logs

```bash
# ThinkGraph reads llm's SQLite logs
# Extracts decisions from responses
# User reviews and imports

thinkgraph import --from-llm --since "2024-01-01"
```

---

## UI Components

### 1. GraphView (main page)

- Vue-flow canvas
- Dagre auto-layout (tree structure)
- Pan/zoom
- Click node → action menu

### 2. DecisionNode

```
┌─────────────────────────────────────┐
│ ⭐ 🔬                        schema │
│                                     │
│ SQLite: decisions, edges,           │
│ sources tables                      │
│                                     │
│ [Start path ▼]                      │
└─────────────────────────────────────┘
```

- Star icon (toggle)
- Path type icon
- Branch tag
- Content preview
- "Start path" button

### 3. Parked node (v2/v3)

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  ☆ 📦                           v2   
│                                     │
  Team collaboration features         
│                                     │
  [Pull into main] [Explore more]     
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

Dotted border, dimmed — clearly "not now"

### 4. PathTypeModal

```
┌─────────────────────────────────────┐
│  What kind of path?                 │
├─────────────────────────────────────┤
│  🌱 Diverge                         │
│  🔬 Deep dive                       │
│  🔨 Prototype                       │
│  🔀 Converge                        │
│  ❓ Validate                        │
│  📦 Park for later                  │
├─────────────────────────────────────┤
│  How?                               │
├─────────────────────────────────────┤
│  💻 llm CLI (copy command)          │
│  🟢 Claude.ai                       │
│  🔵 ChatGPT                         │
│  🟣 Gemini                          │
│  📋 Copy context only               │
└─────────────────────────────────────┘
```

### 5. QuickAdd (paste input)

```
┌─────────────────────────────────────┐
│  Quick Add                          │
├─────────────────────────────────────┤
│                                     │
│  Paste AI output here...            │
│                                     │
├─────────────────────────────────────┤
│  Parsed:                            │
│  ┌─────────────────────────────┐    │
│  │ "OAuth better for teams"    │    │
│  │ branch: auth | type: insight│    │
│  │ [Add] [Edit] [Skip]         │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 6. SelectionBar

```
┌─────────────────────────────────────────────────────────────────┐
│ 5 selected: D3, D6, B2, C1, D18                    [Clear all]  │
│                                                                 │
│ [Generate brief ▼]  [Start converge]  [Copy context]           │
└─────────────────────────────────────────────────────────────────┘
```

### 7. Sidebar

- Branch filter (checkboxes + colors)
- Version filter (v1 / v2 / v3 / parked)
- Starred filter
- Search

---

## API Endpoints

### Standard CRUD (via nuxt-crouton)

```
GET    /api/decisions
POST   /api/decisions
GET    /api/decisions/:id
PATCH  /api/decisions/:id
DELETE /api/decisions/:id
```

### Custom endpoints

```
GET  /api/decisions/tree
     → Returns { nodes, edges } for vue-flow

GET  /api/decisions/context/:id
     → Returns { path, starred, contextText }

POST /api/decisions/:id/pull
     → Move parked node to main branch

POST /api/briefs/generate
     → Generate brief from { ids: [...] }

POST /api/decisions/parse
     → Parse pasted text, extract DECISION: blocks

GET  /api/llm/import
     → Scan llm logs, return candidate decisions
```

---

## Context Generation

When starting a path, generate:

```
You are continuing an exploration.

## Path so far
D1: Version control for AI reasoning
D2: Context pollution is the real pain  
D3: Decisions = compressed portable context
[...path to selected node...]

## Starred insights from other branches
B2: Genetic algorithms for ideas (branch: breeding)
C1: SQLite schema defined (branch: schema)

## Your task
[Based on path_type - e.g., "Generate 5-10 different approaches to..."]

## Output format
When you reach a key insight or decision, format it as:
DECISION: {"content": "your insight", "type": "insight", "branch": "current_branch"}

This allows automatic capture back into ThinkGraph.
```

---

## Build Phases

### Phase 1: Core (v1)

1. **nuxt-crouton setup**
   - Generate `decisions` collection
   - Generate `decision_sources` collection
   - Basic CRUD working

2. **Graph UI**
   - Vue-flow integration
   - Dagre layout
   - DecisionNode component
   - Basic interactions (click, star)

3. **Paste input**
   - QuickAdd component
   - Decision parser (`DECISION: {...}`)
   - Review and confirm flow

4. **Context generation**
   - `/api/decisions/context/:id`
   - Path type templates
   - Copy to clipboard

5. **Path launching**
   - PathTypeModal
   - Generate llm command
   - Open AI web interfaces

### Phase 2: Integration

6. **llm integration**
   - Read llm SQLite logs
   - Import interface
   - `log_decision` tool definition

7. **Multi-select & briefs**
   - Selection mode
   - SelectionBar
   - Brief generation

8. **Yjs sync**
   - Real-time updates
   - Multiple tabs/agents

### Phase 3: Polish

9. **Parked nodes**
   - v2/v3 version tags
   - Visual distinction
   - Pull into main

10. **Search & filter**
    - Full-text search
    - Branch/version filters

---

## V2 Features (Parked)

| Feature | Description |
|---------|-------------|
| AI recommendations | Track model performance per path type, suggest optimal matches |
| Team collaboration | Shared graphs, permissions, notifications |
| llm-thinkgraph plugin | Native llm integration as a plugin |
| Browser extension | Auto-capture from any AI web interface |
| Export | Decision tree as documentation |

---

## Success Criteria

1. You use it for every project
2. Ideas don't get lost
3. V2 dreams stay parked until ready
4. You never start from zero again
5. Works with any AI (llm, web interfaces, or paste)

---

## Key Principles

1. **Auto where possible, paste where not** — Multiple entry points, same destination
2. **Unix philosophy** — Small tools that compose (inspired by Simon Willison)
3. **Your thinking belongs to you** — Not trapped in any AI provider
4. **Structured parking** — v2/v3 ideas are parked, not forgotten
5. **Reduce friction incrementally** — Don't build perfect, build useful

---

*This plan was created using ThinkGraph methodology — decisions captured, branches explored, insights merged.*

---

## For the Agent Receiving This

**Before building, you should:**

1. **Read nuxt-crouton docs** at https://github.com/pmcp/crouton-docs to understand the collection schema format
2. **Try llm CLI** — `pip install llm` and run a few prompts to see how logging works
3. **Check Vue-flow docs** at https://vueflow.dev/ for the node/edge API
4. **Ask the user** about their nuxt-crouton project structure

**Start with Phase 1:**
1. Generate the `decisions` collection with nuxt-crouton
2. Get basic CRUD working
3. Add Vue-flow graph view
4. Build the paste input + parser

The llm integration and Yjs sync can come later.

**Key files you'll likely create:**
```
pages/
  index.vue              # GraphView (main UI)
  
components/
  DecisionNode.vue       # Custom vue-flow node
  PathTypeModal.vue      # Path selection dialog
  QuickAdd.vue           # Paste input
  SelectionBar.vue       # Multi-select actions

server/api/
  decisions/
    tree.get.ts          # Returns nodes + edges for vue-flow
    context/[id].get.ts  # Returns portable context
    parse.post.ts        # Parses pasted DECISION: blocks
  briefs/
    generate.post.ts     # Generates brief from selection

composables/
  useDecisionGraph.ts    # Graph state management
```
