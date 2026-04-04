/**
 * PM-specific tools for Pi agent sessions dispatched from ThinkGraph work items.
 *
 * Unlike the old thinking-graph tools (create_node, update_node, etc.), these tools
 * operate on the work-items collection and support the PM workflow:
 * worktree management, skill execution, and work item updates.
 */
import { Type } from '@sinclair/typebox'
import { ofetch } from 'ofetch'
import { execFileSync } from 'node:child_process'
import { readFile, unlink } from 'node:fs/promises'
import { basename } from 'node:path'
import type { ToolDefinition, AgentToolResult } from '@mariozechner/pi-coding-agent'
import type { WorkerConfig } from './config.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolDefinition = ToolDefinition<any, any>

/** Helper to create a text-only AgentToolResult */
function textResult(text: string): AgentToolResult<unknown> {
  return { content: [{ type: 'text', text }], details: undefined }
}

/** Stage-specific descriptions for update_workitem */
const STAGE_UPDATE_DESCRIPTIONS: Record<string, string> = {
  analyst: 'Set your evaluation signal and output. You can set: signal (green/orange/red), status, output, assignee, learnings, retrospective. Do NOT set worktree, stage, or deployUrl.',
  builder: 'Update the current work item in ThinkGraph. Use this to set the worktree branch name after creating a git worktree, store output summaries, or update status.',
  reviewer: 'Set your review verdict signal and output. You can set: signal (green/orange/red), status, output, assignee, learnings, retrospective, verdict. Do NOT set worktree, stage, or deployUrl.',
  merger: 'Update the work item after merging. You can set: signal (green/orange/red), status, output, learnings, retrospective.',
}

