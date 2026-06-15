# Crouton MCP Pivot: Questions & Learnings

## Context

This document captures everything learned from a deep-dive conversation analyzing the MCP pivot plan. It's meant to be shared with the strategy agent that has been writing the plan, so it can incorporate these insights.

---

## Key Discoveries

### 1. `@nuxtjs/mcp-toolkit` Changes the MCP Server Architecture

The Nuxt ecosystem now has an official module (`@nuxtjs/mcp-toolkit`) for building MCP servers directly inside Nuxt apps. It provides:

- **File-based auto-discovery**: Drop files in `server/mcp/tools/`, `server/mcp/resources/`, `server/mcp/prompts/` — they register automatically
- **Zod validation** built in
- **Nitro caching** (add `cache: "1h"` to a tool definition)
- **DevTools inspector** for debugging
- **1-Click Install badges** for distribution to Cursor, VS Code, etc.
- **HTTP transport** (Streamable HTTP), compatible with all MCP clients via `mcp-remote`

This is what nuxt.com and Nuxt UI already use for their own MCP servers. It's the idiomatic Nuxt way to build MCP.

**Implication**: The standalone `packages/crouton-mcp-server` (which manually wires `@modelcontextprotocol/sdk` over stdio) can be replaced by mcp-toolkit. Each crouton package can ship its own `server/mcp/` directory, and tools auto-register when the package is enabled.

### 2. MCP in Every Package

Each crouton package (as a Nuxt layer/module) can ship its own MCP surface:

```
packages/crouton-auth/
├── server/
│   ├── api/          # existing API routes
│   └── mcp/
│       ├── tools/
│       │   ├── list-users.ts
│       │   ├── configure-auth.ts
│       │   └── check-permissions.ts
│       └── resources/
│           └── auth-manifest.ts

packages/crouton-crud/
├── server/
│   └── mcp/
│       ├── tools/
│       │   ├── list-collections.ts
│       │   ├── query-records.ts
│       │   └── bulk-update.ts
│       └── resources/
│           └── crud-manifest.ts
```

When a user enables `crouton-auth`, they don't just get auth components and API routes — they get MCP tools. The AI interface grows automatically with the package selection.

**Two distinct tool categories emerge:**

- **Build-time tools**: Help the AI scaffold the app ("what packages exist? what field types are available?"). Expose manifests, aiHints, schema guidance.
- **Runtime tools**: Interact with a deployed app's real data ("show me today's bookings"). Only make sense in a running app.

These need a clear convention — either naming (`auth.build.list-capabilities.ts` vs `auth.runtime.list-users.ts`) or a metadata flag on the tool definition.

### 3. Claude Code Plugin System

Claude Code now has a plugin system that bundles commands, agents, skills, hooks, and MCP server configs into a single installable unit:

```
crouton-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── scaffold.md       # /scaffold
│   ├── doctor.md         # /doctor
│   └── evolve.md         # /evolve
├── agents/
│   ├── architect.md      # data modeling, schema design
│   ├── designer.md       # UI/UX, layouts, components
│   └── sal.md            # code quality review
├── skills/
│   ├── schema-design/
│   │   └── SKILL.md
│   ├── generation/
│   │   └── SKILL.md
│   └── package-selection/
│       └── SKILL.md
└── hooks/
    └── hooks.json        # auto-typecheck, auto-doctor
```

One command installs everything: `/plugin install crouton@fyit`

**Implication**: This replaces all manual `.claude/` setup from the plan (Phase 1.4, Phase 2.2-2.3). The plugin IS the Claude Code distribution mechanism.

### 4. Three-Layer Architecture

Three complementary distribution channels, each serving a different interface:

```
Claude Code user  → Plugin (commands/agents/skills/hooks) ─┐
Cursor user       → MCP Toolkit (tools/resources/prompts) ──┤── CLI + Packages
End user          → Chat UI (Claude API + MCP tools) ───────┘
```

| Layer | Client | Transport | Strengths | Distribution |
|-------|--------|-----------|-----------|-------------|
| Plugin | Claude Code only | Local filesystem | Commands, agents, hooks, skills | Marketplace install |
| MCP Toolkit | Any MCP client | HTTP endpoint | Runtime tools, auto-discovery, caching | npm package |
| Chat Endpoint | Non-technical users | Web UI | Conversational interface | Hosted Nuxt app |

The plugin can include an `.mcp.json` that connects to the MCP toolkit's HTTP endpoint, so Claude Code gets both plugin commands/agents AND MCP tools.

