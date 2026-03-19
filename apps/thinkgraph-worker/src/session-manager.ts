/**
 * Manages Pi agent sessions — create, steer, abort, prompt, track lifecycle.
 *
 * Supports two modes:
 * - Legacy: single-prompt sessions dispatched from ThinkGraph (text-only terminal output)
 * - Rich: long-lived interactive sessions with structured events (full pi.dev-in-browser)
 *
 * Rich sessions stay alive after prompt completion, waiting for follow-up prompts
 * from the browser. They stream structured agent events (messages, tool calls, thinking)
 * instead of flat text lines.
 */
import {
  createAgentSession,
  SessionManager as PiSessionManager,
  AuthStorage,
  ModelRegistry,
} from '@mariozechner/pi-coding-agent'
import type { WorkerConfig } from './config.js'
import { SessionWebSocket } from './session-ws.js'
import type { AgentMessageEvent, AgentContentBlock } from './session-ws.js'
import { createThinkGraphTools } from './pi-extension.js'
import { createPMTools } from './pm-tools.js'
import { ofetch } from 'ofetch'

export interface DispatchPayload {
  nodeId: string
  graphId: string
  depth: string
  depthInstruction: string
  prompt: string
  context: string
  teamSlug: string
  nodeContent: string
  nodeType: string
  mode?: 'legacy' | 'rich'
  callbackUrl?: string
  skill?: string
  /** API collection path — 'thinkgraph-workitems' for PM work items, 'thinkgraph-nodes' for legacy */
  collectionPath?: string
  /** Team ID from the dispatch request — used instead of config.teamId when present */
  teamId?: string
}

interface ActiveSession {
  nodeId: string
  ws: SessionWebSocket
  session: any // AgentSession from Pi SDK
  abort: () => Promise<void>
  mode: 'legacy' | 'rich'
  promptQueue: string[]
  isProcessing: boolean
  messageCounter: number
  callbackUrl?: string
  accumulatedOutput: string[]
  collectionPath: string
  teamId: string
  outputFlushTimer?: ReturnType<typeof setInterval>
  lastFlushedLength: number
}

export class AgentSessionManager {
  private activeSessions = new Map<string, ActiveSession>()

  constructor(private config: WorkerConfig) {}

  get activeCount(): number {
    return this.activeSessions.size
  }

  get maxSessions(): number {
    return this.config.maxSessions
  }

  isRunning(nodeId: string): boolean {
    return this.activeSessions.has(nodeId)
  }