/** Create PM tools for a work item dispatch session, scoped to the pipeline stage */
export function createPMTools(
  config: WorkerConfig,
  workItemId: string,
  teamId: string,
  options?: { onSignal?: (signal: string) => void; stage?: string },
): AnyToolDefinition[] {
  const baseUrl = `${config.thinkgraphUrl}/api/teams/${teamId}/thinkgraph-nodes`
  const stage = options?.stage || 'builder'

  const headers = {
    'Cookie': config.serviceToken,
    'Content-Type': 'application/json',
  }

  // Build the full tool catalog, then filter by stage
  const updateWorkitemTool: AnyToolDefinition = {
      name: 'update_workitem',
      label: 'Update Work Item',
      description: STAGE_UPDATE_DESCRIPTIONS[stage] || STAGE_UPDATE_DESCRIPTIONS.builder,
      parameters: Type.Object({
        worktree: Type.Optional(Type.String({ description: 'Git branch name for this work item (e.g., thinkgraph/abc123)' })),
        output: Type.Optional(Type.String({ description: 'Output summary — what was produced (your deliverable)' })),
        retrospective: Type.Optional(Type.String({ description: 'Free-text reflection on this session — displayed on the node card' })),
        learnings: Type.Optional(Type.Array(
          Type.Object({
            title: Type.String({ description: 'Short headline (5-10 words max). Example: "Webhook overwrites artifacts — should merge"' }),
            detail: Type.String({ description: 'Full explanation with context and what should change' }),
            scope: Type.Optional(Type.String({ description: 'What this applies to: skill, prompt, tool, infra, or process' })),
          }),
          { description: 'Actionable learnings only. Pyramid style: title is the point, detail is the explanation. Do NOT include things that went well.' },
        )),
        status: Type.Optional(Type.String({ description: 'Status: queued, active, waiting, done, blocked' })),
        assignee: Type.Optional(Type.String({ description: 'Assignee: pi, human, client' })),
        stage: Type.Optional(Type.String({ description: 'Pipeline stage: analyst, builder, reviewer, launcher, merger' })),
        signal: Type.Optional(Type.String({ description: 'Traffic light signal: green, orange, red' })),
        verdict: Type.Optional(Type.String({ description: 'Review verdict: APPROVE, REVISE, RETHINK, UNAVAILABLE (reviewer stage only)' })),
        skipTo: Type.Optional(Type.String({ description: 'Skip ahead to this stage (analyst stage only, e.g., "builder", "merger")' })),
        deployUrl: Type.Optional(Type.String({ description: 'Preview deployment URL' })),
      }),
      execute: async (_toolCallId, params) => {
        const updates: Record<string, unknown> = {}
        if (params.worktree !== undefined) updates.worktree = params.worktree
        if (params.output !== undefined) updates.output = params.output
        if (params.retrospective !== undefined) updates.retrospective = params.retrospective
        if (params.status !== undefined) updates.status = params.status
        if (params.assignee !== undefined) updates.assignee = params.assignee
        if (params.stage !== undefined) updates.stage = params.stage
        if (params.signal !== undefined) {
          updates.signal = params.signal
          options?.onSignal?.(params.signal)
        }
        if (params.deployUrl !== undefined) updates.deployUrl = params.deployUrl
        // Store verdict and skipTo as artifact metadata (not DB columns)
        const extraMeta: Record<string, unknown> = {}
        if (params.verdict !== undefined) extraMeta.verdict = params.verdict
        if (params.skipTo !== undefined) extraMeta.skipTo = params.skipTo

        if (Object.keys(updates).length === 0 && Object.keys(extraMeta).length === 0) {
          return textResult(JSON.stringify({ ok: false, error: 'No fields to update' }))
        }

        try {
          // Store verdict/skipTo as a stage-meta artifact so webhook can read them
          if (Object.keys(extraMeta).length > 0) {
            const items = await ofetch(baseUrl, { headers, query: { ids: workItemId } })
            const item = Array.isArray(items) ? items[0] : null
            const existingArtifacts = Array.isArray(item?.artifacts) ? item.artifacts : []
            // Remove previous stage-meta artifacts, keep only latest
            const cleaned = existingArtifacts.filter((a: any) => a?.type !== 'stage-meta')
            cleaned.push({ type: 'stage-meta', ...extraMeta, timestamp: new Date().toISOString() })
            updates.artifacts = cleaned
          }

          if (Object.keys(updates).length > 0) {
            await ofetch(`${baseUrl}/${workItemId}`, {
              method: 'PATCH',
              headers,
              body: updates,
            })
          }

          // Create learning nodes from structured learnings array
          let learningCount = 0
          if (params.learnings && params.learnings.length > 0) {
            try {
              const items = await ofetch(baseUrl, { headers, query: { ids: workItemId } })
              const item = Array.isArray(items) ? items[0] : null
              const projectId = item?.projectId

              if (projectId) {
                for (const learning of params.learnings) {
                  const scope = learning.scope || 'process'

                  await ofetch(baseUrl, {
                    method: 'POST',
                    headers,
                    body: {
                      projectId,
                      parentId: workItemId,
                      title: learning.title,
                      type: 'review',
                      status: 'queued',
                      assignee: 'human',
                      brief: learning.detail,
                    },
                  })
                  learningCount++
                }
                if (learningCount > 0) {
                  console.log(`[pm-tools] Created ${learningCount} learning node(s) from structured learnings`)
                }
              }
            } catch (err: any) {
              console.error(`[pm-tools] Learning node creation failed:`, err.message)
            }
          }

          return textResult(JSON.stringify({ ok: true, workItemId, updated: Object.keys(updates), learningsCreated: learningCount }))
        } catch (err: any) {
          console.error(`[pm-tools] update_workitem failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    }

  const getWorkitemTool: AnyToolDefinition = {
      name: 'get_workitem',
      label: 'Get Work Item',
      description: 'Get the current work item details including brief, output, ancestors, and artifacts.',
      parameters: Type.Object({}),
      execute: async () => {
        try {
          // Use list endpoint with ?ids= filter (no single-item GET endpoint exists)
          const items = await ofetch(baseUrl, { headers, query: { ids: workItemId } })
          const item = Array.isArray(items) ? items[0] : null
          if (!item) {
            return textResult(JSON.stringify({ ok: false, error: 'Work item not found' }))
          }
          return textResult(JSON.stringify({
            id: item.id,
            title: item.title,
            type: item.type,
            status: item.status,
            brief: item.brief,
            output: item.output,
            worktree: item.worktree,
            skill: item.skill,
            assignee: item.assignee,
            provider: item.provider,
            projectId: item.projectId,
            parentId: item.parentId,
          }))
        } catch (err: any) {
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    }

  const createPrTool: AnyToolDefinition = {
      name: 'create_pr',
      label: 'Create Pull Request',
      description: 'Create a GitHub PR from the current work item\'s worktree branch. Runs `gh pr create` in the worktree directory and updates the work item with the PR URL. The branch must be pushed first.',
      parameters: Type.Object({
        worktreePath: Type.String({ description: 'Absolute path to the git worktree directory (e.g., /tmp/thinkgraph/abc123)' }),
        title: Type.Optional(Type.String({ description: 'PR title. Defaults to work item title.' })),
        body: Type.Optional(Type.String({ description: 'PR body/description.' })),
        base: Type.Optional(Type.String({ description: 'Base branch to merge into. Defaults to main.' })),
        draft: Type.Optional(Type.Boolean({ description: 'Create as draft PR. Defaults to false.' })),
      }),
      execute: async (_toolCallId, params) => {
        try {
          // First get the work item to use its title as default PR title
          const items = await ofetch(baseUrl, { headers, query: { ids: workItemId } })
          const item = Array.isArray(items) ? items[0] : null

          const prTitle = params.title || item?.title || 'ThinkGraph work item'
          const prBody = params.body || `Work item: ${workItemId}\n\nGenerated by ThinkGraph PM dispatch.`
          const baseBranch = params.base || 'main'

          const args = [
            'pr', 'create',
            '--title', prTitle,
            '--body', prBody,
            '--base', baseBranch,
          ]
          if (params.draft) args.push('--draft')

          const result = execFileSync('gh', args, {
            cwd: params.worktreePath,
            encoding: 'utf-8',
            timeout: 30_000,
          }).trim()

          // gh pr create returns the PR URL on success
          const prUrl = result.split('\n').pop() || result

          // Update the work item with the PR URL in artifacts
          try {
            const existingArtifacts = item?.artifacts || []
            const artifacts = Array.isArray(existingArtifacts) ? existingArtifacts : []
            artifacts.push({ type: 'pr', url: prUrl, createdAt: new Date().toISOString() })

            await ofetch(`${baseUrl}/${workItemId}`, {
              method: 'PATCH',
              headers,
              body: { artifacts },
            })
          } catch {
            // PR was created successfully even if work item update fails
          }

          return textResult(JSON.stringify({ ok: true, prUrl, workItemId }))
        } catch (err: any) {
          console.error(`[pm-tools] create_pr failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    }

  const uploadScreenshotTool: AnyToolDefinition = {
    name: 'upload_screenshot',
    label: 'Upload Screenshot',
    description: 'Upload a screenshot or image file to cloud storage and attach it as an artifact on the work item. Use this after taking a Playwright screenshot to make it part of your deliverable. The file is deleted locally after upload.',
    parameters: Type.Object({
      filePath: Type.String({ description: 'Absolute path to the image file (e.g., /path/to/screenshot.png)' }),
      label: Type.Optional(Type.String({ description: 'Short label describing the screenshot (e.g., "homepage-after-fix", "mobile-nav-broken")' })),
    }),
    execute: async (_toolCallId, params) => {
      try {
        // Read the file
        const fileBuffer = await readFile(params.filePath)
        const fileName = params.label
          ? `${params.label.replace(/[^a-z0-9-_]/gi, '-')}.png`
          : basename(params.filePath)

        // Upload via ThinkGraph's upload-image endpoint (multipart form)
        const formData = new FormData()
        const blob = new Blob([fileBuffer], { type: 'image/png' })
        formData.append('file', blob, fileName)

        const uploadResult = await ofetch(`${config.thinkgraphUrl}/api/upload-image`, {
          method: 'POST',
          headers: {
            'Cookie': config.serviceToken,
          },
          body: formData,
        })

        // Build the public URL for the uploaded image
        const imageUrl = `${config.thinkgraphUrl}/images/${uploadResult.pathname}`

        // Attach as artifact on the work item
        const items = await ofetch(baseUrl, { headers, query: { ids: workItemId } })
        const item = Array.isArray(items) ? items[0] : null
        const existingArtifacts = Array.isArray(item?.artifacts) ? item.artifacts : []
        existingArtifacts.push({
          type: 'screenshot',
          url: imageUrl,
          pathname: uploadResult.pathname,
          label: params.label || fileName,
          createdAt: new Date().toISOString(),
          stage,
        })

        await ofetch(`${baseUrl}/${workItemId}`, {
          method: 'PATCH',
          headers,
          body: { artifacts: existingArtifacts },
        })

        // Clean up local file
        await unlink(params.filePath).catch(() => {})

        console.log(`[pm-tools] Screenshot uploaded: ${imageUrl} (attached to ${workItemId})`)
        return textResult(JSON.stringify({
          ok: true,
          url: imageUrl,
          pathname: uploadResult.pathname,
          label: params.label || fileName,
          workItemId,
        }))
      } catch (err: any) {
        console.error(`[pm-tools] upload_screenshot failed:`, err.message)
        return textResult(JSON.stringify({ ok: false, error: err.message }))
      }
    },
  }

  // Stage-scoped tool sets:
  // - Analyst:  read-only + signal (get_workitem, update_workitem for signal/output only)
  // - Builder:  full write (update_workitem, get_workitem, create_pr, upload_screenshot)
  // - Reviewer: read + signal + screenshots (get_workitem, update_workitem, upload_screenshot)
  // - Merger:   write, no PR creation (update_workitem, get_workitem)
  const STAGE_TOOLS: Record<string, string[]> = {
    analyst: ['get_workitem', 'update_workitem'],
    builder: ['get_workitem', 'update_workitem', 'create_pr', 'upload_screenshot'],
    reviewer: ['get_workitem', 'update_workitem', 'upload_screenshot'],
    merger: ['get_workitem', 'update_workitem'],
  }

  const allTools: Record<string, AnyToolDefinition> = {
    update_workitem: updateWorkitemTool,
    get_workitem: getWorkitemTool,
    create_pr: createPrTool,
    upload_screenshot: uploadScreenshotTool,
  }

  const allowedNames = STAGE_TOOLS[stage] || STAGE_TOOLS.builder
  return allowedNames.map(name => allTools[name])
}