### 5. Agents Are for Developer Control, Not End-User Personas

The agent names (architect, designer, sal) are for the framework developer to maintain clean separation in a complex codebase. Each agent is "the part of the system that knows about X" — a scoped document that can be reasoned about, tested, and improved independently.

**The distinction that matters:**

- **Agents** = workflow + persona, invoked by the developer ("I want to work on the data model")
- **Skills** = knowledge, invoked autonomously by Claude ("I need to know about field types to complete this task")

The architect agent *uses* the schema-design skill and package-selection skill. Skills are knowledge; agents are workflows that combine knowledge and actions.

### 6. The Visual Atelier

The atelier is NOT a complex web builder UI. It's a visualization of agents working:

- Each agent has a timeline/lane
- You see decisions being made, questions being asked
- Sometimes agents feed into each other (one direction, not back-and-forth)
- You can check in with any agent, see their state, intervene when needed
- Questions pop up asynchronously for human approval

**Architecture (deliberately simple):**

1. Orchestrator: simple Node script or Nuxt server route calling Claude API sequentially
2. Each agent = separate Claude API call with specific system prompt + file-based context
3. Context passing: files on disk (schemas, configs, structured logs)
4. Each agent writes structured log entries:
   ```json
   { "agent": "architect", "action": "designed_schema", "output": "schemas/booking.json", "decisions": ["used decimal for price", "added parentId for hierarchy"], "timestamp": "..." }
   ```
5. Visualizer: crouton app reading the log collection, rendered with crouton-viz
6. No LangChain, no LangGraph, no framework — just structured API calls and file I/O

**This connects to ThinkGraph** — the visual graph for managing thinking across AI conversations. The atelier could be a ThinkGraph instance where nodes are pipeline stages and edges are handoffs.

**The atelier could be a crouton app itself** — eating its own dog food. A collection of "pipeline events" with fields for status, schema snapshot, errors, timing.

### 7. Self-Learning Ecosystem

When errors occur during generation, that knowledge should strengthen the system rather than dying in the conversation.

**Proposed feedback loop:**

```
Error occurs (typecheck fails)
    → Hook captures error + context
    → Appends to structured log: .claude/errors/log.jsonl
    → Entry: { schema, packages, error, resolution, timestamp }
    → Skills read this log as "known issues"
    → Next time Claude hits similar pattern, skill warns proactively
```

**Two levels:**
- **Project level**: This specific app's error history (easy — just a file)
- **Framework level**: All crouton apps feeding back into the plugin's skills (needs a flow-back mechanism, e.g., `/learn` command that proposes PRs to skill markdown)

**Hooks enable automatic feedback loops:**
- Post-generation hook runs typecheck
- If it fails, hook writes error context to log AND triggers doctor to attempt fix
- If fix works, resolution gets logged too
- Loop: generate → verify → fail → diagnose → fix → log (error + fix)

### 8. No LangChain

LangGraph was considered and rejected:
- Python-first (crouton is Nuxt/Node)
- Heavy abstraction that controls orchestration logic
- Generic — doesn't know the domain
- Complex state management for every possible graph topology

The actual need is much simpler: a linear pipeline where each agent writes artifacts for the next. ~100 lines of orchestration code. The visualization reads structured logs.

---

## Questions for the Strategy Agent

### MCP Toolkit Migration

1. The current `crouton-mcp-server` manually wires up tools via `@modelcontextprotocol/sdk` over stdio. `@nuxtjs/mcp-toolkit` gives file-based auto-discovery, Zod validation, Nitro caching, and DevTools inspection for free. What would porting the existing 5 tools (`design_schema`, `validate_schema`, `generate_collection`, `list_collections`, `list_layers`) look like? Is there anything in the current implementation that depends on stdio transport specifically, or could everything move to HTTP?

2. If we adopt mcp-toolkit, each crouton package could ship its own `server/mcp/` directory. When a user enables `crouton-auth`, its MCP tools auto-register alongside API routes and components. Has the manifest system been designed with this kind of per-package MCP surface in mind, or would manifests need restructuring to serve double duty as MCP resources?

3. There's a build-time vs runtime distinction for MCP tools. Build-time: "what packages exist? what field types are available?" Runtime: "show me today's bookings." Should these live in the same `server/mcp/tools/` directory with a metadata flag, or should there be a convention like separate directories? How does the current manifest + aiHints system map to this split?

