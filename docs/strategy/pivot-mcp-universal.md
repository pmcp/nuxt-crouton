# Strategic Pivot: MCP-Universal AI Development Framework

> **Status**: DECIDED. This replaces the Atelier visual builder approach.
> **Date**: 2026-02-24
> **Supersedes**: atelier-plan.md Phases B-E (Phase A work is parked, not deleted)

---

## One-Sentence Summary

nuxt-crouton stops building a web UI builder and instead makes the **MCP server the product** — any AI client (Claude Code, Cursor, Windsurf, or a chat UI) can scaffold, evolve, and manage Nuxt apps through self-documenting MCP tools backed by the existing CLI.

---

## Why

1. **The value is the guardrails, not the UI.** Schema validation, type safety, package compatibility, architectural patterns — these make AI-generated code reliable. A web UI adds hundreds of components to maintain. MCP tools are structured functions.

2. **AI gets better; UIs don't.** Every Claude/GPT improvement automatically improves the crouton experience. A kanban builder is static — it only improves when a developer codes improvements.

3. **MCP is gaining adoption.** Claude Code, Cursor, Windsurf, GitHub Copilot are all adopting MCP. Building on MCP means every new AI client becomes a potential crouton interface.

4. **Solo developer leverage.** Skills are 50-200 lines of markdown. Agent personas are prose. MCP tools are structured functions with Zod schemas. Compare that to a Yjs-backed collaborative kanban builder with bottom sheets, drag-drop, and responsive layouts.

5. **Non-technical users still get served.** Instead of a complex builder UI, they talk to Claude via a thin chat interface that calls the same MCP tools. The "Atelier" becomes a conversation, not a kanban board.

---

## Three Interfaces, One Engine

```
Developer (Claude Code) → Plugin (commands/agents/skills/hooks) ─┐
Developer (Cursor/etc.) → MCP Toolkit (tools/resources/prompts) ──┤── CLI + Packages
End User (Chat UI)      → Claude API + MCP tools ─────────────────┘
```

| Layer | Client | Transport | Distribution |
|-------|--------|-----------|--------------|
| **Plugin** | Claude Code | Local filesystem | Plugin marketplace |
| **MCP Toolkit** | Any MCP client | HTTP (Streamable HTTP) | npm package |
| **Chat Endpoint** | Non-technical users | Web UI | Hosted Nuxt app |

All three layers call the same CLI. All three produce the same output. The difference is the interface.

---

## Architecture Decisions

### 1. `@nuxtjs/mcp-toolkit` replaces standalone MCP server

The official Nuxt MCP module provides:
- **File-based auto-discovery**: `server/mcp/tools/`, `server/mcp/resources/`, `server/mcp/prompts/`
- **Zod validation** built-in
- **Nitro caching** (`cache: "1h"`)
- **DevTools inspector**
- **HTTP transport** (Streamable HTTP), compatible with all clients via `mcp-remote`
- **1-Click Install badges** for distribution

**Each crouton package ships its own `server/mcp/` directory.** Enable `crouton-auth` → get auth MCP tools alongside API routes and components. The AI interface grows automatically with package selection.

The standalone `packages/crouton-mcp-server/` is parked (frozen, not deleted).

### 2. Build-time vs. Runtime tools

| Category | Purpose | Examples | Where they live |
|----------|---------|----------|-----------------|
| **Build-time** | Help AI scaffold the app | `design_schema`, `list_packages`, `scaffold_app` | `crouton-core/server/mcp/` or CLI package |
| **Runtime** | Interact with deployed data | `list-bookings`, `booking-availability` | Domain packages (`crouton-bookings/server/mcp/`) |

Convention: metadata flag on tool definition (`{ phase: 'build' | 'runtime' }`).

### 3. Claude Code Plugin

A single installable unit replaces all manual `.claude/` setup:

```
crouton-plugin/
├── .claude-plugin/plugin.json
├── commands/
│   ├── scaffold.md          # /scaffold — the main pipeline
│   ├── doctor.md            # /doctor — health check + fix
│   └── evolve.md            # /evolve — add features to existing app
├── agents/
│   ├── architect.md         # data modeling, schema design
│   ├── designer.md          # UI/UX, layouts, components
│   └── sal.md               # "Sal the Brooklyn Code Plumber" quality review
├── skills/
│   ├── schema-design/SKILL.md
│   ├── generation/SKILL.md
│   └── package-selection/SKILL.md
└── hooks/hooks.json         # auto-typecheck after generation, auto-doctor on failure
```

**Plugin commands wrap MCP prompts.** The MCP prompt (`scaffold-app`) is the source of truth for workflow logic. The plugin command adds Claude Code-specific conveniences: hooks, agent delegation, progress output. A Cursor user gets the same workflow via the MCP prompt directly.

