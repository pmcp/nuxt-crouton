/**
 * PM-specific tools for Pi agent sessions dispatched from ThinkGraph work items.
 *
 * Unlike the old thinking-graph tools (create_node, update_node, etc.), these tools
 * operate on the work-items collection and support the PM workflow:
 * worktree management, skill execution, and work item updates.
 */
import { Type } from '@sinclair/typebox'
import { ofetch } from 'ofetch'
import { execSync } from 'node:child_process'
import type { ToolDefinition, AgentToolResult } from '@mariozechner/pi-coding-agent'
import type { WorkerConfig } from './config.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolDefinition = ToolDefinition<any, any>

/** Helper to create a text-only AgentToolResult */
function textResult(text: string): AgentToolResult<unknown> {
  return { content: [{ type: 'text', text }], details: undefined }
}

/** Create PM tools for a work item dispatch session */
export function createPMTools(
  config: WorkerConfig,
  workItemId: string,
  teamId: string,
): AnyToolDefinition[] {
  const baseUrl = `${config.thinkgraphUrl}/api/teams/${teamId}/thinkgraph-workitems`

  const headers = {
    'Cookie': config.serviceToken,
    'Content-Type': 'application/json',
  }

  return [
    {
      name: 'update_workitem',
      label: 'Update Work Item',
      description: 'Update the current work item in ThinkGraph. Use this to set the worktree branch name after creating a git worktree, store output summaries, or update status.',
      parameters: Type.Object({
        worktree: Type.Optional(Type.String({ description: 'Git branch name for this work item (e.g., thinkgraph/abc123)' })),
        output: Type.Optional(Type.String({ description: 'Output summary — what was produced (your deliverable)' })),
        retrospective: Type.Optional(Type.String({ description: 'Lessons learned — what was difficult, what failed, what tools were missing, what prompts were unclear, what could be optimised' })),
        status: Type.Optional(Type.String({ description: 'Status: queued, active, waiting, done, blocked' })),
        deployUrl: Type.Optional(Type.String({ description: 'Preview deployment URL' })),
      }),
      execute: async (_toolCallId, params) => {
        const updates: Record<string, unknown> = {}
        if (params.worktree !== undefined) updates.worktree = params.worktree
        if (params.output !== undefined) updates.output = params.output
        if (params.retrospective !== undefined) updates.retrospective = params.retrospective
        if (params.status !== undefined) updates.status = params.status
        if (params.deployUrl !== undefined) updates.deployUrl = params.deployUrl

        if (Object.keys(updates).length === 0) {
          return textResult(JSON.stringify({ ok: false, error: 'No fields to update' }))
        }

        try {
          await ofetch(`${baseUrl}/${workItemId}`, {
            method: 'PATCH',
            headers,
            body: updates,
          })
          return textResult(JSON.stringify({ ok: true, workItemId, updated: Object.keys(updates) }))
        } catch (err: any) {
          console.error(`[pm-tools] update_workitem failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    },
    {
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
    },
    {
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
            'gh', 'pr', 'create',
            '--title', prTitle,
            '--body', prBody,
            '--base', baseBranch,
          ]
          if (params.draft) args.push('--draft')

          const result = execSync(args.join(' '), {
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
    },
  ]
}
