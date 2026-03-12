/**
 * Server-side TipTap JSON to HTML renderer.
 * Pure function, zero dependencies — auto-imported by Nitro.
 */

interface TipTapMark {
  type: string
  attrs?: Record<string, any>
}

interface TipTapNode {
  type: string
  content?: TipTapNode[]
  text?: string
  marks?: TipTapMark[]
  attrs?: Record<string, any>
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(str: string): string {
  return escapeHtml(str)
}

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase()
  return !trimmed.startsWith('javascript:') && !trimmed.startsWith('vbscript:') && !trimmed.startsWith('data:text/html')
}

function renderMark(mark: TipTapMark, inner: string): string {
  switch (mark.type) {
    case 'bold': return `<strong>${inner}</strong>`
    case 'italic': return `<em>${inner}</em>`
    case 'underline': return `<u>${inner}</u>`
    case 'strike': return `<s>${inner}</s>`
    case 'code': return `<code>${inner}</code>`
    case 'highlight': return `<mark>${inner}</mark>`
    case 'link': {
      const href = mark.attrs?.href || '#'
      if (!isSafeUrl(href)) return inner
      const target = mark.attrs?.target ? ` target="${escapeAttr(mark.attrs.target)}"` : ''
      const rel = mark.attrs?.target === '_blank' ? ' rel="noopener noreferrer"' : ''
      return `<a href="${escapeAttr(href)}"${target}${rel}>${inner}</a>`
    }
    default: return inner
  }
}

function renderNode(node: TipTapNode): string {
  if (!node) return ''

  // Text node — apply marks
  if (node.type === 'text') {
    let html = escapeHtml(node.text || '')
    if (node.marks) {
      for (const mark of node.marks) {
        html = renderMark(mark, html)
      }
    }
    return html
  }

  // Self-closing nodes
  if (node.type === 'hardBreak') return '<br>'
  if (node.type === 'horizontalRule') return '<hr>'

  // Image block
  if (node.type === 'imageBlock' || node.type === 'image') {
    const src = node.attrs?.src || ''
    const alt = node.attrs?.alt || ''
    const caption = node.attrs?.caption
    let html = `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />`
    if (caption) html += `<figcaption>${escapeHtml(caption)}</figcaption>`
    html += '</figure>'
    return html
  }

  // Embed block
  if (node.type === 'embedBlock') {
    const src = node.attrs?.url || node.attrs?.src || ''
    if (!isSafeUrl(src)) return ''
    const height = node.attrs?.height || 300
    return `<div class="embed-container not-prose" style="margin:1rem 0"><iframe src="${escapeAttr(src)}" style="width:100%;height:${height}px;border:0;border-radius:0.375rem" allowfullscreen></iframe></div>`
  }

  // Mailing list block (Mailchimp form)
  if (node.type === 'mailingListBlock') {
    const action = node.attrs?.action || ''
    const honeypotName = node.attrs?.honeypotName || ''
    if (!action) return ''
    return `<div class="mailing-list-block">
      <form action="${escapeAttr(action)}" method="post" target="_blank">
        <h2>Subscribe</h2>
        <div style="display:flex;align-items:end;gap:0.5rem">
          <div style="flex-grow:1">
            <label for="mce-EMAIL">Email Address *</label>
            <input id="mce-EMAIL" type="email" name="EMAIL" required style="width:100%;height:2.5rem;border:1px solid black;padding:0.5rem" />
          </div>
          <input type="submit" value="Subscribe" style="height:2.5rem;background:black;color:white;padding:0 1rem;cursor:pointer;border:none" />
        </div>
        ${honeypotName ? `<div aria-hidden="true" style="position:absolute;left:-5000px"><input type="text" name="${escapeAttr(honeypotName)}" tabindex="-1" value="" /></div>` : ''}
      </form>
    </div>`
  }

  // Recurse into children
  const children = Array.isArray(node.content)
    ? node.content.map(renderNode).join('')
    : ''

  switch (node.type) {
    case 'doc': return children
    case 'paragraph': return `<p>${children || '&nbsp;'}</p>`
    case 'heading': {
      const level = Math.min(Math.max(node.attrs?.level ?? 2, 1), 6)
      return `<h${level}>${children}</h${level}>`
    }
    case 'bulletList': return `<ul>${children}</ul>`
    case 'orderedList': return `<ol>${children}</ol>`
    case 'listItem': return `<li>${children}</li>`
    case 'blockquote': return `<blockquote>${children}</blockquote>`
    case 'codeBlock': return `<pre><code>${children}</code></pre>`
    default: return children
  }
}

function parseTipTapJson(content: string | object): TipTapNode | null {
  if (typeof content === 'object' && content !== null && (content as any).type === 'doc') {
    return content as TipTapNode
  }
  if (typeof content === 'string' && content.startsWith('{')) {
    try {
      const parsed = JSON.parse(content)
      if (parsed?.type === 'doc') return parsed as TipTapNode
    }
    catch { /* not valid JSON */ }
  }
  return null
}

/**
 * Render TipTap JSON content to HTML.
 * Accepts a JSON string or a parsed TipTap document object.
 * Returns empty string for invalid/non-TipTap input.
 */
export function renderTipTapToHtml(content: string | object): string {
  if (!content) return ''
  const doc = parseTipTapJson(content)
  if (!doc) return ''
  return renderNode(doc)
}