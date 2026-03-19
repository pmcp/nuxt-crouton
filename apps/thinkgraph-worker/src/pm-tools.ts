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
import { writeFileSync, mkdirSync } from 'node:fs'
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
      name: 'generate_image',
      label: 'Generate Image',
      description: 'Generate an image using Flux (Replicate) or DALL-E with a text prompt. Downloads the result and attaches it as an artifact on the work item. Requires REPLICATE_API_TOKEN or OPENAI_API_KEY in the worker environment.',
      parameters: Type.Object({
        prompt: Type.String({ description: 'Text prompt describing the image to generate' }),
        style: Type.Optional(Type.Union([
          Type.Literal('realistic'),
          Type.Literal('illustration'),
          Type.Literal('ui-mockup'),
        ], { description: 'Style preset to apply. Modifies the prompt for better results.' })),
        size: Type.Optional(Type.String({ description: 'Image size. For DALL-E: "1024x1024", "1792x1024", "1024x1792". For Flux: "1:1", "16:9", "9:16". Defaults to square.' })),
      }),
      execute: async (_toolCallId, params) => {
        const replicateToken = process.env.REPLICATE_API_TOKEN
        const openaiKey = process.env.OPENAI_API_KEY

        if (!replicateToken && !openaiKey) {
          return textResult(JSON.stringify({
            ok: false,
            error: 'No image generation API configured. Set REPLICATE_API_TOKEN or OPENAI_API_KEY in the worker environment.',
          }))
        }

        // Build enhanced prompt based on style
        let enhancedPrompt = params.prompt
        if (params.style === 'realistic') {
          enhancedPrompt = `Photorealistic, high quality photograph: ${params.prompt}`
        } else if (params.style === 'illustration') {
          enhancedPrompt = `Digital illustration, clean vector style: ${params.prompt}`
        } else if (params.style === 'ui-mockup') {
          enhancedPrompt = `UI/UX mockup, clean modern interface design, Figma-style: ${params.prompt}`
        }

        let imageUrl: string
        let provider: string

        try {
          if (replicateToken) {
            // Use Replicate Flux model
            provider = 'replicate-flux'
            const aspectRatio = params.size || '1:1'

            // Create prediction
            const prediction = await ofetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${replicateToken}`,
                'Content-Type': 'application/json',
              },
              body: {
                input: {
                  prompt: enhancedPrompt,
                  aspect_ratio: aspectRatio,
                  num_outputs: 1,
                  output_format: 'webp',
                  output_quality: 90,
                },
              },
            })

            // Poll for completion (flux-schnell is fast, usually < 10s)
            let result = prediction
            const maxAttempts = 60
            for (let i = 0; i < maxAttempts; i++) {
              if (result.status === 'succeeded') break
              if (result.status === 'failed' || result.status === 'canceled') {
                throw new Error(`Replicate prediction ${result.status}: ${result.error || 'unknown error'}`)
              }
              await new Promise(resolve => setTimeout(resolve, 1000))
              result = await ofetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
                headers: { 'Authorization': `Bearer ${replicateToken}` },
              })
            }

            if (result.status !== 'succeeded') {
              throw new Error('Replicate prediction timed out after 60s')
            }

            imageUrl = Array.isArray(result.output) ? result.output[0] : result.output
          } else {
            // Use OpenAI DALL-E 3
            provider = 'openai-dalle3'
            const dalleSize = params.size || '1024x1024'

            const response = await ofetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
              },
              body: {
                model: 'dall-e-3',
                prompt: enhancedPrompt,
                n: 1,
                size: dalleSize,
                response_format: 'url',
              },
            })

            imageUrl = response.data[0].url
          }

          // Download the image to a local file
          const imageBuffer = await ofetch(imageUrl, { responseType: 'arrayBuffer' })
          const ext = provider === 'replicate-flux' ? 'webp' : 'png'
          const filename = `generated-${Date.now()}.${ext}`
          const outputDir = join(config.workDir, 'generated-images')
          mkdirSync(outputDir, { recursive: true })
          const localPath = join(outputDir, filename)
          writeFileSync(localPath, Buffer.from(imageBuffer as ArrayBuffer))

          // Attach as artifact on the work item
          const artifact = {
            type: 'image',
            url: imageUrl,
            localPath,
            prompt: params.prompt,
            enhancedPrompt,
            style: params.style || null,
            provider,
            createdAt: new Date().toISOString(),
          }

          try {
            const items = await ofetch(baseUrl, { headers, query: { ids: workItemId } })
            const item = Array.isArray(items) ? items[0] : null
            const existingArtifacts = item?.artifacts || []
            const artifacts = Array.isArray(existingArtifacts) ? existingArtifacts : []
            artifacts.push(artifact)

            await ofetch(`${baseUrl}/${workItemId}`, {
              method: 'PATCH',
              headers,
              body: { artifacts },
            })
          } catch (artifactErr: any) {
            console.error(`[pm-tools] generate_image: image generated but artifact save failed:`, artifactErr.message)
          }

          console.log(`[pm-tools] generate_image: created ${localPath} via ${provider}`)
          return textResult(JSON.stringify({
            ok: true,
            artifact,
            workItemId,
          }))
        } catch (err: any) {
          console.error(`[pm-tools] generate_image failed:`, err.message)
          return textResult(JSON.stringify({ ok: false, error: err.message }))
        }
      },
    },
  ]
}