4. Tool sprawl: if 10 packages each expose 3-5 MCP tools, the AI sees 30-50 tools. What's the plan for a top-level capability index (`crouton://capabilities` resource) that helps the AI navigate without reading every description? Does `list_packages` account for this?

### Claude Code Plugin

5. The plan has skills in `.claude/skills/`, agents as separate `.md` files, and no hooks. Has the Claude Code plugin format been considered as the distribution mechanism? A single `crouton` plugin could replace all manual `.claude/` setup from Phase 1.4 and Phase 2.2-2.3. One command: `/plugin install crouton@fyit`.

6. Plugin hooks can run scripts on events. The plan's "Guardrail: npx nuxt typecheck + doctor" could be an automatic hook rather than a step the AI remembers. What other conveyor belt points benefit from hooks — schema validation after `write_schema`? Compatibility check after `add_module`?

7. The plan's "CLI init enhancement" (Phase 2.5): new projects get `.claude/settings.json` with MCP server pre-configured. With plugins, the generated project's `.claude/settings.json` can auto-install the crouton plugin for the whole team. Does this replace the init enhancement, or do both still serve a purpose?

8. Plugin commands are markdown files (`commands/scaffold.md`). MCP prompts (§1.2) serve a similar orchestration role for non-Claude-Code clients. How much overlap is there between a `/scaffold` plugin command and a `scaffold-app` MCP prompt? Should they share a single source of truth?

### Three-Layer Architecture

9. With the plugin + mcp-toolkit split, is there a risk of maintaining two parallel "how to scaffold an app" definitions — one in plugin commands/skills, one in MCP toolkit prompts/tools? What's the single source of truth for the workflow?

10. For the chat endpoint (Phase 3.5), if it uses `@nuxtjs/mcp-toolkit`, the MCP tools are embedded in the app itself — no external MCP server connection needed. Does this simplify Phase 3 architecture enough to pull it forward?

### Agent/Skill Architecture

11. Each agent (architect, designer, sal) is scoped to specific packages and a part of the CLI flow. Can you sketch which packages map to which agent? Proposed mapping:
    - **Architect**: generator, crud, auth (data modeling + access control)
    - **Designer**: viz, pages, ui (layout + display + components)
    - **Sal**: devtools, generator outputs (code quality review)

12. Does each package own its own skill? If `crouton-auth` ships `skills/auth-patterns/SKILL.md` and `crouton-viz` ships `skills/viz-capabilities/SKILL.md`, skills grow with the package ecosystem. But then the plugin needs to aggregate skills from all packages. Is there a mechanism for this?

13. The conveyor belt reads as sequential phases, but with named agents it suggests distinct voices. For `/scaffold`, is it one orchestrating command that delegates to agents in sequence (architect → designer → sal), or a single agent that pulls in skills as needed? The plugin structure supports both.

14. When the architect works on a schema and realizes the user needs calendar functionality (different package), does it handle the full recommendation, or hand off?

### Package Architecture

15. The plan says "25 packages" but for Phase 1 validation ("scaffold a yoga studio booking app"), which packages are actually exercised? Could the MCP layer start with just the subset the conveyor belt touches — generator, crud, auth, maybe viz — and expand incrementally?

16. The `@friendlyinternet` → `@fyit` scope migration was in progress. Is that still happening in parallel, or does this plan supersede it? The plugin and MCP toolkit need a consistent scope.

17. Each package has a `crouton.manifest.ts` read by the CLI. With MCP toolkit, each manifest would also be an MCP resource. Is the manifest format rich enough to serve both purposes, or does it need new fields (`aiHints`, `compatibleWith`, `conflictsWith`) that the CLI doesn't currently use?

### Self-Learning & Feedback

18. When a generation fails (typecheck errors, doctor catches something), what happens to that knowledge today? Proposed: structured error log (`.claude/errors/log.jsonl`) that skills read as "known issues." Should this be project-level, framework-level, or both?

19. When Claude makes a mistake that a human corrects ("no, that field should be decimal not number"), that correction is gold for improving tool descriptions and skill content. Is there a mechanism like a `/learn` command that takes corrections and proposes updates to skill markdown?

20. Hooks could automate: post-generation → typecheck → if fail → log error + trigger doctor auto-fix → if fix works → log resolution. How aggressive should auto-fix be? Human checkpoint before fix attempts, or autonomous?

