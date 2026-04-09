/**
 * Manages Pi agent sessions — create, steer, abort, prompt, track lifecycle.
 *
 * All real-time communication flows through Yjs:
 * - Agent status/output → written to node data fields in Y.Map
 * - Bidirectional control (steer, prompt, abort) → observed from Y.Map changes
 * - Presence → Pi agent shows as a collaborator on the canvas
 *
 * HTTP webhook callback is kept for stage progression (analyst→builder→reviewer etc.)
 * which triggers server-side logic that Yjs can't handle.
 */
import {
  createAgentSession,
  SessionManager as PiSessionManager,
  AuthStorage,
  ModelRegistry,
} from '@mariozechner/pi-coding-agent'
import type { WorkerConfig } from './config.js'
import type { YjsFlowClient } from './yjs-client.js'
import type { YjsFlowPool, YjsPagePool } from './yjs-pool.js'
import { createThinkGraphTools } from './pi-extension.js'
import { createPMTools } from './pm-tools.js'
import { createPageTools } from './page-tools.js'
import { createCommentTools } from './comment-tools.js'
import { createFileDiffTools } from './file-diff-tools.js'
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
  /** API collection path — always 'thinkgraph-nodes' (unified collection) */
  collectionPath?: string
  /** Team ID from the dispatch request — used instead of config.teamId when present */
  teamId?: string
  /** Pipeline stage — analyst, builder, reviewer, launcher, merger */
  stage?: string
  /** Traffic light signal from previous stage — green, orange, red */
  signal?: string
}

interface ActiveSession {
  nodeId: string
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
  /** Last signal set by the agent via update_workitem tool */
  lastSignal?: string
  /** Full conversation log for compression — captures key events */
  conversationLog: string[]
  /** Pipeline stage for this session */
  stage?: string
  /** Accumulated token usage from session events */
  tokenUsage: { inputTokens: number; outputTokens: number }
  /** Yjs client for this session's canvas */
  yjsClient: YjsFlowClient | null
  /** Canvas/flow ID for pool release */
  graphId: string
}

export class AgentSessionManager {
  private activeSessions = new Map<string, ActiveSession>()
  private yjsPool: YjsFlowPool | null = null
  private pagePool: YjsPagePool | null = null

  constructor(private config: WorkerConfig) {}

  /** Set the Yjs flow pool — called from index.ts */
  setYjsPool(pool: YjsFlowPool): void {
    this.yjsPool = pool
  }

  /** Set the Yjs page pool — called from index.ts */
  setPagePool(pool: YjsPagePool): void {
    this.pagePool = pool
  }


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

    // Acquire a Yjs client for this project's flow room
    let yjsClient: YjsFlowClient | null = null
    let resolvedFlowId: string | null = null
    if (this.yjsPool && payload.graphId) {
      try {
        // Resolve projectId → flow config ID (the browser's Yjs room key)
        resolvedFlowId = await this.yjsPool.resolveFlowId(
          payload.graphId,
          payload.teamId || this.config.teamId,
        )
        if (resolvedFlowId) {
          yjsClient = await this.yjsPool.acquire(resolvedFlowId)
        } else {
          console.warn(`[session-manager] No flow room for project ${payload.graphId} — Yjs disabled for this session`)
        }
      } catch (err) {
        console.warn(`[session-manager] Yjs acquire failed for project ${payload.graphId}: ${err instanceof Error ? err.message : err}`)
      }
    }

    // Update presence — Pi agent is now working on this node
    yjsClient?.sendAwareness('thinking', payload.nodeId)

    // Set agent status on the node via Yjs
    yjsClient?.setAgentStatus(payload.nodeId, 'thinking')
    yjsClient?.appendAgentLog(payload.nodeId, {
      type: 'status',
      text: 'Session started',
    })

    // Register session
    const activeSession: ActiveSession = {
      nodeId: payload.nodeId,
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
      conversationLog: [],
      stage: payload.stage,
      tokenUsage: { inputTokens: 0, outputTokens: 0 },
      yjsClient,
      graphId: resolvedFlowId || payload.graphId,
    }
    this.activeSessions.set(payload.nodeId, activeSession)

    // Flush output to ThinkGraph every 3 seconds (DB persistence for _liveOutput)
    activeSession.outputFlushTimer = setInterval(() => {
      this.flushOutput(payload.nodeId)
    }, 3000)

    // Update node status to 'working' via HTTP API (for DB persistence)
    await this.updateNodeStatus(payload.nodeId, 'working')