  /** Start a new Pi agent session for a dispatched node */
  async startSession(payload: DispatchPayload): Promise<void> {
    if (this.activeSessions.size >= this.config.maxSessions) {
      console.warn(`[session-manager] Max sessions reached (${this.config.maxSessions}), skipping ${payload.nodeId}`)
      return
    }

    if (this.activeSessions.has(payload.nodeId)) {
      console.warn(`[session-manager] Session already running for ${payload.nodeId}`)
      return
    }

    const mode = payload.mode || 'legacy'
    console.log(`[session-manager] Starting ${mode} session for node ${payload.nodeId}`)

    // Open WebSocket to ThinkGraph for terminal streaming
    const ws = new SessionWebSocket(this.config, payload.nodeId, {
      onSteer: (message) => this.handleSteer(payload.nodeId, message),
      onAbort: () => this.handleAbort(payload.nodeId),
      onPrompt: (text) => this.handlePrompt(payload.nodeId, text),
      onFollowUp: (text) => this.handleFollowUp(payload.nodeId, text),
      onUIResponse: (requestId, value) => this.handleUIResponse(payload.nodeId, requestId, value),
      onError: (err) => console.error(`[session-manager] WS error for ${payload.nodeId}:`, err.message),
      onClose: () => {},
    }, mode)
    await ws.connect()
    ws.sendStatus('thinking')

    // Register early so updateNodeStatus can find collectionPath and teamId
    const earlySession: ActiveSession = {
      nodeId: payload.nodeId,
      ws,
      session: null,
      abort: async () => {},
      mode,
      promptQueue: [],
      isProcessing: false,
      messageCounter: 0,
      callbackUrl: payload.callbackUrl,
      accumulatedOutput: [],
      collectionPath: payload.collectionPath || 'thinkgraph-nodes',
      teamId: payload.teamId || this.config.teamId,
      lastFlushedLength: 0,
    }
    this.activeSessions.set(payload.nodeId, earlySession)

    // Flush output to ThinkGraph every 3 seconds so the UI shows progress
    earlySession.outputFlushTimer = setInterval(() => {
      this.flushOutput(payload.nodeId)
    }, 3000)

    // Update node status to 'working' via HTTP API
    await this.updateNodeStatus(payload.nodeId, 'working')

    try {
      // Create tools — PM work items get PM tools, legacy gets thinking graph tools
      const isPM = payload.collectionPath === 'thinkgraph-workitems'
      const tools = isPM
        ? createPMTools(this.config, payload.nodeId, payload.teamId || this.config.teamId)
        : createThinkGraphTools(this.config, payload.graphId, payload.nodeId)

      // Build the prompt
      const agentPrompt = this.buildAgentPrompt(payload)

      // Create Pi agent session
      console.log(`[session-manager] Creating agent session for ${payload.nodeId} (workDir: ${this.config.workDir})`)
      const authStorage = AuthStorage.create()
      const modelRegistry = new ModelRegistry(authStorage)

      const { session } = await createAgentSession({
        cwd: this.config.workDir,
        sessionManager: PiSessionManager.inMemory(),
        authStorage,
        modelRegistry,
        customTools: tools,
      })

      // Update the early session entry with the real agent session
      const activeSession = this.activeSessions.get(payload.nodeId)!
      activeSession.session = session
      activeSession.abort = () => session.abort()

      // Subscribe to session events
      session.subscribe((event: any) => {
        if (mode === 'rich') {
          this.handleRichSessionEvent(payload.nodeId, event, ws, activeSession)
        } else {
          this.handleLegacySessionEvent(payload.nodeId, event, ws)
        }
      })

      // Start the agent work
      console.log(`[session-manager] Sending initial prompt for ${payload.nodeId}`)
      ws.sendStatus('working')
      activeSession.isProcessing = true
      await session.prompt(agentPrompt)
      activeSession.isProcessing = false

      if (mode === 'rich' && !payload.callbackUrl) {
        // Rich sessions stay alive — mark as idle, wait for more prompts
        console.log(`[session-manager] Initial prompt done for ${payload.nodeId}, session stays alive`)
        ws.sendStatus('idle')
        await this.updateNodeStatus(payload.nodeId, 'idle')

        // Process any queued prompts
        await this.processPromptQueue(payload.nodeId)
      } else {
        // HTTP dispatch or legacy: complete and callback
        this.stopFlushTimer(payload.nodeId)
        ws.sendDone('Agent session completed')
        await this.updateNodeStatus(payload.nodeId, 'done')
        await this.sendCallback(activeSession, 'done')
        ws.close()
        this.activeSessions.delete(payload.nodeId)
        console.log(`[session-manager] Session ended for ${payload.nodeId}`)
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[session-manager] Session error for ${payload.nodeId}:`, message)
      ws.sendError(message)
      this.stopFlushTimer(payload.nodeId)
      await this.updateNodeStatus(payload.nodeId, 'error')
      const failedSession = this.activeSessions.get(payload.nodeId)
      if (failedSession) {
        await this.sendCallback(failedSession, 'error', message)
      }
      ws.close()
      this.activeSessions.delete(payload.nodeId)
    }
  }

  /** Handle a new prompt from the browser (rich mode) */
  private async handlePrompt(nodeId: string, text: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active || active.mode !== 'rich') return

    console.log(`[session-manager] Prompt for ${nodeId}: ${text.slice(0, 80)}`)

    if (active.isProcessing) {
      // Queue it as follow-up
      active.promptQueue.push(text)
      console.log(`[session-manager] Queued prompt for ${nodeId} (${active.promptQueue.length} in queue)`)
    } else {
      // Execute immediately
      active.isProcessing = true
      active.ws.sendStatus('working')
      await this.updateNodeStatus(nodeId, 'working')

      try {
        await active.session.prompt(text)
      } catch (err) {
        console.error(`[session-manager] Prompt failed for ${nodeId}:`, err)
        active.ws.sendOutput(`[error] Prompt failed: ${err instanceof Error ? err.message : String(err)}`)
      }

      active.isProcessing = false
      active.ws.sendStatus('idle')
      await this.updateNodeStatus(nodeId, 'idle')

      // Process any queued prompts
      await this.processPromptQueue(nodeId)
    }
  }

  /** Handle a follow-up message from the browser */
  private async handleFollowUp(nodeId: string, text: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active) return

    console.log(`[session-manager] Follow-up for ${nodeId}: ${text.slice(0, 80)}`)

    if (active.isProcessing) {
      // Use Pi SDK's followUp (queues after current)
      try {
        await active.session.followUp(text)
      } catch (err) {
        console.error(`[session-manager] Follow-up failed for ${nodeId}:`, err)
      }
    } else {
      // Treat as prompt if idle
      await this.handlePrompt(nodeId, text)
    }
  }

  /** Process queued prompts */
  private async processPromptQueue(nodeId: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active || active.isProcessing) return

    while (active.promptQueue.length > 0) {
      const text = active.promptQueue.shift()!
      active.isProcessing = true
      active.ws.sendStatus('working')
      await this.updateNodeStatus(nodeId, 'working')

      try {
        await active.session.prompt(text)
      } catch (err) {
        console.error(`[session-manager] Queued prompt failed for ${nodeId}:`, err)
        active.ws.sendOutput(`[error] Prompt failed: ${err instanceof Error ? err.message : String(err)}`)
      }

      active.isProcessing = false
    }

    if (active.mode === 'rich') {
      active.ws.sendStatus('idle')
      await this.updateNodeStatus(nodeId, 'idle')
    }
  }

  /** Handle a steering message from the browser */
  private async handleSteer(nodeId: string, message: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active) return
    console.log(`[session-manager] Steering ${nodeId}: ${message.slice(0, 80)}`)
    try {
      await active.session.steer(message)
    }
    catch (err) {
      console.error(`[session-manager] Steer failed for ${nodeId}:`, err)
    }
  }

  /** Handle an abort command from the browser */
  private async handleAbort(nodeId: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active) return
    console.log(`[session-manager] Aborting ${nodeId}`)
    try {
      await active.abort()
    }
    catch (err) {
      console.error(`[session-manager] Abort failed for ${nodeId}:`, err)
    }
  }

  /** Handle extension UI response from browser */
  private async handleUIResponse(_nodeId: string, _requestId: string, _value: string): Promise<void> {
    // TODO: Wire up to Pi SDK's extension UI system once we understand the callback mechanism
    console.log(`[session-manager] UI response for ${_nodeId}: ${_requestId} = ${_value}`)
  }

  /** End a rich session (called when browser disconnects or explicitly closes) */
  async endSession(nodeId: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active) return

    console.log(`[session-manager] Ending session for ${nodeId}`)
    active.ws.sendDone('Session ended')
    await this.updateNodeStatus(nodeId, 'done')
    active.ws.close()
    this.activeSessions.delete(nodeId)
  }

  // ─── Event handlers ───

  /** Map Pi agent events to structured messages (rich mode) */
  private handleRichSessionEvent(nodeId: string, event: any, ws: SessionWebSocket, active: ActiveSession): void {
    switch (event.type) {
      case 'message_start': {
        // Start accumulating a new assistant message
        break
      }
      case 'message_update': {
        const content = event.message?.content
        if (!Array.isArray(content)) break

        const blocks: AgentContentBlock[] = []
        for (const item of content) {
          if (item.type === 'text' && item.text) {
            blocks.push({ type: 'text', text: item.text })
            // Store latest complete text (replaces previous — not incremental)
            active.accumulatedOutput = [item.text]
          }
          else if (item.type === 'tool_use') {
            blocks.push({
              type: 'tool_use',
              name: item.name,
              input: item.input,
              toolCallId: item.id,
            })
          }
          else if (item.type === 'thinking') {
            blocks.push({ type: 'thinking', thinking: item.thinking })
          }
        }

        if (blocks.length > 0) {
          const msg: AgentMessageEvent = {
            id: `msg-${++active.messageCounter}`,
            role: 'assistant',
            content: blocks,
            timestamp: Date.now(),
          }
          ws.sendAgentEvent(msg)
          // Also send as legacy output for backwards compat
          for (const block of blocks) {
            if (block.type === 'text' && block.text) {
              ws.sendOutput(block.text)
            } else if (block.type === 'tool_use') {
              ws.sendOutput(`🔧 ${block.name} ${JSON.stringify(block.input || {}).slice(0, 100)}`)
            } else if (block.type === 'thinking' && block.thinking) {
              ws.sendOutput(`💭 ${block.thinking.split('\n')[0].slice(0, 120)}`)
            }
          }
        }
        break
      }
      case 'tool_execution_end': {
        if (event.result) {
          const resultText = typeof event.result === 'string'
            ? event.result.slice(0, 500)
            : JSON.stringify(event.result).slice(0, 500)

          const msg: AgentMessageEvent = {
            id: `msg-${++active.messageCounter}`,
            role: 'system',
            content: [{
              type: 'tool_result',
              result: resultText,
              toolCallId: event.toolCallId || event.tool_use_id,
            }],
            timestamp: Date.now(),
          }
          ws.sendAgentEvent(msg)
          ws.sendOutput(`  ↳ ${resultText.slice(0, 120)}`)
        }
        break
      }
      case 'auto_compaction_start':
        ws.sendOutput('⚙ Compacting conversation...')
        break
      case 'auto_retry_start':
        ws.sendOutput(`⚙ Retrying (attempt ${event.attempt}/${event.maxAttempts})...`)
        break
    }
  }

  /** Map Pi agent events to text output (legacy mode) */
  private handleLegacySessionEvent(nodeId: string, event: any, ws: SessionWebSocket): void {
    const active = this.activeSessions.get(nodeId)
    switch (event.type) {
      case 'message_update': {
        const content = event.message?.content
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === 'text' && item.text) {
              ws.sendOutput(item.text)
              // Store latest complete text (replaces previous — not incremental)
              if (active) active.accumulatedOutput = [item.text]
            }
            else if (item.type === 'tool_use') {
              const inputSummary = Object.entries(item.input || {})
                .filter(([_, v]) => typeof v === 'string' && (v as string).length < 80)
                .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                .slice(0, 3)
                .join(' ')
              ws.sendOutput(`🔧 ${item.name} ${inputSummary}`)
            }
            else if (item.type === 'thinking') {
              const thought = (item.thinking || '').split('\n')[0].slice(0, 120)
              if (thought) ws.sendOutput(`💭 ${thought}`)
            }
          }
        }
        break
      }
      case 'tool_execution_end':
        if (event.result) {
          const result = typeof event.result === 'string'
            ? event.result.slice(0, 120)
            : JSON.stringify(event.result).slice(0, 120)
          ws.sendOutput(`  ↳ ${result}`)
        }
        break
      case 'auto_compaction_start':
        ws.sendOutput('⚙ Compacting conversation...')
        break
      case 'auto_retry_start':
        ws.sendOutput(`⚙ Retrying (attempt ${event.attempt}/${event.maxAttempts})...`)
        break
    }
  }

  /** Update node status via ThinkGraph HTTP API */
  private async updateNodeStatus(nodeId: string, status: string): Promise<void> {
    // Determine the correct API path and team based on the active session
    const active = this.activeSessions.get(nodeId)
    const collection = active?.collectionPath || 'thinkgraph-nodes'
    const teamId = active?.teamId || this.config.teamId
    try {
      await ofetch(`${this.config.thinkgraphUrl}/api/teams/${teamId}/${collection}/${nodeId}`, {
        method: 'PATCH',
        headers: {
          'Cookie': this.config.serviceToken,
          'Content-Type': 'application/json',
        },
        body: { status },
      })
    }
    catch (err) {
      console.error(`[session-manager] Failed to update node status:`, err)
    }
  }

  /** Build the prompt for the Pi agent based on work item type */
  private buildAgentPrompt(payload: DispatchPayload): string {
    // PM work items get type-specific prompts
    if (payload.collectionPath === 'thinkgraph-workitems') {
      return this.buildPMPrompt(payload)
    }

    // Legacy thinking graph prompt (kept for backwards compat)
    return this.buildLegacyPrompt(payload)
  }

  /** Build PM prompt dispatched per nodeType */
  private buildPMPrompt(payload: DispatchPayload): string {
    const header = `You are a Pi agent working on a crouton app project. You have been dispatched a "${payload.nodeType}" work item from ThinkGraph.

## Project Context

${payload.context}

## Work Item

ID: ${payload.nodeId}
Type: ${payload.nodeType}
Title: ${payload.nodeContent}
${payload.skill ? `Skill: ${payload.skill}` : ''}

${payload.prompt ? `## Brief\n\n${payload.prompt}\n\n` : ''}`

    let body: string
    switch (payload.nodeType) {
      case 'discover':
        body = this.discoverInstructions(payload); break
      case 'architect':
        body = this.architectInstructions(payload); break
      case 'generate':
        body = this.generateInstructions(payload); break
      case 'compose':
        body = this.composeInstructions(payload); break
      case 'review':
        body = this.reviewInstructions(payload); break
      case 'deploy':
        body = this.deployInstructions(payload); break
      default:
        body = this.generateInstructions(payload); break
    }

    return header + body + this.closingInstructions(payload.nodeType)
  }

  /**
   * Composable closing instructions — selects which blocks to include based on node type.
   *
   * Block matrix:
   * - outputBlock:        all types
   * - retrospectiveBlock: all types
   * - learningsBlock:     discover, architect, compose, generate
   * - questionsBlock:     discover, architect
   */
  private closingInstructions(nodeType: string): string {
    const blocks = [this.outputBlock(), this.retrospectiveBlock()]

    if (['discover', 'architect', 'compose', 'generate'].includes(nodeType)) {
      blocks.push(this.learningsBlock())
    }
    if (['discover', 'architect'].includes(nodeType)) {
      blocks.push(this.questionsBlock())
    }

    return blocks.join('\n')
  }

  /** Mandate the deliverable field */
  private outputBlock(): string {
    return `

## Before You Finish (MANDATORY)

Use \`update_workitem\` to set ALL of these fields:

1. **output** — your deliverable (the brief, schemas, summary of changes, review verdict, deploy URL, etc.)`
  }

  /** Free-text session reflection */
  private retrospectiveBlock(): string {
    return `
2. **retrospective** — free-text reflection on the session (displayed on the node card for humans to read)`
  }

  /** Structured actionable learnings array */
  private learningsBlock(): string {
    return `
3. **learnings** — structured array of ONLY actionable items. Each learning becomes a task node for the human to triage. Only include things that should change — not things that went well.

Example learnings (pyramid style — title is the point, detail explains):
\`\`\`json
[
  { "title": "Discover skill can't detect existing briefs", "detail": "When parent already has a brief, discover should switch to validation mode instead of generating from scratch. Currently always runs questionnaire.", "scope": "skill" },
  { "title": "Missing schemas block generate phase", "detail": "Velo custom collections have no schemas in apps/velo/schemas/. Architect phase needs to create them before CLI generator can run.", "scope": "process" }
]
\`\`\`

Scope values: \`skill\` (improve a skill prompt), \`tool\` (missing or broken tool), \`prompt\` (unclear instructions), \`infra\` (infrastructure/config issue), \`process\` (workflow improvement).

**Title rules:** 5-10 words max. The point, not the explanation. Must be scannable at a glance.
`
  }

  /** Surface open questions for human triage — discover & architect only */
  private questionsBlock(): string {
    return `
4. **questions** — surface 2-3 open questions that need human input before the next phase. These become "question" child nodes for the human to answer.

Example questions:
\`\`\`json
[
  { "title": "Should groups support nesting?", "detail": "The current design assumes flat groups. If we need group-in-group hierarchy, the data model and drag logic change significantly. Need a decision before architect phase." },
  { "title": "Authentication provider preference?", "detail": "Brief mentions auth but doesn't specify. Cloudflare Access, Lucia, or external OAuth? This affects the entire auth layer architecture." }
]
\`\`\`

Each question should be:
- **Specific** — not vague ("what about performance?") but pointed ("Should we cache at edge or origin?")
- **Blocking** — something that genuinely blocks the next phase if unanswered
- **Actionable** — the human can answer it in a sentence or two
`
  }

  /**
   * Detect whether ancestor context contains a substantive brief or output.
   * Looks for non-current entries in the context chain that have content beyond just a title.
   */
  private hasParentBrief(payload: DispatchPayload): boolean {
    if (!payload.context) return false
    // Context chain format: numbered entries like "1. **Title** (type, status)\n   content"
    // Current node is marked with "→ [CURRENT]"
    // If there are ancestor entries with real content (not just titles), parent has a brief
    const lines = payload.context.split('\n')
    let hasAncestorContent = false
    for (const line of lines) {
      // Skip the current node and its content
      if (line.includes('→ [CURRENT]')) break
      // Check for numbered entries with content that looks like a brief/output (multi-word content lines)
      if (/^\d+\.\s+\*\*/.test(line.trim())) {
        // This is an ancestor entry header — check if context has substantive content
        continue
      }
      // Content lines under ancestor entries (indented with 3 spaces)
      if (/^\s{3}\S/.test(line) && line.trim().length > 50) {
        hasAncestorContent = true
        break
      }
    }
    return hasAncestorContent
  }

  private discoverInstructions(payload: DispatchPayload): string {
    if (this.hasParentBrief(payload)) {
      return this.discoverValidationMode(payload)
    }
    return this.discoverQuestionnaireMode(payload)
  }

  /**
   * Mode A: Fresh discovery — no parent context exists.
   * Uses a structured questionnaire template to gather requirements.
   */
  private discoverQuestionnaireMode(_payload: DispatchPayload): string {
    return `## Instructions — Discovery (Questionnaire Mode)

No parent context was found, so your job is to build a comprehensive brief from scratch.

1. Read the work item title and any brief carefully
2. Based on what's described, produce a **structured discovery brief** using this template:

### Discovery Brief Template

**1. App Purpose**
- What does this app do? (one sentence)
- What problem does it solve?

**2. Users & Roles**
- Who are the primary users? (e.g., admin, member, guest)
- How many concurrent users are expected? (rough estimate: <10, 10-100, 100-1000, 1000+)
- What authentication method? (email/password, social login, SSO, none)

**3. Core Features** (must-have for v1)
- List each feature as a bullet with a one-line description
- Prioritize: what's the MVP vs nice-to-have?

**4. Data Model Sketch**
- What collections/entities are needed? (e.g., bookings, members, schedules)
- Key relationships between entities
- Any tree/hierarchical structures?

**5. Integrations**
- External services needed (payments, email, SMS, maps, etc.)
- Third-party APIs to connect with
- Import/export requirements

**6. Technical Constraints**
- Budget tier: hobby / startup / enterprise
- Timeline: days / weeks / months
- Hosting preferences (Cloudflare, Vercel, self-hosted)
- Offline/mobile requirements

**7. Content & Media**
- Rich text editing needed?
- File uploads / asset management?
- Multi-language / i18n requirements?

**8. Open Questions**
- List anything ambiguous that needs client clarification
- Flag assumptions you've made

Fill in as much as you can infer from the work item description. For anything you cannot determine, note it explicitly in Open Questions. Be specific and practical — this brief feeds directly into the architect phase.`
  }

  /**
   * Mode B: Validation mode — parent context already contains a brief.
   * Verify assumptions, flag gaps, and refine the existing brief.
   */
  private discoverValidationMode(_payload: DispatchPayload): string {
    return `## Instructions — Discovery (Validation Mode)

Parent context already contains a brief or discovery output. Your job is to **validate and refine**, not start from scratch.

1. Read the ancestor context chain carefully — it contains prior discovery work
2. Perform these validation steps:

### Step 1: Verify Assumptions
- List every assumption made in the parent brief
- For each, mark as: ✅ confirmed, ⚠️ needs clarification, or ❌ contradicted by new context
- Pay special attention to scope assumptions (what's in/out of v1)

### Step 2: Gap Analysis
Check the parent brief against this checklist and flag anything missing:
- [ ] User roles and permissions clearly defined
- [ ] Data model entities and relationships identified
- [ ] Core vs nice-to-have features separated
- [ ] Integration points specified (payments, auth, email, etc.)
- [ ] Technical constraints noted (budget, timeline, hosting)
- [ ] Content requirements clear (rich text, assets, i18n)
- [ ] User count / scale expectations set
- [ ] Authentication method decided

### Step 3: Conflict Detection
- Does the current work item's brief contradict anything in the parent?
- Are there scope creep signals (features that don't align with stated purpose)?
- Are there unstated dependencies between features?

### Step 4: Refined Brief
Produce an updated brief that:
- Incorporates the parent's work (don't repeat — reference and build on it)
- Resolves any contradictions found
- Fills gaps identified in Step 2
- Clearly marks what's new vs what's carried forward
- Lists remaining open questions that truly need human input

Keep it practical and specific. This refined brief feeds directly into the architect phase.`
  }

  private architectInstructions(payload: DispatchPayload): string {
    return `## Instructions — Architecture

Your job is to design the data model and technical architecture for this crouton app.

### Available Crouton Packages

Before designing custom schemas, map the app's requirements to these existing packages. Use them whenever they cover the needed functionality — only design custom collections for domain-specific data not covered by a package.

| Package | Capabilities |
|---------|-------------|
| **crouton** | Core framework — always included. Collections, CRUD, Drizzle ORM, composables. |
| **crouton-auth** | Teams, user sessions, OAuth providers, role-based access, invitations. |
| **crouton-pages** | CMS pages with flexible block system, page hierarchy, slug routing, SEO meta. |
| **crouton-assets** | File uploads, image management, media library, image transformations, CDN integration. |
| **crouton-editor** | TipTap-based rich text editor, collaborative editing support, custom extensions. |
| **crouton-flow** | Graph/canvas visualization, node-based workflows, connections, layout algorithms. |
| **crouton-bookings** | Slot-based booking system, capacity management, recurring schedules, availability windows. |

### Steps

1. Read the discovery brief and context from ancestor work items
2. **Map requirements to existing packages first:**
   - Identify which packages cover parts of the requirements
   - List the packages to extend (e.g., crouton-auth for user management, crouton-pages for content)
   - Note any package configuration or customization needed
3. Design custom crouton collection schemas only for domain-specific data:
   - Define each collection with its fields, types, and metadata
   - Use crouton field types: string, text, number, boolean, date, json, ref (with refTarget)
   - Include field meta: label, description, required, default, area (main/sidebar), group
   - Consider hierarchy (parentId) where tree structures make sense
   - Reference package-provided collections via ref fields where appropriate
4. Output the schemas as JSON that can be used with \`crouton config\`

Output format: structured markdown with:
- A "Package Selection" section listing which packages to use and why
- JSON schema blocks for each custom collection`
  }

  private worktreeInstructions(payload: DispatchPayload): string {
    const branchName = `thinkgraph/${payload.nodeId}`
    return `## Git Worktree Setup (MANDATORY)

Before doing any work, set up an isolated git worktree:

\`\`\`bash
cd ~/nuxt-crouton
git pull origin main
git worktree add /tmp/thinkgraph/${payload.nodeId} -b ${branchName} origin/main
cd /tmp/thinkgraph/${payload.nodeId}
\`\`\`

**IMPORTANT**: Do NOT run \`pnpm install\` in the worktree. This is a monorepo — the worktree shares node_modules with the main checkout via pnpm's workspace hoisting. Running install will fail due to postinstall scripts in sibling apps. Just work with the existing dependencies.

Similarly, do NOT run \`pnpm typecheck\` from the worktree — it requires the full Nuxt context from the main checkout. Type checking should be done from the main repo after merging.

After completing your work:

\`\`\`bash
cd /tmp/thinkgraph/${payload.nodeId}
git add -A
git commit -m "${payload.nodeType}(${payload.skill || payload.nodeType}): ${payload.nodeContent.slice(0, 50)}"
git push -u origin ${branchName}
\`\`\`

Then use \`update_workitem\` to set \`worktree\` to "${branchName}".

After pushing, use the \`create_pr\` tool to create a GitHub PR. Do NOT run \`gh pr create\` directly in bash — the tool handles shell quoting and updates the work item with the PR URL automatically.

Finally, clean up the worktree:
\`\`\`bash
cd ~/nuxt-crouton
git worktree remove /tmp/thinkgraph/${payload.nodeId}
\`\`\`
`
  }

  private generateInstructions(payload: DispatchPayload): string {
    return this.worktreeInstructions(payload) + `## Instructions — Generate

Your job is to generate crouton collections and code in the worktree.

1. Set up the git worktree as described above
2. In the worktree, run the crouton CLI to generate collections:
   - Create/update schema JSON files in \`apps/{appId}/schemas/\`
   - Run \`cd apps/{appId} && pnpm crouton config\` to generate collection code
   - Run \`pnpm run db:generate\` to create database migrations
3. Verify the generated code:
   - Check that the generated files look correct
   - Do NOT run pnpm typecheck from the worktree (it won't work — requires main checkout)
4. Commit, push, and update the work item as described above

The crouton CLI reads \`crouton.config.js\` and schema JSON files to generate:
- Server API routes (CRUD endpoints)
- Database schema (Drizzle ORM)
- Composables (useCollection queries/mutations)
- Components (Form, List)
- Types
`
  }

  private composeInstructions(payload: DispatchPayload): string {
    return this.worktreeInstructions(payload) + `## Instructions — Compose

Your job is to build pages and wire components in the worktree.

1. Set up the git worktree as described above
2. In the worktree, build the app pages:
   - Create/update Vue pages in \`apps/{appId}/app/pages/\`
   - Use Nuxt UI 4 components (UButton, UCard, UModal, UTable, UForm, etc.)
   - Wire generated collection composables (useCollectionQuery, useCollectionMutation)
   - Use \`<script setup lang="ts">\` — Composition API only
   - Add proper layouts, navigation, and responsive design
3. Apply theming if specified in the brief
4. Verify:
   - Check that pages look correct by reading the code
   - Do NOT run pnpm typecheck from the worktree (it won't work — requires main checkout)
5. Commit, push, and update the work item as described above

Key Nuxt UI 4 patterns:
- Modal: \`<UModal v-model="open"><template #content="{ close }">...</template></UModal>\`
- Form: \`<UForm :state="state" :schema="schema"><UFormField label="X" name="x"><UInput v-model="state.x" /></UFormField></UForm>\`
- Use USeparator (not UDivider), USwitch (not UToggle), UDropdownMenu (not UDropdown)
`
  }

  private reviewInstructions(payload: DispatchPayload): string {
    return `## Instructions — Review

Your job is to review the work produced by ancestor work items and provide feedback.

1. Read all ancestor work item outputs in the context above
2. If a worktree branch exists, check out and review the code:
   \`\`\`bash
   cd ~/nuxt-crouton
   git fetch origin
   git log --oneline origin/thinkgraph/... # check for branches
   \`\`\`
3. Evaluate the work against the original brief:
   - Does it meet the requirements?
   - Is the code quality acceptable?
   - Are there missing features or bugs?
   - Is the data model sound?
4. Produce a structured review:
   - **Verdict**: approve, request-changes, or needs-discussion
   - **What's good**: things done well
   - **Issues**: specific problems found (with file paths if applicable)
   - **Suggestions**: improvements for the next iteration
`
  }

  private deployInstructions(payload: DispatchPayload): string {
    if (payload.skill === 'worker-sync') {
      return this.workerSyncInstructions()
    }
    return this.cloudflareDeployInstructions()
  }

  private workerSyncInstructions(): string {
    return `## Instructions — Worker Sync

Your job is to update the Pi worker to the latest main branch.

1. Pull the latest changes from main:
   \`\`\`bash
   cd ~/nuxt-crouton
   git pull origin main
   \`\`\`
2. Rebuild the thinkgraph-worker:
   \`\`\`bash
   cd apps/thinkgraph-worker
   pnpm build
   \`\`\`
3. Verify the build succeeded (check exit code and output)
4. If the build fails, read the error output and report it in your output — do NOT attempt to fix code
5. Report the git SHA that was pulled and whether the build succeeded

**IMPORTANT**: Do NOT restart the worker process — the PM will handle that separately.
`
  }

  private cloudflareDeployInstructions(): string {
    return `## Instructions — Deploy (Cloudflare Pages)

Your job is to deploy the crouton app to Cloudflare Pages.

1. Check if there's a worktree branch to deploy from ancestor work items
2. If deploying from a branch:
   \`\`\`bash
   cd ~/nuxt-crouton
   git fetch origin
   git checkout {branch}
   \`\`\`
3. Build and deploy:
   \`\`\`bash
   cd apps/{appId}
   pnpm run db:migrate:prod  # Apply any pending migrations
   pnpm run cf:deploy         # Deploy to Cloudflare Pages
   \`\`\`
4. If cf:deploy is not available, use wrangler directly:
   \`\`\`bash
   npx nuxt prepare && npx nuxt build
   npx wrangler pages deploy dist/
   \`\`\`
5. Capture the deployed URL
6. Use \`update_workitem\` to set \`deployUrl\` to the preview/production URL
`
  }

  /** Legacy thinking graph prompt (old exploration mode) */
  private buildLegacyPrompt(payload: DispatchPayload): string {
    return `You are responding to a node in a ThinkGraph thinking canvas. The user dispatched a "${payload.nodeType}" node to you. Your job is to respond thoughtfully by creating child nodes that advance the thinking.

## Graph Context

${payload.context}

## The Node You're Responding To

ID: ${payload.nodeId}
Type: ${payload.nodeType}
Content: ${payload.nodeContent}

${payload.prompt ? `## User Instructions\n\n${payload.prompt}\n\n` : ''}## Instructions

1. Read the context above carefully
2. Create child nodes under node "${payload.nodeId}" that advance the thinking
3. ${payload.depthInstruction}
4. Each node should be ONE discrete, atomic thought — something the user can branch from
5. Use appropriate node types: idea, insight, question, or decision
6. Go deep rather than broad — follow the most promising thread

## How to Create Nodes

Use the \`create_node\` tool. Each node has three parts:
- **title**: Short post-it label (5-10 words max, like a sticky note headline)
- **brief**: The actual thought (1-2 sentences explaining the idea)
- **nodeType**: one of "idea", "insight", "question", "decision"
- **parentId**: defaults to the dispatched node, or use a previously created node's ID to chain deeper

## Rules

- Title = short headline (post-it style). Brief = the explanation.
- Each node = ONE atomic thought the user can branch from
- Star important insights with starred: true
- Be substantive — no filler
- Reference specific details from the context when relevant
- After creating all child nodes, use \`update_node\` on the dispatched node (ID: "${payload.nodeId}") to set:
  - \`brief\`: 1-line summary of what you explored
  - \`output\`: a short handoff summary (what was concluded, what to explore next)`
  }

  /** Flush accumulated output to ThinkGraph work item (progressive updates).
   *  For PM dispatches, writes to `_liveOutput` so it doesn't clobber the real
   *  `output` field that Pi sets deliberately via update_workitem tool.
   *  For legacy dispatches, writes directly to `output`. */
  private async flushOutput(nodeId: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active || active.accumulatedOutput.length === 0) return

    const currentOutput = active.accumulatedOutput[0] || ''
    if (currentOutput.length === active.lastFlushedLength) return // No new output

    active.lastFlushedLength = currentOutput.length
    const collection = active.collectionPath || 'thinkgraph-nodes'
    const teamId = active.teamId || this.config.teamId
    const isPM = collection === 'thinkgraph-workitems'

    try {
      await ofetch(`${this.config.thinkgraphUrl}/api/teams/${teamId}/${collection}/${nodeId}`, {
        method: 'PATCH',
        headers: {
          'Cookie': this.config.serviceToken,
          'Content-Type': 'application/json',
        },
        // PM: preview in _liveOutput, don't clobber tool-written output
        // Legacy: write directly to output
        body: isPM ? { _liveOutput: currentOutput } : { output: currentOutput },
      })
    }
    catch {
      // Silent — flush is best-effort
    }
  }

  /** Stop the output flush timer for a session */
  private stopFlushTimer(nodeId: string): void {
    const active = this.activeSessions.get(nodeId)
    if (active?.outputFlushTimer) {
      clearInterval(active.outputFlushTimer)
      active.outputFlushTimer = undefined
    }
  }

  /** Send callback to ThinkGraph webhook when session completes */
  private async sendCallback(session: ActiveSession, status: 'done' | 'error', error?: string): Promise<void> {
    if (!session.callbackUrl) return

    try {
      const isPM = session.collectionPath === 'thinkgraph-workitems'
      // PM dispatches: Pi writes output deliberately via update_workitem tool.
      // Don't overwrite it with streaming text. Only send status + error.
      const body: Record<string, unknown> = {
        workItemId: session.nodeId,
        status,
      }
      if (error) body.error = error
      if (!isPM) {
        // Legacy: send accumulated streaming output as the result
        const output = (session.accumulatedOutput[0] || '').trim()
        if (output) body.output = output
      }

      await ofetch(session.callbackUrl, {
        method: 'POST',
        headers: {
          'Cookie': this.config.serviceToken,
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.WEBHOOK_SECRET || '',
        },
        body,
      })
      console.log(`[session-manager] Callback sent for ${session.nodeId} → ${status}`)
    }
    catch (err) {
      console.error(`[session-manager] Callback failed for ${session.nodeId}:`, err instanceof Error ? err.message : err)
    }
  }

  /** Abort all active sessions (for graceful shutdown) */
  async abortAll(): Promise<void> {
    const promises = Array.from(this.activeSessions.values()).map(async (s) => {
      try { await s.abort() } catch {}
    })
    await Promise.allSettled(promises)
  }
}