21. MCP tool descriptions are the UI now. When `design_schema` returns confusing output, that's a broken button. Could each tool include a structured "feedback" field that the orchestrating agent evaluates ("was this response useful?"), creating an automatic quality signal?

### Visual Atelier

22. The atelier is a visualization of the pipeline: each agent has a timeline lane, decisions and questions are visible, you can check in with any agent. The architecture is simple — sequential Claude API calls, file-based context passing, structured logs, crouton app as visualizer. Where does this sit in the phase plan? Is it Phase 3, or could a minimal version (just the log viewer) ship earlier?

23. The atelier connects to ThinkGraph — a visual graph for managing thinking across AI conversations. Could the atelier be a ThinkGraph instance where nodes are pipeline stages? Does ThinkGraph's current architecture support this, or would it need adaptation?

24. Could the atelier be a crouton app itself? A "pipeline runs" collection with status, schema snapshots, errors, timing — rendered with crouton-viz. This would be the ultimate dogfood demo.

25. Patterns as living artifacts: if someone scaffolds "yoga studio" and hits 3 errors that get resolved, that resolved session becomes an improved pattern. Should patterns be static JSON bundles, or living artifacts that improve each time they're used?

### Validation & Testing

26. The MCP server is THE product now. What's the automated test strategy for MCP tool inputs/outputs, prompt formatting, and resource responses? The existing server has vitest in devDeps but coverage appears minimal.

27. The plan says "under 10 minutes from description to working app." Has this been benchmarked with the current CLI? What's the baseline time for the manual equivalent?

28. Phase 1 vs Phase 2 tool tables have overlap — `scaffold_app`, `write_schema`, `check_compatibility`, `get_package_info` appear in both. Which tools are truly MVP for the "any AI client can scaffold a complete app" validation?

### Revenue & Distribution

29. With the plugin system, there's a new distribution vector. The free tier now includes "Framework + CLI + MCP server (self-hosted) + Claude Code plugin." The plugin marketplace is free distribution with zero friction. Does this change the revenue model tiers?

30. The "Hosted MCP" tier ($5/mo) — with mcp-toolkit, the hosted MCP server is just a deployed Nuxt app on NuxtHub. The infrastructure cost is minimal. Is $5/mo the right price point, or does the simplicity of deployment change the value proposition?

---

## Revised Phase Plan (Proposed)

Based on everything learned:

### Phase 1: Foundation (2-3 weeks)

**Track A — MCP Toolkit:**
- Add `@nuxtjs/mcp-toolkit` to the monorepo
- Port existing 5 tools from `crouton-mcp-server` to `server/mcp/tools/`
- Add new tools: `get_project_context`, `list_packages`, `write_config`, `scaffold_app`
- Add MCP prompts: `scaffold-app`, `add-collection`
- Add MCP resources: package manifests
- Park `packages/crouton-mcp-server/` (frozen, not deleted)

**Track B — Claude Code Plugin:**
- Create plugin structure with commands (`/scaffold`, `/doctor`)
- Move existing skills into plugin `skills/` directory
- Create agent definitions (architect, designer, sal) with package scoping
- Add hooks for auto-typecheck and auto-doctor
- Set up test marketplace for local development

**Track C — Self-Learning:**
- Define structured error log format
- Add post-generation hook that logs errors + resolutions
- Skills read error log as "known issues"

**Validation:**
- From Claude Code: `/scaffold a yoga studio booking app` → typechecks, doctor passes, dev server starts
- From Cursor: same workflow via MCP prompts → same result
- Time: under 10 minutes

### Phase 2: Per-Package MCP + Complete Tools (2-3 weeks)

- Add `server/mcp/` to core packages (crud, auth, viz)
- Each package exposes its manifest as MCP resource
- Build-time vs runtime tool convention established
- Capability index resource (`crouton://capabilities`)
- Plugin hooks for schema validation, compatibility checks
- Generated projects auto-install crouton plugin via `.claude/settings.json`
- 2-3 app patterns as validation fixtures

### Phase 3: Visual Atelier + Chat (3-4 weeks)

- Simple orchestrator: sequential Claude API calls with file-based context
- Structured pipeline logs (agent, action, decisions, timestamp)
- Atelier as crouton app: pipeline events collection + viz
- Timeline visualization per agent
- Human checkpoints as async questions in the graph
- Chat endpoint using mcp-toolkit (MCP tools embedded in the Nuxt app)
- Pattern library (10+ patterns, living artifacts that improve with use)
