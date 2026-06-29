import { parseLayoutDocument } from '@fyit/crouton-layout/app/utils/layout-serialize'
import { formatLayoutComment } from '@fyit/crouton-layout/app/utils/layout-ticket'

/**
 * The agent⇄human round-trip (#974, graduation WS6) — POST a builder layout onto a GitHub
 * issue as the canonical spec. Body: `{ document: <serialised LayoutDocument>, issue }`.
 * We re-parse (sanitises untrusted input), format via the package's `formatLayoutComment`
 * (human summary + marker + fenced canonical JSON), then post it — if a token is configured
 * (`NUXT_GITHUB_TOKEN`); otherwise we return the body so it can be pasted by hand (no secret
 * required to demo the loop). The codec is the package's; only the posting lives here.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ document?: string, issue?: number | null }>(event)

  const doc = parseLayoutDocument(body?.document)
  if (!doc) {
    throw createError({ status: 400, statusText: 'Invalid or missing layout document' })
  }

  const comment = formatLayoutComment(doc)

  const config = useRuntimeConfig(event)
  const token = config.githubToken
  const repo = config.public.builderRepo
  const issue = body?.issue

  if (!token || !issue) {
    return {
      ok: true,
      posted: false,
      body: comment,
      message: token ? 'Enter an issue number to post' : 'No token configured — copy the body to post by hand',
    }
  }

  try {
    const res = await $fetch<{ html_url: string }>(`https://api.github.com/repos/${repo}/issues/${issue}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'crouton-builder',
      },
      body: { body: comment },
    })
    return { ok: true, posted: true, url: res.html_url, message: `Posted to #${issue}` }
  }
  catch (err) {
    throw createError({ status: 502, statusText: err instanceof Error ? err.message : 'GitHub post failed' })
  }
})
