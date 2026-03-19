# ThinkGraph Session Learnings — 2026-03-19

## What was built

### Phase 2b completion
- Fixed `get_workitem` 404 (was hitting non-existent single-item GET endpoint)
- Added `create_pr` PM tool (execFileSync for proper shell quoting)
- Fixed terminal sessions using wrong collection (decisions → workitems)
- Fixed callback URL (was hardcoded to production, now uses request Host header)
- Structured learnings: Pi sends typed `{ title, detail, scope }` array, each becomes a review node
- Auto-advance only dispatches pi-assigned items (human/client items wait for triage)

### Phase 3: Client View
- Share token on projects, public view at `/project/[shareToken]`
- Client feedback form creates review work items
- Live preview iframe with browser chrome

### Assistant
- Project assistant with tool calling (create, update, delete, dispatch, arrange, batch status)
- Focused node context — click a node, open assistant, it knows which node you're asking about
- Conversation persistence (chat-conversations collection)
- Node type guidance in system prompt

### Canvas & List
- List/triage view with filters, bulk actions, promote-to-task
- View toggle (V key) between canvas and list
- Assistant toggle (A key) in both views
- Batch delete with depth-sorted children-first ordering

### Worker improvements
- git pull before worktree creation
- Worktree instructions: no pnpm install, no typecheck
- Prompt tells Pi to use create_pr tool instead of gh directly
- Learning titles: pyramid style (5-10 words), detail in brief

---

## Key architectural learnings

### Node types are too rigid
The 6 types (discover/architect/generate/compose/review/deploy) don't map well to all work. "Compose" means "build Vue pages" but gets assigned for backend tool work. "Generate" means "run crouton CLI" but gets used for general code tasks.

**Fix direction:** Make instructions brief-aware, not type-bound. The type determines the broad phase, the brief determines the actual instructions Pi receives.

### Dagre vs saved positions
CroutonFlow's dagre auto-layout overrides saved positions on data refresh. Partially fixed by seeding positionCache from savedPositions, but still fragile. Needs proper lock/unlock UX where locked nodes are never touched by dagre.

### Assistant locks up after many tool calls
maxSteps: 15 gets exhausted when creating + dispatching many items. Accumulated tool results eat context. The assistant needs either streaming tool results, or a way to summarize and continue.

### Dispatch capacity management
Pi worker has maxSessions: 3. When the assistant dispatches 11 items, 8 get 503. Now items reset to queued on rejection, but the assistant should be smarter about capacity — dispatch 3, wait, dispatch next batch.

### Conversation persistence fragile
The crouton-cli generates createdAt/updatedAt NOT NULL columns in DB migrations but doesn't add them to the drizzle schema when useMetadata: false. This causes insert failures. Hit twice: chatconversations and workitems orderBy.

### Terminal streaming missing in production
WebSocket terminal works locally but needs a DO relay for production. This is a real usability gap — you can't see what Pi is doing remotely.

---

## Friction points (unresolved)

1. **Learning nodes are hard to triage** — You see them but don't know what to do. Need: click → assistant opens with context → "Triage this" / "Next step" / "Mark done" buttons. (Partially built)

2. **No visual diff for Pi's work** — Pi pushes a branch but you can't see what changed without git diff. Preview deploys would help.

3. **Agent questions buried in output** — Discover phase had 9 open questions hidden in free text. Should be structured data with inline answer forms.

4. **Too many nodes clutter canvas** — 10 learnings from one task is noise. Improved with pyramid titles + filtering to actionable-only sections, but canvas still gets busy.

5. **No way to answer and continue** — When Pi has questions, you can't answer and re-dispatch. The graph should carry the conversation forward.

---

## Ideas captured (not yet implemented)

### Tools for Pi agents
- `generate_image` — Flux/DALL-E for mockups and design prototypes
- `take_screenshot` — Playwright screenshot of URL or local dev
- `deploy_preview` — Trigger Cloudflare Pages preview, return URL

### System improvements
- Review node as plan checkpoint (Pi outputs what it'll use before starting)
- Load crouton skill context into agent prompts (.claude/skills/*.md)
- CI feedback workflow (GitHub Action → typecheck → webhook back to ThinkGraph)
- Deploy/sync node (pull + build on Pi after merges)
- Yjs for real-time canvas updates from assistant
- Structured questions from agents (like learnings, but for questions)

### CLI bugs to fix
- Generator creates createdAt/updatedAt in migrations but not in schema when useMetadata: false
- Generator creates duplicate parentId in schema and defaultValues for hierarchy collections
- orderBy references createdAt column that doesn't exist

---

## Late-session learnings (from Pi agent retrospectives)

### Skill routing doesn't match work type
- `compose` gets assigned for backend tool work (pm-tools.ts additions) — instructions say "build Vue pages" which is irrelevant
- `generate` gets assigned for bug fixes — instructions about crouton CLI are wrong
- **Root cause:** 6 node types are phase-based, not work-type-based. Instructions should be brief-aware, adapting to what the work actually is, not what phase it's in.

### Pi already has tools we were going to build
- Pi has Puppeteer/Chrome headless installed — `take_screenshot` pm-tool would duplicate built-in capability
- The missing piece isn't the tool, it's **artifact storage** — Pi can take screenshots but can't attach them to work items without `update_workitem`
- **Decision:** Don't wrap existing Pi tools. Instead, ensure `update_workitem` can accept image/file artifacts and the prompt tells Pi to use it.

### Deploy preview should be CI, not local
- `deploy_preview` pm-tool was planned to run `wrangler pages deploy` from the worktree
- But worktrees don't have `node_modules` — `nuxt build` would fail
- **Decision:** No deploy_preview tool needed. Cloudflare Pages auto-builds PR branches. Just wire the preview URL back to the work item via webhook/GitHub Action.

### Worker tooling needs modular structure
- pm-tools.ts is a single file with all PM tools — adding utility tools (screenshot, image gen) will make it unwieldy
- Should be a `tools/` directory with composable tool sets that can be mixed per session type
- Not urgent but will matter as tool count grows

### Env var documentation scattered
- REPLICATE_API_TOKEN, OPENAI_API_KEY, ANTHROPIC_API_KEY, webhook secrets — all needed by the worker but not documented in one place
- Need a `.env.example` in `apps/thinkgraph-worker/`

### Learnings need to become questions
- Many "learnings" from Pi are really questions: "should we wrap this tool or use the built-in?"
- Current format (title + detail) is a statement — user reads it and thinks "ok so what?"
- Needs: structured questions with answer options, inline answer form, answers flow to next node
- This is the biggest UX gap in the learning system

---

## Stats
- ~30 commits in this session
- 3 Pi-generated branches merged (architect awareness, discover two-mode, conversation persistence)
- 5 Pi tasks dispatched and completed
- ~15 learning nodes generated by Pi
- Assistant created and dispatched work items autonomously
- 11 tasks bulk-dispatched from assistant (3 accepted, 8 rejected at capacity)
