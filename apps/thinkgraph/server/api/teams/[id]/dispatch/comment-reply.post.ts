import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

/**
 * Dispatch a single thread-scoped comment reply to the Pi worker.
 *
 * POST /api/teams/[id]/dispatch/comment-reply
 * Body: { nodeId, threadId, history }
 *
 * PR 5 of the notion-slideover series. Unlike the full-node `work-item`
 * dispatch this endpoint is stateless from the DB's POV — it does NOT load
 * the node, build context chains, update `status`, or write handoff
 * artifacts. A comment reply is a side conversation: the canonical node
 * lifecycle is decoupled from the thread.
 *
 * The browser has already appended the human's reply to the page-room
 * Y.Map before posting here (see CommentSlideout.handleReplyWithPi), so
 * `history` is the verbatim thread conversation including the just-typed
 * message. The worker formats that into a small focused prompt and asks
 * Pi to reply once via the existing `reply_to_comment` tool (from PR 3).
 */
export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const body = await readBody(event)

  const { nodeId, threadId, history } = body || {}

  if (typeof nodeId !== 'string' || !nodeId) {
    throw createError({ status: 400, statusText: 'Missing nodeId' })
  }
  if (typeof threadId !== 'string' || !threadId) {
    throw createError({ status: 400, statusText: 'Missing threadId' })
  }
  if (!Array.isArray(history) || history.length === 0) {
    throw createError({ status: 400, statusText: 'Missing or empty history' })
  }
  for (const entry of history) {
    if (!entry || typeof entry !== 'object') {
      throw createError({ status: 400, statusText: 'Invalid history entry' })
    }
    if (typeof (entry as any).author !== 'string' || typeof (entry as any).body !== 'string') {
      throw createError({ status: 400, statusText: 'History entries require author and body' })
    }
  }

  const config = useRuntimeConfig()
  const piWorkerUrl = config.piWorkerUrl || 'https://pi-api.pmcp.dev'

  try {
    const piResponse = await $fetch<{ accepted: boolean; error?: string }>(`${piWorkerUrl}/dispatch`, {
      method: 'POST',
      headers: {
        ...(config.piDispatchSecret ? { Authorization: `Bearer ${config.piDispatchSecret}` } : {}),
      },
      body: {
        mode: 'comment-reply',
        nodeId,
        threadId,
        history,
        teamId: team.id,
        teamSlug: team.slug || team.id,
        callbackUrl: `${config.public?.siteUrl || `https://${getHeader(event, 'host') || 'localhost:3004'}`}/api/teams/${team.id}/dispatch/webhook`,
      },
    })
    return {
      accepted: piResponse?.accepted || false,
      error: piResponse?.error,
    }
  }
  catch (err: any) {
    console.warn(`[dispatch/comment-reply] Pi worker not reachable at ${piWorkerUrl}:`, err.message)
    throw createError({
      status: 502,
      statusText: `Pi worker unreachable: ${err.message}`,
    })
  }
})