    try {
      // Create tools — nodes with pipeline stages get PM tools, others get thinking graph tools
      const hasPipeline = !!payload.stage
      const sessionTeamId = payload.teamId || this.config.teamId
      const baseTools = hasPipeline
        ? createPMTools(this.config, payload.nodeId, sessionTeamId, {
          onSignal: (signal) => { activeSession.lastSignal = signal },
          stage: payload.stage,
        })
        : yjsClient
          ? createThinkGraphTools(yjsClient, payload.graphId, payload.nodeId)
          : [] // No Yjs client — tools won't work but session can still run

      // PR 2: page-room tools — Pi can append blocks/buttons into the slideover editor.
      // These are injected alongside the existing tool sets so any skill (PM stage or
      // thinking graph) can write into the per-node Notion-style editor.
      const pageTools = this.pagePool
        ? createPageTools(this.pagePool, sessionTeamId, payload.nodeId)
        : []
      // PR 3: comment-thread tools — Pi can open / reply to / resolve anchored
      // comment threads on the same per-node page room. Shares the page pool with
      // page-tools so an open + reply pair reuses the same socket.
      const commentTools = this.pagePool
        ? createCommentTools(this.pagePool, sessionTeamId, payload.nodeId)
        : []
      // PR 4: file-diff tool — Pi can append inline read-only unified diffs
      // into the same per-node page room. Shares the page pool with the other
      // page-writing tools so a single Pi run reuses the same socket.
      const fileDiffTools = this.pagePool
        ? createFileDiffTools(this.pagePool, sessionTeamId, payload.nodeId)
        : []
      const tools = [...baseTools, ...pageTools, ...commentTools, ...fileDiffTools]

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

      // Update the session entry with the real agent session
      activeSession.session = session
      activeSession.abort = () => session.abort()

      // Subscribe to session events — write to Yjs instead of WebSocket
      session.subscribe((event: any) => {
        this.handleSessionEvent(payload.nodeId, event, activeSession)
      })

      // Start the agent work
      console.log(`[session-manager] Sending initial prompt for ${payload.nodeId}`)
      yjsClient?.setAgentStatus(payload.nodeId, 'working')
      yjsClient?.sendAwareness('working', payload.nodeId)
      activeSession.isProcessing = true
      await session.prompt(agentPrompt)
      activeSession.isProcessing = false

      if (mode === 'rich' && !payload.callbackUrl) {
        // Rich sessions stay alive — mark as idle, wait for more prompts
        console.log(`[session-manager] Initial prompt done for ${payload.nodeId}, session stays alive`)
        yjsClient?.setAgentStatus(payload.nodeId, 'idle')
        yjsClient?.sendAwareness('idle', payload.nodeId)
        await this.updateNodeStatus(payload.nodeId, 'idle')

        // Process any queued prompts
        await this.processPromptQueue(payload.nodeId)
      } else {
        // HTTP dispatch or legacy: complete and callback
        this.stopFlushTimer(payload.nodeId)
        yjsClient?.setAgentStatus(payload.nodeId, 'done')
        yjsClient?.appendAgentLog(payload.nodeId, {
          type: 'status',
          text: 'Session completed',
        })
        yjsClient?.sendAwareness('idle', null)
        await this.updateNodeStatus(payload.nodeId, 'done')
        this.cleanupSession(payload.nodeId)
        console.log(`[session-manager] Session ended for ${payload.nodeId}`)
        await this.sendCallback(activeSession, 'done')
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[session-manager] Session error for ${payload.nodeId}:`, message)
      yjsClient?.setAgentStatus(payload.nodeId, 'error')
      yjsClient?.appendAgentLog(payload.nodeId, {
        type: 'error',
        text: message,
      })
      yjsClient?.sendAwareness('error', payload.nodeId)
      this.stopFlushTimer(payload.nodeId)
      await this.updateNodeStatus(payload.nodeId, 'error')
      const failedSession = this.activeSessions.get(payload.nodeId)
      if (failedSession) {
        await this.sendCallback(failedSession, 'error', message)
      }
      this.cleanupSession(payload.nodeId)
    }
  }

  /** Handle a new prompt from the browser (via Yjs observation) */
  handlePrompt(nodeId: string, text: string): void {
    const active = this.activeSessions.get(nodeId)
    if (!active || active.mode !== 'rich') return

    console.log(`[session-manager] Prompt for ${nodeId}: ${text.slice(0, 80)}`)

    if (active.isProcessing) {
      active.promptQueue.push(text)
      console.log(`[session-manager] Queued prompt for ${nodeId} (${active.promptQueue.length} in queue)`)
    } else {
      active.isProcessing = true
      active.yjsClient?.setAgentStatus(nodeId, 'working')
      active.yjsClient?.sendAwareness('working', nodeId)
      this.updateNodeStatus(nodeId, 'working')

      active.session.prompt(text)
        .then(() => {
          active.isProcessing = false
          active.yjsClient?.setAgentStatus(nodeId, 'idle')
          active.yjsClient?.sendAwareness('idle', nodeId)
          this.updateNodeStatus(nodeId, 'idle')
          this.processPromptQueue(nodeId)
        })
        .catch((err: Error) => {
          console.error(`[session-manager] Prompt failed for ${nodeId}:`, err)
          active.yjsClient?.appendAgentLog(nodeId, {
            type: 'error',
            text: `Prompt failed: ${err.message}`,
          })
          active.isProcessing = false
        })
    }
  }

  /** Handle a follow-up message from the browser */
  handleFollowUp(nodeId: string, text: string): void {
    const active = this.activeSessions.get(nodeId)
    if (!active) return

    console.log(`[session-manager] Follow-up for ${nodeId}: ${text.slice(0, 80)}`)

    if (active.isProcessing) {
      active.session.followUp(text).catch((err: Error) => {
        console.error(`[session-manager] Follow-up failed for ${nodeId}:`, err)
      })
    } else {
      this.handlePrompt(nodeId, text)
    }
  }

  /** Process queued prompts */
  private async processPromptQueue(nodeId: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active || active.isProcessing) return

    while (active.promptQueue.length > 0) {
      const text = active.promptQueue.shift()!
      active.isProcessing = true
      active.yjsClient?.setAgentStatus(nodeId, 'working')
      active.yjsClient?.sendAwareness('working', nodeId)
      await this.updateNodeStatus(nodeId, 'working')

      try {
        await active.session.prompt(text)
      } catch (err) {
        console.error(`[session-manager] Queued prompt failed for ${nodeId}:`, err)
        active.yjsClient?.appendAgentLog(nodeId, {
          type: 'error',
          text: `Prompt failed: ${err instanceof Error ? err.message : String(err)}`,
        })
      }

      active.isProcessing = false
    }

    if (active.mode === 'rich') {
      active.yjsClient?.setAgentStatus(nodeId, 'idle')
      active.yjsClient?.sendAwareness('idle', nodeId)
      await this.updateNodeStatus(nodeId, 'idle')
    }
  }

  /** Handle a steering message from the browser (via Yjs observation) */
  handleSteer(nodeId: string, message: string): void {
    const active = this.activeSessions.get(nodeId)
    if (!active) return
    console.log(`[session-manager] Steering ${nodeId}: ${message.slice(0, 80)}`)
    active.session.steer(message).catch((err: Error) => {
      console.error(`[session-manager] Steer failed for ${nodeId}:`, err)
    })
  }

  /** Handle an abort command from the browser (via Yjs observation) */
  handleAbort(nodeId: string): void {
    const active = this.activeSessions.get(nodeId)
    if (!active) return
    console.log(`[session-manager] Aborting ${nodeId}`)
    active.abort().catch((err: Error) => {
      console.error(`[session-manager] Abort failed for ${nodeId}:`, err)
    })
  }

  /** End a rich session */
  async endSession(nodeId: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active) return

    console.log(`[session-manager] Ending session for ${nodeId}`)
    active.yjsClient?.setAgentStatus(nodeId, 'done')
    active.yjsClient?.appendAgentLog(nodeId, {
      type: 'status',
      text: 'Session ended',
    })
    active.yjsClient?.sendAwareness('idle', null)
    await this.updateNodeStatus(nodeId, 'done')
    this.cleanupSession(nodeId)
  }

  /** Remove session and release pool reference */
  private cleanupSession(nodeId: string): void {
    const active = this.activeSessions.get(nodeId)
    if (!active) return
    // Release the canvas room reference back to the pool
    if (this.yjsPool && active.graphId) {
      this.yjsPool.release(active.graphId)
    }
    this.activeSessions.delete(nodeId)
  }

  // ─── Event handler ───

  /** Map Pi agent events to Yjs node data updates */
  private handleSessionEvent(nodeId: string, event: any, active: ActiveSession): void {
    const yjs = active.yjsClient
    switch (event.type) {
      case 'message_start': {
        if (event.message?.usage) {
          active.tokenUsage.inputTokens += event.message.usage.input_tokens || 0
        }
        break
      }
      case 'message_update': {
        if (event.message?.usage) {
          const usage = event.message.usage
          active.tokenUsage.inputTokens = Math.max(active.tokenUsage.inputTokens, usage.input_tokens || 0)
          active.tokenUsage.outputTokens = Math.max(active.tokenUsage.outputTokens, usage.output_tokens || 0)
        }
        const content = event.message?.content
        if (!Array.isArray(content)) break

        // Stable per-message id so streaming text/thinking items collapse to
        // one entry per content slot instead of one per delta event.
        const messageId: string = event.message?.id || `msg-${nodeId}`

        for (let i = 0; i < content.length; i++) {
          const item = content[i]
          if (item.type === 'text' && item.text) {
            active.accumulatedOutput = [item.text]
            // Upsert by (messageId, slot index) so subsequent message_update
            // events for the same message overwrite this entry instead of
            // appending. Without this, a 200-token text reply produces ~200
            // duplicate log entries with the same timestamp.
            yjs?.upsertAgentLog(nodeId, `${messageId}:text:${i}`, {
              type: 'text',
              text: item.text,
            })
            if (item.text.length > 20) {
              active.conversationLog.push(`[assistant] ${item.text.slice(0, 500)}`)
            }
          }
          else if (item.type === 'tool_use') {
            // tool_use is one-shot per content slot — appears once when the
            // model commits to the call. Plain append is correct.
            yjs?.appendAgentLog(nodeId, {
              type: 'tool_use',
              name: item.name,
              input: item.input,
            })
            active.conversationLog.push(`[tool] ${item.name}`)
          }
          else if (item.type === 'thinking') {
            // Same upsert pattern as text — thinking blocks stream too.
            // Keep the full thought (truncated to 500 chars), not just the
            // first line.
            yjs?.upsertAgentLog(nodeId, `${messageId}:thinking:${i}`, {
              type: 'thinking',
              text: (item.thinking || '').slice(0, 500),
            })
          }
        }
        break
      }
      case 'tool_execution_end': {
        if (event.result) {
          // event.result follows Anthropic's content-block shape:
          //   { content: [{ type: 'text', text: '...' }, ...] }
          // Extract the inner text instead of stringifying the whole envelope,
          // which produces unreadable raw JSON in the log feed.
          const resultText = extractToolResultText(event.result)

          yjs?.appendAgentLog(nodeId, {
            type: 'tool_result',
            result: resultText,
          })
        }
        break
      }
      case 'auto_compaction_start':
        yjs?.appendAgentLog(nodeId, {
          type: 'status',
          text: 'Compacting conversation...',
        })
        break
      case 'auto_retry_start':
        yjs?.appendAgentLog(nodeId, {
          type: 'status',
          text: `Retrying (attempt ${event.attempt}/${event.maxAttempts})...`,
        })
        break
    }
  }

  /** Update node status via ThinkGraph HTTP API (DB persistence) */
  private async updateNodeStatus(nodeId: string, status: string): Promise<void> {
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
    if (payload.stage) {
      return this.buildPMPrompt(payload)
    }
    return this.buildLegacyPrompt(payload)
  }

  /** Build PM prompt dispatched per nodeType, routed by pipeline stage */
  private buildPMPrompt(payload: DispatchPayload): string {
    const stage = payload.stage || this.inferStage(payload.nodeType)

    const header = `You are a Pi agent working on a crouton app project. You have been dispatched a "${payload.nodeType}" work item from ThinkGraph.

## Project Context

${payload.context}

## Work Item

ID: ${payload.nodeId}
Type: ${payload.nodeType}
Stage: ${stage}
Title: ${payload.nodeContent}
${payload.skill ? `Skill: ${payload.skill}` : ''}

${payload.prompt ? `## Brief\n\n${payload.prompt}\n\n` : ''}`

    let body: string
    switch (stage) {
      case 'analyst':
        body = this.analystInstructions(payload)
        break
      case 'coach':
        body = this.coachInstructions(payload)
        break
      case 'builder':
        body = this.builderInstructions(payload)
        break
      case 'reviewer':
        body = this.reviewerInstructions(payload)
        break
      case 'launcher':
        body = this.launcherInstructions(payload)
        break
      case 'merger':
        body = this.mergerInstructions(payload)
        break
      case 'optimizer':
        body = this.optimizerInstructions(payload)
        break
      default:
        body = this.builderInstructions(payload)
        break
    }

    return header + body + this.pipelineClosingInstructions(stage)
  }

  /** Map old nodeType to initial pipeline stage for backwards compat */
  private inferStage(_nodeType: string): string {
    return 'analyst'
  }

  // ─── Pipeline stage instructions ───
  // (kept exactly as before — these are prompt templates, not transport)

  private analystInstructions(payload: DispatchPayload): string {
    return `## Instructions — Analyst Gate

Your job is to evaluate this work item BEFORE any real work begins. You are a gate — decide whether this brief is ready for the builder stage.

**CRITICAL: You are an evaluator, NOT an executor.**
- Do NOT create or modify any files
- Do NOT create worktrees or branches
- Do NOT run builds, generators, or code modifications
- You MAY run read-only shell commands: \`grep\`, \`find\`, \`cat\`, \`git log\`, \`git show\`, \`ls\`
- Your ONLY write action is calling \`update_workitem\` to set your signal
- Read the codebase to understand context, but change NOTHING

### Step 1: Read & Understand
- Read the project conventions first: \`cat ~/nuxt-crouton/CLAUDE.md\`
- Read the work item title, brief, and full ancestor context chain
- **Search the codebase before asking questions.** If the brief mentions something you can't find (a skill, a tool, a component), grep for it broadly before concluding it doesn't exist. Check \`session-manager.ts\`, \`CLAUDE.md\` files, and package directories.
- Understand what is being asked and why

### Step 2: Evaluate
Check these criteria:
- **Necessity**: Is this actually needed? Is there an existing solution, a simpler alternative, or a reason this work shouldn't be done? Be defensive — challenge the premise before greenlighting.
- **Clarity**: Is the brief specific enough to act on? Would a builder know exactly what to do?
- **Scope**: Is this reasonably scoped? Not too big, not too small?
- **Duplication**: Does this duplicate work already done or in progress? Search the codebase — don't just check ancestor context.
- **Dependencies**: Are there unmet prerequisites that should be done first?
- **Package mapping**: Which crouton packages/files does this work target? Be specific (file paths, not vague package names).

### Step 2b: Recognize Question Briefs

**IMPORTANT**: Not every brief is a work item. Some briefs are **exploratory questions** — "what are my options?", "how should we handle X?", "what's the best approach for Y?". These are valid and valuable.

If the brief is a question or exploration request:
- Do NOT reject it as "not actionable" — that kills a legitimate ask
- **Do the research** — read the codebase, understand the context, identify concrete options
- Signal **ORANGE** with your analysis and lettered options for the human to pick
- The human can then either pick an option (which becomes the actionable brief) or close the item satisfied with the answer

A question brief answered well is a completed task. A question brief rejected as "not actionable" is a broken gate.

### Step 3: Signal

Use \`update_workitem\` to set your signal:

**GREEN** (brief is ready — advance to builder):
- Set \`signal\` to \`"green"\`
- Set \`status\` to \`"done"\`
- Set \`output\` to a short analyst summary: what the work is, which package it targets, any notes for the builder
- Do NOT set \`stage\` — the system handles stage advancement automatically
- **Optional: \`skipTo\`** — if this is a trivial fix that doesn't need all stages (e.g., skip reviewer, go straight to merger), set \`skipTo\` to the target stage name. Only skip when genuinely trivial (typo fix, config change, single-line fix). When in doubt, don't skip.

**ORANGE** (has questions or answering a question brief — pause for human):
- Set \`signal\` to \`"orange"\`
- Set \`status\` to \`"waiting"\`
- Set \`assignee\` to \`"human"\`
- Set \`output\` to your questions or analysis — each question MUST be answerable:
  - Provide concrete lettered options the human can pick from — as many as make sense (typically 2-6)
  - Never write statements disguised as questions — if you found a problem, propose solutions
  - The human should be able to answer each question with a single letter or short phrase
  - Bad: "useFlowContainerDetection only detects card-over-group overlap" (statement, not a question)
  - Good: "Existing composable doesn't support card-on-card. Options: (a) extend useFlowContainerDetection, (b) new composable, (c) handle directly in project page?"
- For question briefs: include your research, recommendation, and lettered options. The human picks one or closes the item.

**RED** (should not be done — reject it):
- Set \`signal\` to \`"red"\`
- Set \`status\` to \`"blocked"\`
- Set \`output\` to the reason — duplicates existing work, out of scope, contradicts architecture, etc.
- RED is for work that **should not happen** — not for questions you can answer. If you can research the answer, do it and signal ORANGE.
- Still use red for: duplicated work, contradicts architecture, references things that genuinely don't exist after thorough search.

**IMPORTANT — learnings vs questions:**
- If you have doubts, concerns, or questions about the work → signal **ORANGE** and ask the human. Do NOT create learnings with your doubts.
- Learnings are ONLY for process improvements that apply to future pipeline runs (e.g., "analyst prompt should include X"). Never use learnings to express concerns about the current work item.
- If you signal green, you are saying "this brief is ready for a builder." Do not signal green and then dump concerns into learnings — that defeats the purpose of the gate.
- If the brief is genuinely unclear AND you can't resolve it by reading the codebase → signal **ORANGE** with clarifying questions, not RED.
- Only signal RED when the work genuinely should not be done — not when the brief is a question you can answer.
- An empty learnings array is perfectly fine. Most analyst runs should have zero learnings.`
  }

  private builderInstructions(payload: DispatchPayload): string {
    return this.worktreeInstructions(payload) + `## Instructions — Builder

Your job is to execute the work described in the brief. The brief is your contract.

### Step 1: Read Project Conventions (MANDATORY — do this first)

Before writing any code, read these files from the project root:

\`\`\`bash
cat ~/nuxt-crouton/CLAUDE.md
cat ~/nuxt-crouton/.claude/skills/commit/SKILL.md
cat ~/nuxt-crouton/.claude/skills/sync-docs/SKILL.md
\`\`\`

These contain the project's coding conventions, commit format, and documentation sync rules. Follow them exactly.

If your work involves .vue files with user-visible text:
\`\`\`bash
cat ~/nuxt-crouton/.claude/skills/i18n-check/SKILL.md
\`\`\`

If your brief involves creating/modifying CRUD collections or schemas:
\`\`\`bash
cat ~/nuxt-crouton/.claude/skills/crouton.md
\`\`\`

### Step 2: Execute the Work

Follow the brief. Use the conventions from the files you just read.

### Step 3: Screenshot Your Work

After completing visual changes, take screenshots and upload them as deliverables:
1. Use Playwright to take a screenshot of the result
2. Use \`upload_screenshot\` to upload it — this attaches it to your work item as an artifact
3. Include a descriptive label (e.g., "homepage-after-fix", "new-sidebar-layout")

This is especially valuable for UI work — the reviewer and human can see what you built without running the code.

### Step 4: Pre-Commit Checks

Before committing:
1. **i18n** — if you touched .vue files, check for hardcoded strings (per i18n-check skill)
2. **Docs sync** — if you changed public API (composables, components, endpoints), update the relevant CLAUDE.md (per sync-docs skill)
3. **Commit format** — follow the commit conventions from the commit skill

### Step 5: Commit, Push, Create PR

Follow the worktree instructions above to commit, push, and create a PR.

**MANDATORY**: Use \`update_workitem\` to set \`worktree\` to the branch name (e.g., \`thinkgraph/abc123\`) along with \`output\` and \`signal\`. The merger stage depends on the \`worktree\` field to find the branch — if you skip this, the merge will fail.
`
  }

  private reviewerInstructions(payload: DispatchPayload): string {
    return `## Instructions — Reviewer Gate

Your job is to review the work produced in the builder stage using the project's review checklist, then provide a structured verdict.

### Step 1: Read Review Standards (MANDATORY — do this first)

\`\`\`bash
cat ~/nuxt-crouton/CLAUDE.md
cat ~/nuxt-crouton/.claude/skills/review/SKILL.md
cat ~/nuxt-crouton/.claude/prompts/boundary-audit.md
\`\`\`

These contain the project's coding conventions and the full review checklist (security, correctness, project patterns, package boundaries, dead code). Use them as your review criteria.

### Step 2: Gather the Diff

- Read all ancestor work item outputs — understand the original brief
- Find the branch: use \`get_workitem\` to check the current work item's \`worktree\` field. If empty, fall back to ancestor context.
- Check out and review the code:
  \`\`\`bash
  cd ~/nuxt-crouton
  git fetch origin
  git diff main...<branch-name> --stat
  git diff main...<branch-name>
  \`\`\`
- **Important**: The worktree is typically checked out to \`main\`, not the review branch. If you read files directly (via \`Read\` tool or \`cat\`), you'll see the \`main\` versions, not the branch changes. To read branch file contents without switching branches:
  \`\`\`bash
  git show origin/<branch-name>:path/to/file
  \`\`\`
  Alternatively, run \`git checkout <branch-name>\` to switch — but note this changes the worktree state for any concurrent workers.
- Read the FULL changed files, not just the diff — you need surrounding context for unused imports, broken references, duplicated logic

### Step 3: Fast-Path for Non-Code Changes

Before running the full checklist, check if the diff is **doc-only** — meaning every changed file is a documentation or config file (\`.md\`, \`.yml\`, \`.yaml\`, \`.json\`, \`.toml\`, \`.txt\`) with **no** code files (\`.ts\`, \`.vue\`, \`.css\`, \`.scss\`, \`.js\`, \`.mjs\`).

\`\`\`bash
git diff main...<branch-name> --name-only | grep -E '\\.(ts|vue|css|scss|js|mjs)$'
\`\`\`

If that returns **nothing** (no code files changed), use this shortened checklist instead of the full one:
- [ ] Content is accurate and not misleading
- [ ] No typos or grammar issues
- [ ] Links/references are valid (file paths, URLs, anchors)
- [ ] Formatting is consistent with surrounding content
- [ ] No secrets, tokens, or credentials in the content

Skip all code-specific categories (security, API patterns, Vue components, package boundaries, dead code). Proceed directly to Step 6 (Verdict) with findings from this shortened checklist.

### Step 4: Screenshot Issues (if visual)

If you spot visual issues or want to show before/after states:
1. Use Playwright to take a screenshot
2. Use \`upload_screenshot\` to attach it to the work item with a descriptive label
3. Reference the screenshot in your review output

### Step 5: Run the Full Review Checklist

**Do NOT run \`pnpm typecheck\` locally** — it exceeds available memory. Typecheck runs automatically in CI on every PR. If you need the result, check the CI status:
\`\`\`bash
cd ~/nuxt-crouton
gh run list --branch <branch-name> --workflow thinkgraph-ci.yml --limit 1
\`\`\`

Apply the checklist from \`review/SKILL.md\` to every changed file. Check boundary rules from \`boundary-audit.md\`. Categorize findings:
- 🔴 **Critical** — security hole, data loss risk, crash
- 🟡 **Warning** — bug likely, pattern violation, missing validation
- 🔵 **Note** — minor issue, potential improvement

### Step 6: Verdict

Use \`update_workitem\` to set your **verdict** and signal. You MUST set the \`verdict\` field.

**APPROVE** (no critical/warning findings):
- Set \`verdict\` to \`"APPROVE"\`, \`signal\` to \`"green"\`, \`status\` to \`"done"\`
- Set \`output\` to review summary with any 🔵 notes

**REVISE** (has critical or warning findings — send back to builder):
- Set \`verdict\` to \`"REVISE"\`, \`signal\` to \`"green"\`, \`status\` to \`"done"\`
- Set \`output\` to specific issues with file paths and how to fix
- The system will automatically route back to the builder with your feedback

**RETHINK** (the brief/approach was fundamentally wrong):
- Set \`verdict\` to \`"RETHINK"\`, \`signal\` to \`"green"\`, \`status\` to \`"done"\`
- Set \`output\` to what's wrong and why the approach needs rethinking

**UNAVAILABLE** (can't review — missing context, can't access code):
- Set \`verdict\` to \`"UNAVAILABLE"\`, \`signal\` to \`"orange"\`, \`status\` to \`"waiting"\`
- Set \`assignee\` to \`"human"\`, \`output\` to why you can't review`
  }

  private mergerInstructions(payload: DispatchPayload): string {
    return `## Instructions — Merger

Your job is to merge the work item's branch into main. This involves updating the branch, resolving any conflicts, and merging the PR.

### Step 0: Read Commit Conventions

\`\`\`bash
cat ~/nuxt-crouton/.claude/skills/commit/SKILL.md
\`\`\`

Follow these conventions for any commits you make during the merge process.

### Step 1: Find the branch

Use \`get_workitem\` to check the current work item's \`worktree\` field — that's the branch name (e.g., \`thinkgraph/abc123\`).
If the \`worktree\` field is empty or null, fall back to checking ancestor context for a worktree value.
If no branch is found in either location, signal red — there's nothing to merge.

### Step 1.5: Check for commits ahead of main

Before updating or merging, check if the branch actually has any commits:

\`\`\`bash
cd ~/nuxt-crouton
git fetch origin main <branch-name>
git rev-list --count origin/main..origin/<branch-name>
\`\`\`

If the count is **0** (no commits ahead of main):
1. Log: \`echo "[merger] Branch <branch-name> has no commits ahead of main — skipping PR creation (work item: ${payload.nodeId})"\`
2. Delete the remote branch: \`git push origin --delete <branch-name>\`
3. Switch to main: \`git checkout main\`
4. Delete the local branch (if it exists): \`git branch -D <branch-name>\`
5. Remove the worktree (if it exists): \`git worktree remove /tmp/thinkgraph/${payload.nodeId} --force\`
6. Use \`update_workitem\` to signal **green** with \`status: "done"\` and \`output: "Empty branch <branch-name> — no commits ahead of main. Branch cleaned up, nothing to merge."\`
7. **STOP here** — do NOT proceed to Step 2 or attempt PR creation/merge.

If the count is greater than 0, proceed normally to Step 2.

### Step 2: Update the branch

\`\`\`bash
cd ~/nuxt-crouton
git fetch origin main
git checkout <branch-name>
# Verify checkout succeeded — must print <branch-name>, not "main"
git branch --show-current
git merge origin/main
\`\`\`

If \`git branch --show-current\` does not match \`<branch-name>\` (e.g., reports \`main\`), the checkout failed — do NOT run \`git merge\`. Signal orange with the actual branch state and stop.

### Step 3: Resolve conflicts (if any)

**Before touching any file**, re-verify branch state — a failed checkout in Step 2 can leave you on \`main\` with merge markers, which is the exact bug this guard prevents:

\`\`\`bash
git branch --show-current   # must be <branch-name>, NOT main
git status                  # must show "You have unmerged paths" on <branch-name>
\`\`\`

If \`git branch --show-current\` reports \`main\`, do NOT proceed — signal orange with the branch state and the output of \`git status\`. The conflict resolution context has been lost.

If git merge reports conflicts and the branch state is correct:

1. Read each conflicted file to understand both sides
2. Resolve the conflict — pick the correct combination of changes
3. \`git add <resolved-file>\`
4. Once all conflicts are resolved: \`git commit -m "merge: resolve conflicts with main"\`
5. After committing, run \`git branch --show-current\` once more to confirm you're still on \`<branch-name>\` before pushing
6. If you genuinely cannot resolve a conflict (ambiguous business logic, both sides changed the same thing in incompatible ways), signal orange with details about what's conflicting

Most conflicts are mechanical (schema files, imports, lock files, generated code) — just fix them.
You may attempt conflict resolution up to 3 times. If the merge still fails after 3 attempts, signal orange.

### Step 4: Push and merge PR

> **Note:** This step is only reached if the branch has commits ahead of main (Step 1.5 short-circuits otherwise).

\`\`\`bash
git push origin <branch-name>
\`\`\`

Check if a PR already exists:
\`\`\`bash
gh pr list --head <branch-name> --json number,url
\`\`\`

If no PR exists, create one using \`create_pr\` tool.
If a PR exists, merge it:
\`\`\`bash
gh pr merge <number> --squash --delete-branch
\`\`\`

### Step 5: Update local main

\`\`\`bash
# Clean up any merge state left by branch deletion before switching
git reset --hard HEAD 2>/dev/null || true
git checkout main
git pull origin main
\`\`\`

### Step 5.5: Update Node Markdown

Check if there's a \`node-markdown\` artifact on the work item (via \`get_workitem\`). If found, write its \`content\` to the \`path\` specified (usually \`.thinkgraph/nodes/{nodeId}.md\`). Create the directory if needed. Commit and push to main:
\`\`\`bash
mkdir -p .thinkgraph/nodes
# write the markdown file
git add .thinkgraph/nodes/
git commit -m "docs(thinkgraph): update node markdown for {nodeId}"
git push origin main
\`\`\`

### Step 6: Signal

Use \`update_workitem\` to set your signal:

**GREEN** (merged successfully):
- Set \`signal\` to \`"green"\`
- Set \`status\` to \`"done"\`
- Set \`output\` to merge summary: branch name, PR URL, whether conflicts were resolved, final commit SHA

**ORANGE** (conflicts that need human help):
- Set \`signal\` to \`"orange"\`
- Set \`status\` to \`"waiting"\`
- Set \`assignee\` to \`"human"\`
- Set \`output\` to the specific conflicts and why you couldn't resolve them

**RED** (can't merge — branch missing, PR checks failing, etc.):
- Set \`signal\` to \`"red"\`
- Set \`status\` to \`"blocked"\`
- Set \`output\` to what went wrong`
  }

  private launcherInstructions(payload: DispatchPayload): string {
    const branchName = `thinkgraph/${payload.nodeId}`
    return `## Instructions — Launcher

### Step 0: Check if CI Already Ran

Before running any manual checks, see if CI has already completed for this branch:

\`\`\`bash
cd ~/nuxt-crouton
gh run list --branch ${branchName} --workflow thinkgraph-ci.yml --limit 1
\`\`\`

**If CI passed** (status: completed, conclusion: success):
- Set \`signal\` to \`"green"\`, \`status\` to \`"done"\`
- Set \`output\` to the CI run summary (run ID, URL, conclusion)
- You're done — no need for manual preflight.

**If CI failed** (status: completed, conclusion: failure):
- Set \`signal\` to \`"orange"\`, \`status\` to \`"waiting"\`, \`assignee\` to \`"human"\`
- Set \`output\` to the failure details (run URL, failed jobs)
- You're done — no need for manual preflight.

**If no CI runs found** for this branch, continue to Step 1 below.

### Step 1: Determine if app code was changed

Check which files were modified on this branch:

\`\`\`bash
git diff main..HEAD --stat
\`\`\`

Look at the output. If **no files under \`apps/\`** were modified (e.g., only \`packages/\`, config files, or agent code changed), go to **Step 2A (fast path)**. If files under \`apps/\` were modified, go to **Step 2B (deploy preflight)**.

### Step 2A: Fast path — no app changes

No deploy checks are needed. Just verify CI passed:

\`\`\`bash
gh run list --branch "$(git branch --show-current)" --workflow thinkgraph-ci.yml --limit 3 --json status,conclusion,headBranch
\`\`\`

- If the latest run shows \`conclusion: "success"\` → signal **green**, set \`status\` to \`"done"\`, set \`output\` to "No app changes — CI passed"
- If the latest run shows \`conclusion: "failure"\` → signal **red**, set \`status\` to \`"blocked"\`, set \`output\` to the failure details
- If no CI run exists or it's still in progress → signal **orange**, set \`status\` to \`"waiting"\`, set \`output\` to "CI not yet complete — waiting for results"

### Step 2B: Deploy preflight — app changes detected

Read the deploy skill and run full preflight checks:

\`\`\`bash
cat ~/nuxt-crouton/.claude/skills/deploy/SKILL.md
\`\`\`

### Step 2: Run Manual Preflight Checks

CI hasn't run for this branch yet. Run preflight checks manually:
- Check \`wrangler.toml\` for TODO placeholders
- Check CF stubs exist in \`server/utils/_cf-stubs/\`
- Check \`nuxt.config.ts\` has nitro aliases for papaparse and passkey stubs
- Verify the Pages project exists

### Step 3: Signal

If preflight passes (or fast path CI passed):
- Set \`signal\` to \`"green"\`, \`status\` to \`"done"\`
- Set \`output\` to preflight summary

If preflight fails:
- Set \`signal\` to \`"orange"\`, \`status\` to \`"waiting"\`, \`assignee\` to \`"human"\`
- Set \`output\` to what failed and how to fix it`
  }

  private optimizerInstructions(payload: DispatchPayload): string {
    return `## Instructions — Pipeline Optimizer (Retro)

Your job is to review the meta learnings accumulated across all pipeline stages, propose concrete improvements, and create meta task nodes to implement them.

### Step 0: Read Current Skills and Instructions

\`\`\`bash
cat ~/nuxt-crouton/CLAUDE.md
ls ~/nuxt-crouton/.claude/skills/
cat ~/nuxt-crouton/.claude/mcp-ideas.md
\`\`\`

Understand what the pipeline already knows so you don't propose changes that already exist.

### Step 1: Gather All Learnings
- Read the work item's output, retrospective, and all child work items
- Focus on learnings with \`scope: "prompt"\` or \`scope: "process"\` — these are about the pipeline itself
- Look at the stage output history in artifacts for context on what each stage did

### Step 2: Analyze & Categorize

Group each learning into one of these categories:

**A. Stage instruction improvements** (target: \`session-manager.ts\` or \`.claude/skills/*.md\`)
- A stage prompt is missing knowledge that caused a mistake
- A stage prompt has wrong or outdated instructions
- A stage prompt should reference a skill file it doesn't know about

**B. Skill file improvements** (target: \`.claude/skills/*.md\`)
- A skill checklist is missing a check that would have caught an issue
- A skill workflow has a gap or wrong step

**C. MCP tool opportunities** (target: \`.claude/mcp-ideas.md\`)
- Repetitive work that an MCP tool could automate
- Information the agent had to hunt for that a resource could provide

### Step 3: Create Meta Nodes

For each actionable improvement, create a child learning node. But for \`scope: "prompt"\` or \`scope: "process"\` learnings that are concrete enough to implement, **also create a meta task node** using \`update_workitem\` with structured learnings:

\`\`\`json
{
  "title": "Reviewer: add i18n check to checklist",
  "detail": "The reviewer missed hardcoded labels in .vue files. Add instruction to read .claude/skills/i18n-check/SKILL.md when reviewing .vue file changes.",
  "scope": "prompt"
}
\`\`\`

These learning nodes will be promoted to meta task nodes by the human (or automatically if flagged as high-confidence).

For MCP ideas, append them to \`.claude/mcp-ideas.md\` directly if you have write access, or include them in your output.

### Step 4: Signal

**GREEN** (improvements identified and meta nodes created):
- Set \`signal\` to \`"green"\`, \`status\` to \`"done"\`
- Set \`output\` to: summary of improvements proposed, meta nodes created, MCP ideas captured

**ORANGE** (not enough data yet):
- Set \`signal\` to \`"orange"\`, \`status\` to \`"waiting"\`, \`assignee\` to \`"human"\`
- Set \`output\` to what you need

**RED** (no actionable improvements found):
- Set \`signal\` to \`"red"\`, \`status\` to \`"done"\`
- Set \`output\` to why — pipeline is working well or learnings are too vague

Be specific and surgical. Small, targeted changes beat broad rewrites.`
  }

  private pipelineClosingInstructions(stage: string): string {
    if (stage === 'coach') {
      return `

## Before You Finish (MANDATORY)

1. Call \`propose_brief\` with 2-4 candidate rewrites. Each candidate MUST reference real files and line numbers from your investigation. Generic proposals are useless.
2. Call \`update_workitem\` with:
   - **status**: \`"done"\`
   - **signal**: \`"green"\` (signals the system to park the item as waiting for human pick)
   - **output**: a one-paragraph summary of what you found in the codebase and why you chose these scopes
3. Do NOT set \`stage\` — the system handles stage transitions automatically.
4. Do NOT modify any source files. Coach is read-only.
`
    }

    if (stage === 'analyst' || stage === 'reviewer' || stage === 'merger') {
      return `

## Before You Finish (MANDATORY)

You MUST use \`update_workitem\` to set:
1. **signal** — \`"green"\`, \`"orange"\`, or \`"red"\`
2. **output** — your analysis/review summary
3. **status** — \`"done"\` for green, \`"waiting"\` for orange, \`"blocked"\` for red
4. If orange: also set \`assignee\` to \`"human"\`
5. Do NOT set \`stage\` — the system advances stages automatically based on your signal
6. **learnings** — include any meta learnings about the ${stage} stage process itself (see below)
${this.metaBlock(stage)}
`
    }

    return this.closingInstructions(stage === 'builder' ? 'generate' : stage, stage)
  }

  private coachInstructions(_payload: DispatchPayload): string {
    return `## Instructions — Coach (Brief Repair)

The analyst rejected this brief as too vague to act on. Your job is **NOT** to ask the human questions — your job is to **read the actual codebase** and propose 2-4 concrete rewrites the human can pick from with one click.

**CRITICAL: You are an investigator, NOT an executor.**
- Do NOT create or modify any files
- Do NOT create worktrees, branches, or commits
- Do NOT run builds or generators
- You MAY (and SHOULD) read files extensively: \`grep\`, \`find\`, \`cat\`, \`ls\`, \`git log\`, \`git show\`
- Your ONLY write actions are \`propose_brief\` and \`update_workitem\`

### Step 1: Understand Why It Was Rejected

Read the analyst's rejection reason in the work item output. The previous \`stage-output\` artifact has the analyst's full reasoning. Don't repeat their mistakes.

### Step 2: Investigate the Codebase

This is the bulk of your work. The brief is vague — your job is to make it concrete by reading code.

- Read the project conventions: \`cat ~/nuxt-crouton/CLAUDE.md\`
- Identify keywords from the brief and **grep aggressively** for matching components, composables, endpoints, types
- Read the files you find. Understand:
  - What currently exists for the feature in question
  - What's missing or broken (the actual root cause of the bug, not just the symptom)
  - Which file(s) and line(s) a fix would touch
  - Whether infrastructure already exists (e.g., the PATCH endpoint already accepts the field) or needs adding
- Walk parent components, related composables, the API layer. Trace the data flow.

If after thorough investigation you genuinely can't find anything related, that's also useful — your proposals can be "create the missing X" rather than "edit the existing Y".

### Step 3: Generate Grounded Proposals

Call \`propose_brief\` with 2-4 candidates at increasing scope. The first should always be the **smallest viable fix**.

**Each candidate MUST:**
- Reference real file paths (and line numbers when you have them)
- Describe the actual change in concrete terms — not "add editing support" but "wire @dblclick on NodeCard.vue:42, swap title to UInput, call updateThinkgraphNode()"
- Have a one-sentence rationale explaining what's in scope and what's out
- Be actionable by a builder reading nothing else

**Bad candidate (rejected):**
> "Make node titles editable inline"

**Good candidate (accepted):**
> "In \`apps/thinkgraph/app/components/NodeCard.vue:42\` the title renders as static text. Add \`@dblclick\` to enter edit mode, swap to \`<UInput v-model="editing">\`, call existing \`updateThinkgraphNode()\` on blur. ~15 lines, 1 file."

### Step 4: Only Ask Questions Where Candidates Fork

If candidates A, B, C all handle persistence the same way, **don't ask** about persistence. Only ask questions where the choice between candidates genuinely depends on the answer.

In most cases, you should ask **zero** questions. Good proposals are the answer. Open-ended questions are a fallback for when you genuinely couldn't decide between two equally valid interpretations.

### Step 5: Signal Done

After \`propose_brief\`, call \`update_workitem\` with \`status: "done"\`, \`signal: "green"\`, and a short \`output\` summarizing what you found in the codebase. The system will park the item as waiting for the human to pick a candidate.
`
  }

  private closingInstructions(nodeType: string, stage?: string): string {
    const blocks = [this.outputBlock(), this.retrospectiveBlock()]

    if (['discover', 'architect', 'compose', 'generate'].includes(nodeType)) {
      blocks.push(this.learningsBlock())
    }
    if (['discover', 'architect'].includes(nodeType)) {
      blocks.push(this.questionsBlock())
    }
    blocks.push(this.metaBlock(stage || nodeType))

    return blocks.join('\n')
  }

  private outputBlock(): string {
    return `

## Before You Finish (MANDATORY)

Use \`update_workitem\` to set ALL of these fields:

1. **output** — your deliverable (the brief, schemas, summary of changes, review verdict, deploy URL, etc.)`
  }

  private retrospectiveBlock(): string {
    return `
2. **retrospective** — free-text reflection on the session (displayed on the node card for humans to read)`
  }

  private learningsBlock(): string {
    return `
3. **learnings** — structured array of actionable improvements. Each learning becomes an independent work item node. CRITICAL RULES:

**What IS a learning:**
- A concrete change that benefits FUTURE pipeline runs or other work items
- Something a builder could pick up and implement independently
- Example: "Include CLAUDE.md in analyst context" — actionable, independent, improves the pipeline

**What is NOT a learning:**
- Observations about THIS work item ("the brief was vague") — that's a rejection reason, put it in output
- Things that went well — skip entirely
- Vague suggestions ("improve error handling") — be specific or don't include it

If you have zero learnings, pass an empty array. Do NOT create learnings just to fill the field.

Example learnings:
\`\`\`json
[
  { "title": "Discover can't detect existing briefs", "detail": "When parent already has a brief, discover should switch to validation mode instead of generating from scratch. Currently always runs questionnaire.", "scope": "skill" },
  { "title": "Schemas must exist before generate", "detail": "Velo custom collections have no schemas in apps/velo/schemas/. Architect phase needs to create them before CLI generator can run.", "scope": "process" }
]
\`\`\`

Scope values: \`skill\` | \`tool\` | \`prompt\` | \`infra\` | \`process\` (stored as metadata, NOT shown in title).

**Title rules:**
- 3-7 words. Short and punchy — these show as node cards on a canvas.
- State the change plainly: "Schemas must exist before generate"
- Do NOT prefix with scope, category, or brackets like "[process]"
- Do NOT use filler words like "should", "needs to", "it would be better if"
- Think of it as a sticky note: would you read this at a glance?
`
  }

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

  private metaBlock(stage: string): string {
    const stageLabel = stage === 'builder' ? 'builder' : stage
    return `
5. **meta learnings** — reflect on the **process itself**, not the work output. What about your instructions, tools, or context made this ${stageLabel} stage harder than it needed to be? What would have helped you do a better job?

Include these as additional entries in your \`learnings\` array with \`scope: "prompt"\` or \`scope: "process"\`:

\`\`\`json
[
  { "title": "Grep before flagging missing items", "detail": "I signaled orange because I couldn't find 'discover skill' in .claude/skills/, but it actually exists in session-manager.ts. My instructions should tell me to search broadly before concluding something doesn't exist.", "scope": "prompt" },
  { "title": "Builder needs CLAUDE.md context", "detail": "I didn't know the project uses Nuxt UI 4 (not v3) and made wrong component choices. Including the project CLAUDE.md in my context would prevent this.", "scope": "process" }
]
\`\`\`

Be honest and specific. These meta learnings feed into an optimizer that improves stage instructions over time. Bad instructions → bad output. Help us fix the instructions.
`
  }

  private hasParentBrief(payload: DispatchPayload): boolean {
    if (!payload.context) return false
    const lines = payload.context.split('\n')
    let hasAncestorContent = false
    for (const line of lines) {
      if (line.includes('→ [CURRENT]')) break
      if (/^\d+\.\s+\*\*/.test(line.trim())) {
        continue
      }
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

### Node Markdown File

Before committing, check if there's a \`node-markdown\` artifact on the work item (via \`get_workitem\`). If the artifacts include one with \`type: "node-markdown"\`, write its \`content\` to the path specified in its \`path\` field (usually \`.thinkgraph/nodes/{nodeId}.md\`). Create the directory if needed (\`mkdir -p .thinkgraph/nodes\`). This file tracks the node's progress in the repo.

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

  /** Flush accumulated output to ThinkGraph work item (progressive updates) */
  private async flushOutput(nodeId: string): Promise<void> {
    const active = this.activeSessions.get(nodeId)
    if (!active || active.accumulatedOutput.length === 0) return

    const currentOutput = active.accumulatedOutput[0] || ''
    if (currentOutput.length === active.lastFlushedLength) return

    active.lastFlushedLength = currentOutput.length
    const collection = active.collectionPath || 'thinkgraph-nodes'
    const teamId = active.teamId || this.config.teamId
    const isPM = collection === 'thinkgraph-nodes'

    try {
      await ofetch(`${this.config.thinkgraphUrl}/api/teams/${teamId}/${collection}/${nodeId}`, {
        method: 'PATCH',
        headers: {
          'Cookie': this.config.serviceToken,
          'Content-Type': 'application/json',
        },
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
      const isPM = session.collectionPath === 'thinkgraph-nodes'
      const body: Record<string, unknown> = {
        workItemId: session.nodeId,
        status,
      }
      if (error) body.error = error
      if (!isPM) {
        const output = (session.accumulatedOutput[0] || '').trim()
        if (output) body.output = output
      }

      if (isPM && session.lastSignal) {
        body.signal = session.lastSignal
      }

      if (isPM && session.stage) {
        const artifacts: Record<string, unknown>[] = []

        if (session.conversationLog.length > 0) {
          const compressed = compressConversationLog(session.conversationLog)
          if (compressed) {
            artifacts.push({
              type: 'conversation-log',
              stage: session.stage,
              log: compressed,
              timestamp: new Date().toISOString(),
            })
          }
        }

        if (session.tokenUsage.inputTokens > 0 || session.tokenUsage.outputTokens > 0) {
          artifacts.push({
            type: 'token-usage',
            stage: session.stage,
            inputTokens: session.tokenUsage.inputTokens,
            outputTokens: session.tokenUsage.outputTokens,
            timestamp: new Date().toISOString(),
          })
        }

        if (artifacts.length > 0) {
          body.artifacts = artifacts
        }
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

/**
 * Compress a conversation log for storage in markdown.
 */
/**
 * Extract a human-readable preview from a Pi `tool_execution_end` result.
 *
 * Pi's tool result follows Anthropic's content-block shape:
 *   { content: [{ type: 'text', text: '...' }, { type: 'image', ... }, ...] }
 *
 * Without this, the log feed shows the raw JSON envelope (`{"content":[{...`)
 * which is unreadable. We pull out the text blocks and join them, falling back
 * to a stringified preview only when the shape is unrecognized.
 */
function extractToolResultText(result: unknown): string {
  if (typeof result === 'string') {
    return result.slice(0, 500)
  }
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>
    const content = obj.content
    if (Array.isArray(content)) {
      const texts = content
        .map((b: any) => {
          if (b && typeof b === 'object' && b.type === 'text' && typeof b.text === 'string') {
            return b.text
          }
          return null
        })
        .filter((t): t is string => t !== null)
      if (texts.length > 0) {
        return texts.join('\n').slice(0, 500)
      }
    }
  }
  return JSON.stringify(result).slice(0, 500)
}

function compressConversationLog(log: string[]): string {
  if (log.length === 0) return ''

  const compressed: string[] = []
  let toolBatch: string[] = []

  const flushTools = () => {
    if (toolBatch.length > 0) {
      compressed.push(`Used tools: ${toolBatch.join(', ')}`)
      toolBatch = []
    }
  }

  for (const entry of log) {
    if (entry.startsWith('[tool] ')) {
      toolBatch.push(entry.slice(7))
    }
    else {
      flushTools()
      compressed.push(entry)
    }
  }
  flushTools()

  let result = compressed.join('\n')
  if (result.length > 2000) {
    result = result.slice(0, 2000) + '\n\n[...truncated]'
  }
  return result
}
