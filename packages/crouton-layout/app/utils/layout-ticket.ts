/**
 * Layout ↔ GitHub-ticket codec (#974) — the **agent⇄human seat**.
 *
 * The builder is the human's seat in an AI app-generation loop; a layout is the
 * shared artifact both edit. This module turns a `LayoutDocument` (#987) into a
 * GitHub **comment body** an agent can re-read, and back — so a human's edited
 * layout *saves onto the tracking issue as the spec/command* the agent rebuilds
 * from, and an agent-posted layout *loads back into the builder*.
 *
 * It is the PURE codec only — formatting + extraction + "which comment is the
 * current spec". The actual posting (the interactive agent's `add_issue_comment`,
 * or an app endpoint) sits on top, so this stays unit-testable and transport-free.
 *
 * The payload is the canonical serialisation (`layout-serialize`), so a version on
 * a ticket renders + diffs cleanly; extraction re-validates through
 * `parseLayoutDocument`, so an untrusted/agent-posted spec is always sanitised.
 */
import type { LayoutDocument } from './layout-serialize'
import { parseLayoutDocument, serializeLayoutDocument } from './layout-serialize'

/**
 * Stable, invisible marker that tags a comment as carrying a layout spec. An HTML
 * comment (renders to nothing on GitHub) and **required** for extraction — so we
 * never mistake an unrelated ```json block for a spec. Versioned for forward-compat.
 */
export const LAYOUT_COMMENT_MARKER = '<!-- crouton-layout-spec v1 -->'

/** The fenced json block that follows the marker. Tolerant of leading whitespace. */
const FENCED_JSON = /```json\s*([\s\S]*?)```/

/**
 * Format a `LayoutDocument` as a GitHub comment body: a human-readable summary, the
 * marker, then the canonical document in a fenced ```json block. `opts.title` heads
 * the summary (default "Layout spec").
 */
export function formatLayoutComment(doc: LayoutDocument, opts?: { title?: string }): string {
  const count = doc.pages.length
  const home = doc.pages.find(p => p.isHome)
  const summary = `**${opts?.title ?? 'Layout spec'}** — ${count} page${count === 1 ? '' : 's'}`
    + (home ? ` · Home: ${home.name}` : '')
  return `${summary}\n\n${LAYOUT_COMMENT_MARKER}\n\`\`\`json\n${serializeLayoutDocument(doc)}\n\`\`\``
}

/**
 * Extract a `LayoutDocument` from a comment body, or `null`. Requires the marker
 * (so unrelated code blocks are ignored), tolerates human prose around the block,
 * and re-validates the payload through `parseLayoutDocument` (untrusted-safe).
 */
export function extractLayoutDocument(body: string): LayoutDocument | null {
  if (typeof body !== 'string') return null
  const at = body.indexOf(LAYOUT_COMMENT_MARKER)
  if (at < 0) return null
  const match = body.slice(at + LAYOUT_COMMENT_MARKER.length).match(FENCED_JSON)
  if (!match) return null
  return parseLayoutDocument(match[1]!)
}

/**
 * The current spec among a chronological list of comments — the LAST one that
 * carries a valid layout (so re-posting an edited version supersedes the prior),
 * or `null` if none do. Pass the issue's comments oldest→newest.
 */
export function latestLayoutDocument(comments: Array<{ body?: string | null }>): LayoutDocument | null {
  let latest: LayoutDocument | null = null
  for (const c of comments) {
    const doc = extractLayoutDocument(c?.body ?? '')
    if (doc) latest = doc
  }
  return latest
}