### 4. Visual Atelier = pipeline visualizer

Not a kanban builder. A visualization of agents working:
- Each agent has a timeline lane
- Decisions, questions, and outputs are visible
- Human checkpoints appear as async questions

**Architecture (deliberately simple):**
- Orchestrator: sequential Claude API calls, one per agent
- Each agent = separate call with specific system prompt + file-based context
- Context passing: files on disk (schemas, configs, structured logs)
- Each agent writes structured log entries:
  ```json
  { "agent": "architect", "action": "designed_schema", "output": "schemas/booking.json",
    "decisions": ["used decimal for price", "added parentId for hierarchy"], "timestamp": "..." }
  ```
- Visualizer: **a crouton app itself** — pipeline events collection rendered with crouton-viz

No LangChain, no LangGraph. ~100 lines of orchestration code.

### 5. Self-learning feedback loop

```
Error occurs (typecheck fails)
  → Hook captures error + context
  → Appends to .claude/errors/log.jsonl
  → Entry: { schema, packages, error, resolution, timestamp }
  → Skills read log as "known issues"
  → Next run: AI avoids known pitfalls
  → If auto-fix works: resolution logged too
```

Two levels:
- **Project-level**: error history per app (just a file)
- **Framework-level**: `/learn` command proposes PRs to skill/prompt markdown

---

## The Conveyor Belt

```
User: "build a yoga studio booking app"
         |
    /scaffold command (or MCP scaffold-app prompt)
         |
    [1. Understand] ← list_packages, get_project_context
         |
    [2. Architect]  ← design_schema, validate_schema, write_schema, write_config
         |              Human checkpoint: "Here's the data model. Good?"
         |
    [3. Generate]   ← scaffold_app, generate_collection
         |              Hook: auto-typecheck + auto-doctor
         |
    [4. Customize]  ← optional: page composition, viz presets, custom components
         |              Human checkpoint: "Want me to customize anything?"
         |
    [5. Verify]     ← typecheck, doctor, dev server
         |
    Working app in layers/
```

**Context passes through files**, not memory: `crouton.config.js`, `schemas/*.json`, `layers/`, `.crouton-generation-history.json`. Any session picks up where another left off.

**Agent mapping:**
- **Architect** → crouton-cli, crouton-core, crouton-auth (data modeling + access control + relationships)
- **Designer** → crouton-pages, crouton-charts, crouton-maps (layout + display + components)
- **Sal** → crouton-devtools, generated outputs (code quality review)

One orchestrating command delegates to agents sequentially. Not peer agents — strict handoffs.

---

## MCP Tool Inventory

### Phase 1 MVP (8 tools — enough for full scaffold workflow)

| Tool | Purpose | Wraps |
|------|---------|-------|
| `get_project_context` | Full project snapshot | Aggregates existing data |
| `list_packages` | All packages with manifests + aiHints | Manifest system |
| `design_schema` | Field types + schema guidelines | Existing tool, enhanced |
| `validate_schema` | Validate schema JSON, return fix suggestions | Existing tool, enhanced |
| `write_config` | Write/update `crouton.config.js` | File write |
| `write_schema` | Write a schema JSON file | File write |
| `generate_collection` | Execute CLI generation | CLI `crouton config` |
| `doctor` | Health check | CLI `crouton doctor` |

### Phase 2 additions

| Tool | Purpose |
|------|---------|
| `scaffold_app` | Create new app skeleton (CLI `init`) |
| `add_module` | Add a crouton package to existing app |
| `check_compatibility` | Verify package combinations |
| `get_package_info` | Single package manifest detail |
| `preview_generation` | Full config dry run (structured output) |

### MCP Prompts

| Prompt | Purpose |
|--------|---------|
| `scaffold-app` | Full pipeline: understand → design → generate → verify |
| `add-collection` | Add a single collection to existing app |
| `evolve-app` | Add packages/features to existing app |

### MCP Resources

| Resource | Purpose |
|----------|---------|
| `crouton://packages` | All package manifests — the capability menu |
| `crouton://field-types` | Valid field types with examples |
| `crouton://patterns/{name}` | App pattern templates (yoga-studio, sports-club, etc.) |
| `crouton://project-context` | Dynamic: current project state |
| `crouton://capabilities` | Top-level capability index (mitigates tool sprawl) |

---

## What Stays, What's Parked, What's New

### Stays (the foundation)

Everything that makes nuxt-crouton work:
- **CLI** (`crouton-cli`) — the execution engine, 18 generators
- **Core** (`crouton-core`) — all composables, components, types, hooks
- **All 25 packages** — bookings, pages, auth, email, maps, charts, etc.
- **Manifest system** — `crouton.manifest.ts` per package
- **CLAUDE.md per package** — AI-readable documentation

### Parked (frozen, not deleted)

