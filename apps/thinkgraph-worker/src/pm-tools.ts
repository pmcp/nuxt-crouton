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
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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
                      title: `[${scope}] ${learning.title}`,
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
    },
    {
      name: 'take_screenshot',
      label: 'Take Screenshot',
      description: 'Take a screenshot of a web page using Playwright. Returns the image so you can visually inspect UI components, verify layouts, or check deployed previews. Requires Playwright to be installed on the machine.',
      parameters: Type.Object({
        url: Type.String({ description: 'URL to screenshot (e.g., http://localhost:3000 or a deployed preview URL)' }),
        selector: Type.Optional(Type.String({ description: 'CSS selector to screenshot a specific element instead of the full viewport' })),
        fullPage: Type.Optional(Type.Boolean({ description: 'Capture the full scrollable page instead of just the viewport. Defaults to false.' })),
        width: Type.Optional(Type.Number({ description: 'Viewport width in pixels. Defaults to 1280.' })),
        height: Type.Optional(Type.Number({ description: 'Viewport height in pixels. Defaults to 800.' })),
        delay: Type.Optional(Type.Number({ description: 'Milliseconds to wait after page load before capturing. Defaults to 0.' })),
      }),
      execute: async (_toolCallId, params) => {
        try {
          // Dynamic import so Playwright is only loaded when this tool is used
          const { chromium } = await import('playwright')

          const browser = await chromium.launch({ headless: true })
          try {
            const context = await browser.newContext({
              viewport: {
                width: params.width || 1280,
                height: params.height || 800,
              },
            })
            const page = await context.newPage()

            await page.goto(params.url, { waitUntil: 'networkidle', timeout: 30_000 })

            if (params.delay && params.delay > 0) {
              await page.waitForTimeout(params.delay)
            }

            let screenshotBuffer: Buffer

            if (params.selector) {
              const element = await page.waitForSelector(params.selector, { timeout: 10_000 })
              if (!element) {
                return textResult(JSON.stringify({ ok: false, error: `Selector "${params.selector}" not found on page` }))
              }
              screenshotBuffer = await element.screenshot({ type: 'png' })
            } else {
              screenshotBuffer = await page.screenshot({
                type: 'png',
                fullPage: params.fullPage || false,
              })
            }

            // Also save to disk for artifact attachment
            const screenshotDir = '/tmp/thinkgraph-screenshots'
            mkdirSync(screenshotDir, { recursive: true })
            const timestamp = Date.now()
            const filePath = join(screenshotDir, `screenshot-${workItemId}-${timestamp}.png`)
            writeFileSync(filePath, screenshotBuffer)

            const base64Data = screenshotBuffer.toString('base64')

            console.log(`[pm-tools] Screenshot captured: ${params.url} → ${filePath} (${Math.round(screenshotBuffer.length / 1024)}KB)`)

            return {
              content: [
                { type: 'image' as const, data: base64Data, mimeType: 'image/png' },
                { type: 'text' as const, text: JSON.stringify({ ok: true, url: params.url, filePath, sizeKB: Math.round(screenshotBuffer.length / 1024), selector: params.selector || null, fullPage: params.fullPage || false }) },
              ],
              details: undefined,
            }
          } finally {
            await browser.close()
          }
        } catch (err: any) {
          console.error(`[pm-tools] take_screenshot failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    },
  ]
}