| Package | Reason |
|---------|--------|
| `crouton-atelier` (web UI builder) | Claude Code + MCP IS the Atelier |
| `crouton-designer` (AI chat wizard) | Claude Code does schema design natively. Prompt patterns are reference material for MCP prompts. |
| `crouton-mcp-server` (standalone) | Replaced by `@nuxtjs/mcp-toolkit` |
| `apps/atelier/` | No standalone builder app |

### New

| What | Purpose |
|------|---------|
| MCP tools in `server/mcp/` | Per-package AI interface |
| MCP prompts | Workflow orchestration for any client |
| MCP resources | Package manifests, patterns, project context |
| Claude Code plugin | Developer distribution (commands, agents, skills, hooks) |
| Pipeline orchestrator | Sequential agent calls, ~100 lines |
| Pipeline visualizer | Crouton app: agent timelines, decisions, logs |
| Error log + feedback loop | Self-learning from failures |

---

## Phased Implementation

### Phase 1: Foundation (2-3 weeks)

**Goal**: Any AI client can scaffold a complete app via MCP tools.

**Track A — MCP Toolkit:**
1. Add `@nuxtjs/mcp-toolkit` to monorepo
2. Port existing 5 tools from `crouton-mcp-server` to `server/mcp/tools/`
3. Add 3 new tools: `get_project_context`, `list_packages`, `write_config`
4. Add MCP prompts: `scaffold-app`, `add-collection`
5. Add MCP resources: package manifests, field types
6. Park `packages/crouton-mcp-server/`

**Track B — Claude Code Plugin:**
1. Create plugin structure
2. `/scaffold` command wrapping MCP `scaffold-app` prompt
3. `/doctor` command
4. Architect agent definition
5. Schema-design skill, package-selection skill
6. Hooks: auto-typecheck, auto-doctor

**Track C — Self-Learning (minimal):**
1. Structured error log format
2. Post-generation hook: typecheck → log errors
3. Skills reference error log

**Validation:**
- Claude Code: `/scaffold yoga-studio` → typechecks, doctor passes, dev starts
- Cursor: MCP `scaffold-app` prompt → same result
- Under 10 minutes from description to working app

### Phase 2: Per-Package MCP + Complete Tools (2-3 weeks)

- Add `server/mcp/` to core packages (auth, bookings)
- Runtime tools in domain packages
- `crouton://capabilities` resource (tool sprawl mitigation)
- Remaining MCP tools: `scaffold_app`, `add_module`, `check_compatibility`, etc.
- Plugin completion: Designer agent, Sal agent, `/evolve` command
- Generated projects auto-install crouton plugin
- 2-3 app patterns as validation fixtures

### Phase 3: Visual Atelier + Chat (3-4 weeks)

- Pipeline orchestrator (sequential Claude API calls, file-based context)
- Structured pipeline logs
- Atelier as crouton app (pipeline events collection + viz)
- Chat endpoint using mcp-toolkit (embedded MCP tools)
- Pattern library (10+ patterns, living artifacts)
- `$list`, `$card`, `$form` hint system in CLI

---

## Revenue Model

**"Open source engine, paid AI interface."**

| Tier | What | Price |
|------|------|-------|
| **Free** | Framework + CLI + MCP tools (self-hosted) + Claude Code plugin | $0 |
| **Hosted MCP** | Cloud endpoint + team state + project history + premium patterns | ~$5/mo |
| **Managed deploy** | NuxtHub integration, one-click deploy | ~$10/mo |
| **Chat builder** | Hosted chat UI for non-technical users (includes AI tokens) | ~$15/mo |

---

## Principles (unchanged, reinforced)

1. **The user describes what, never how.** → MCP tools handle the "how"
2. **The framework is the product. AI is the labour.** → Literally true now
3. **Generate → Customise → Own.** → Same pipeline, AI-driven
4. **Schema carries everything.** → Schemas are the handoff between agents
5. **Packages, not features.** → Each package ships its own MCP surface
6. **The CLI gets smarter, everyone does less.** → MCP tools make the CLI accessible to AI
7. **Open source framework, paid convenience.** → Free engine, paid interfaces

---

## Reference Documents

| Document | Status | Purpose |
|----------|--------|---------|
| `atelier-strategy.md` | **Active** | Core principles, architecture decisions, package strategy |
| `atelier-capabilities.md` | **Active** | Package capability map (what every package provides/consumes) |
| `nuxt-crouton-deep-dive.md` | **Active** | Complete technical reference |
| `atelier-plan.md` | **Partially superseded** | Phase A work is parked. Types, composables, and component specs are reference material. |
| `atelier-editor-blocks-plan.md` | **Implemented** | Editor block manifest migration (done) |
| `strategy-questions-and-learnings.md` | **Active** | Research findings that informed this pivot |
| This document | **Active** | The pivot strategy |
