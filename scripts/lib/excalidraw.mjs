/**
 * Ticket-diagram emitters — pure, dependency-free.
 *
 * One graph model → two outputs:
 *   - toExcalidraw(graph)  → a valid Excalidraw scene v2 (the EDITABLE source of truth;
 *                            arrows are *bound* to boxes so dragging a box keeps the graph
 *                            connected). Open it in excalidraw.com, rearrange, commit it back.
 *   - toSvg(graph)         → an offline, self-contained SVG mirror of the same scene, for
 *                            rasterising to a PNG (the body image that renders on mobile).
 *
 * Graph contract (see scripts/ticket-excalidraw.mjs):
 *   {
 *     epic: 479, slug: "…", title: "…",
 *     nodes: [{ id: 454, title: "Schemas + config", status: "done" }],
 *     edges: [{ from: 454, to: 455 }],   // `from` blocks `to` (arrow points blocker → dependent)
 *     goal?: { label: "library-catalog.pmcp.dev" }
 *   }
 *
 * status ∈ done | in_progress | blocked | pending   (goal node uses its own colour)
 *
 * Determinism: seeds/versionNonces are derived from element ids (no Math.random, no clock),
 * so regenerating an unchanged graph yields a byte-identical scene → minimal git diffs.
 */

// ── Status palette (Excalidraw's own swatches) ───────────────────────────────
export const STATUS = {
  done: { bg: '#b2f2bb', stroke: '#2f9e44', label: 'done' },
  in_progress: { bg: '#a5d8ff', stroke: '#1971c2', label: 'in progress' },
  blocked: { bg: '#ffc9c9', stroke: '#e03131', label: 'blocked' },
  pending: { bg: '#ffec99', stroke: '#f08c00', label: 'pending' },
  goal: { bg: '#d0bfff', stroke: '#7048e8', label: 'goal' },
}

// ── Layout geometry ──────────────────────────────────────────────────────────
const BOX_W = 230
const BOX_H = 96
const GAP_X = 48
const GAP_Y = 88
const MARGIN = 40
const TITLE_H = 96 // headroom for the heading + subtitle + legend row (SVG only)
const MIN_CANVAS_W = 760 // so the heading/subtitle/legend never clip on a single-column graph

// FNV-1a → a stable 31-bit seed for an element id.
function seedFor(s) {
  let h = 2166136261
  const str = String(s)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 1
}

/**
 * Longest-path layering of the DAG: layer(v) = max(layer(u)+1) over edges u→v,
 * roots (no incoming edge) at layer 0. Cycles are broken by ignoring back-edges
 * that would revisit a node (defensive — ticket graphs should be acyclic).
 */
export function layout(graph) {
  const nodes = graph.nodes || []
  const edges = (graph.edges || []).filter(
    (e) => nodes.some((n) => n.id === e.from) && nodes.some((n) => n.id === e.to),
  )
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const incoming = new Map(nodes.map((n) => [n.id, []]))
  const outgoing = new Map(nodes.map((n) => [n.id, []]))
  for (const e of edges) {
    outgoing.get(e.from).push(e.to)
    incoming.get(e.to).push(e.from)
  }

  // Longest-path layer via memoised DFS (visited guards against cycles).
  const layerOf = new Map()
  const inStack = new Set()
  function depth(id) {
    if (layerOf.has(id)) return layerOf.get(id)
    if (inStack.has(id)) return 0 // cycle guard
    inStack.add(id)
    let d = 0
    for (const p of incoming.get(id)) d = Math.max(d, depth(p) + 1)
    inStack.delete(id)
    layerOf.set(id, d)
    return d
  }
  for (const n of nodes) depth(n.id)

  // Bucket nodes into layers, order within a layer by id for stable placement.
  let maxLayer = 0
  for (const v of layerOf.values()) maxLayer = Math.max(maxLayer, v)
  const layers = Array.from({ length: maxLayer + 1 }, () => [])
  for (const n of nodes) layers[layerOf.get(n.id)].push(n.id)
  layers.forEach((l) => l.sort((a, b) => a - b))

  // Goal node (if any) gets its own final layer, centred.
  const hasGoal = !!(graph.goal && graph.goal.label)
  const goalLayer = hasGoal ? layers.length : -1

  const widest = Math.max(1, ...layers.map((l) => l.length), hasGoal ? 1 : 0)
  const computedW = MARGIN * 2 + widest * BOX_W + (widest - 1) * GAP_X
  const canvasW = Math.max(MIN_CANVAS_W, computedW)
  const totalLayers = layers.length + (hasGoal ? 1 : 0)
  const canvasH = TITLE_H + MARGIN * 2 + totalLayers * BOX_H + (totalLayers - 1) * GAP_Y

  const placed = new Map()
  const rowY = (layerIdx) => TITLE_H + MARGIN + layerIdx * (BOX_H + GAP_Y)
  const rowStartX = (count) => {
    const rowW = count * BOX_W + (count - 1) * GAP_X
    return MARGIN + (canvasW - MARGIN * 2 - rowW) / 2
  }

  layers.forEach((ids, layerIdx) => {
    const startX = rowStartX(ids.length)
    ids.forEach((id, i) => {
      placed.set(id, {
        node: byId.get(id),
        x: startX + i * (BOX_W + GAP_X),
        y: rowY(layerIdx),
        w: BOX_W,
        h: BOX_H,
      })
    })
  })

  let goal = null
  if (hasGoal) {
    goal = {
      label: graph.goal.label,
      x: rowStartX(1),
      y: rowY(goalLayer),
      w: BOX_W,
      h: BOX_H,
    }
  }

  return { placed, goal, edges, canvasW, canvasH }
}

// ── Excalidraw scene ─────────────────────────────────────────────────────────
const FIXED_UPDATED = 1 // constant clock → stable diffs

function rectEl(id, box, colors, boundIds) {
  return {
    id,
    type: 'rectangle',
    x: box.x,
    y: box.y,
    width: box.w,
    height: box.h,
    angle: 0,
    strokeColor: colors.stroke,
    backgroundColor: colors.bg,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: seedFor(id),
    version: 1,
    versionNonce: seedFor(id + ':n'),
    isDeleted: false,
    boundElements: boundIds,
    updated: FIXED_UPDATED,
    link: null,
    locked: false,
  }
}

function textEl(id, containerId, box, text) {
  const lineHeight = 1.25
  const fontSize = 16
  const lines = text.split('\n').length
  const height = Math.round(fontSize * lineHeight * lines)
  return {
    id,
    type: 'text',
    x: box.x + 8,
    y: box.y + box.h / 2 - height / 2,
    width: box.w - 16,
    height,
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: seedFor(id),
    version: 1,
    versionNonce: seedFor(id + ':n'),
    isDeleted: false,
    boundElements: null,
    updated: FIXED_UPDATED,
    link: null,
    locked: false,
    text,
    fontSize,
    fontFamily: 2,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId,
    originalText: text,
    lineHeight,
  }
}

function arrowEl(id, from, to) {
  const sx = from.x + from.w / 2
  const sy = from.y + from.h
  const ex = to.x + to.w / 2
  const ey = to.y
  return {
    id,
    type: 'arrow',
    x: sx,
    y: sy,
    width: Math.abs(ex - sx),
    height: Math.abs(ey - sy),
    angle: 0,
    strokeColor: '#495057',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 2 },
    seed: seedFor(id),
    version: 1,
    versionNonce: seedFor(id + ':n'),
    isDeleted: false,
    boundElements: null,
    updated: FIXED_UPDATED,
    link: null,
    locked: false,
    points: [
      [0, 0],
      [ex - sx, ey - sy],
    ],
    lastCommittedPoint: null,
    startBinding: { elementId: from.rectId, focus: 0, gap: 4 },
    endBinding: { elementId: to.rectId, focus: 0, gap: 4 },
    startArrowhead: null,
    endArrowhead: 'arrow',
  }
}

// A free-standing (unbound) text label — used for the scene's title/subtitle/footer chrome.
function labelEl(id, x, y, text, { fontSize = 16, color = '#1e1e1e', align = 'left', width = 600 } = {}) {
  const lineHeight = 1.25
  return {
    id,
    type: 'text',
    x,
    y,
    width,
    height: Math.round(fontSize * lineHeight),
    angle: 0,
    strokeColor: color,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: seedFor(id),
    version: 1,
    versionNonce: seedFor(id + ':n'),
    isDeleted: false,
    boundElements: null,
    updated: FIXED_UPDATED,
    link: null,
    locked: false,
    text,
    fontSize,
    fontFamily: 2,
    textAlign: align,
    verticalAlign: 'top',
    containerId: null,
    originalText: text,
    lineHeight,
  }
}

// A small legend swatch (filled rounded square) — pairs with a labelEl beside it.
function swatchEl(id, x, y, colors) {
  return {
    id,
    type: 'rectangle',
    x,
    y,
    width: 16,
    height: 16,
    angle: 0,
    strokeColor: colors.stroke,
    backgroundColor: colors.bg,
    fillStyle: 'solid',
    strokeWidth: 1.5,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: seedFor(id),
    version: 1,
    versionNonce: seedFor(id + ':n'),
    isDeleted: false,
    boundElements: null,
    updated: FIXED_UPDATED,
    link: null,
    locked: false,
  }
}

export function toExcalidraw(graph) {
  const { placed, goal, edges, canvasW, canvasH } = layout(graph)
  const elements = []

  // ── Chrome: title + subtitle + legend + footer (matches the PNG render) ──
  const counts = { done: 0, in_progress: 0, blocked: 0, pending: 0 }
  for (const b of placed.values()) counts[b.node.status] = (counts[b.node.status] || 0) + 1
  const total = placed.size
  elements.push(
    labelEl('chrome-title', MARGIN, 16, `Epic #${graph.epic ?? ''} — ${graph.title || graph.slug || ''}`, {
      fontSize: 28,
      color: '#111827',
      width: canvasW - MARGIN * 2,
    }),
  )
  elements.push(
    labelEl(
      'chrome-sub',
      MARGIN,
      54,
      `${total} issue${total === 1 ? '' : 's'} · ${counts.done} done · ${counts.in_progress} in progress · ${counts.blocked} blocked · ${counts.pending} pending`,
      { fontSize: 14, color: '#6b7280', width: canvasW - MARGIN * 2 },
    ),
  )
  const present = new Set([...placed.values()].map((b) => b.node.status))
  const legendKeys = ['done', 'in_progress', 'blocked', 'pending'].filter((s) => present.has(s))
  if (goal) legendKeys.push('goal')
  let lx = MARGIN
  legendKeys.forEach((s) => {
    const c = STATUS[s]
    elements.push(swatchEl(`chrome-legend-sw-${s}`, lx, 80, c))
    elements.push(
      labelEl(`chrome-legend-tx-${s}`, lx + 22, 80, c.label, { fontSize: 13, color: '#495057', width: 140 }),
    )
    lx += 22 + c.label.length * 7.2 + 24
  })
  elements.push(
    labelEl(
      'chrome-foot',
      MARGIN,
      canvasH - 28,
      'Generated from the GitHub sub-issue tree · rearrange freely, then commit this .excalidraw back.',
      { fontSize: 12, color: '#9ca3af', width: canvasW - MARGIN * 2 },
    ),
  )

  // Resolve a rect id per node (and the goal), record bound element ids.
  const rectIdOf = new Map()
  for (const id of placed.keys()) rectIdOf.set(id, `rect-${id}`)
  const goalRectId = goal ? 'rect-goal' : null

  // Pre-compute which arrows touch each box (for boundElements).
  const arrowsByBox = new Map()
  const pushArrow = (boxKey, arrowId) => {
    if (!arrowsByBox.has(boxKey)) arrowsByBox.set(boxKey, [])
    arrowsByBox.get(boxKey).push(arrowId)
  }
  const arrowDefs = []
  edges.forEach((e, i) => {
    const arrowId = `arrow-${e.from}-${e.to}`
    arrowDefs.push({ arrowId, from: e.from, to: e.to })
    pushArrow(e.from, arrowId)
    pushArrow(e.to, arrowId)
  })
  // Edges into the goal node: every terminal node (no outgoing) → goal.
  if (goal) {
    const hasOut = new Set(edges.map((e) => e.from))
    const terminals = [...placed.keys()].filter((id) => !hasOut.has(id))
    terminals.forEach((id) => {
      const arrowId = `arrow-${id}-goal`
      arrowDefs.push({ arrowId, from: id, to: 'goal' })
      pushArrow(id, arrowId)
      pushArrow('goal', arrowId)
    })
  }

  // Rectangles + bound text.
  for (const [id, box] of placed) {
    const rectId = rectIdOf.get(id)
    const textId = `text-${id}`
    const bound = [
      { type: 'text', id: textId },
      ...(arrowsByBox.get(id) || []).map((aid) => ({ type: 'arrow', id: aid })),
    ]
    const colors = STATUS[box.node.status] || STATUS.pending
    const topLine = box.node.ref ?? `#${id}`
    elements.push(rectEl(rectId, box, colors, bound))
    elements.push(textEl(textId, rectId, box, `${topLine}\n${box.node.title || ''}`))
  }
  if (goal) {
    const textId = 'text-goal'
    const bound = [
      { type: 'text', id: textId },
      ...(arrowsByBox.get('goal') || []).map((aid) => ({ type: 'arrow', id: aid })),
    ]
    elements.push(rectEl(goalRectId, goal, STATUS.goal, bound))
    elements.push(textEl(textId, goalRectId, goal, `🎯 ${goal.label}`))
  }

  // Arrows (after boxes so bindings resolve to existing ids).
  const boxRef = (key) =>
    key === 'goal'
      ? { ...goal, rectId: goalRectId }
      : { ...placed.get(key), rectId: rectIdOf.get(key) }
  for (const d of arrowDefs) {
    elements.push(arrowEl(d.arrowId, boxRef(d.from), boxRef(d.to)))
  }

  return {
    type: 'excalidraw',
    version: 2,
    source: 'https://github.com/pmcp/nuxt-crouton',
    elements,
    appState: { viewBackgroundColor: '#ffffff', gridSize: null },
    files: {},
  }
}

// ── SVG mirror (offline, self-contained) ─────────────────────────────────────
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// Greedy word-wrap to a max line count, ellipsising the overflow.
function wrapLabel(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w
    if (candidate.length > maxChars && cur) {
      lines.push(cur)
      cur = w
      if (lines.length === maxLines) break
    } else {
      cur = candidate
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur)
  if (lines.length === maxLines) {
    // mark truncation if words remain unconsumed
    const consumed = lines.join(' ').length
    if (consumed < String(text).length - 1) {
      let last = lines[maxLines - 1]
      if (last.length > maxChars - 1) last = last.slice(0, maxChars - 1)
      lines[maxLines - 1] = last + '…'
    }
  }
  return lines
}

function boxSvg(box, colors, idLabel, title) {
  const cx = box.x + box.w / 2
  const titleLines = wrapLabel(title || '', 28, 2)
  const idY = box.y + 26
  const startY = box.y + 48
  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="${cx}" y="${startY + i * 19}" text-anchor="middle" class="t-title">${esc(line)}</text>`,
    )
    .join('')
  return `<g>
    <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="10"
      fill="${colors.bg}" stroke="${colors.stroke}" stroke-width="2"/>
    <text x="${cx}" y="${idY}" text-anchor="middle" class="t-id" fill="${colors.stroke}">${esc(idLabel)}</text>
    ${titleSvg}
  </g>`
}

function arrowSvg(from, to) {
  const sx = from.x + from.w / 2
  const sy = from.y + from.h
  const ex = to.x + to.w / 2
  const ey = to.y
  // slight cubic so crossing arrows read as separate strands
  const my = (sy + ey) / 2
  return `<path d="M ${sx} ${sy} C ${sx} ${my}, ${ex} ${my}, ${ex} ${ey - 8}"
    fill="none" stroke="#868e96" stroke-width="2" marker-end="url(#arrowhead)"/>`
}

export function toSvg(graph) {
  const { placed, goal, edges, canvasW, canvasH } = layout(graph)
  const boxRef = (key) => (key === 'goal' ? goal : placed.get(key))

  // Arrows first (under boxes).
  const arrowParts = []
  for (const e of edges) arrowParts.push(arrowSvg(placed.get(e.from), placed.get(e.to)))
  if (goal) {
    const hasOut = new Set(edges.map((e) => e.from))
    for (const id of placed.keys()) if (!hasOut.has(id)) arrowParts.push(arrowSvg(placed.get(id), goal))
  }

  const boxParts = []
  for (const [id, box] of placed) {
    const colors = STATUS[box.node.status] || STATUS.pending
    boxParts.push(boxSvg(box, colors, box.node.ref ?? `#${id}`, box.node.title))
  }
  if (goal) boxParts.push(boxSvg(goal, STATUS.goal, '🎯 goal', goal.label))

  // Legend: a single horizontal row under the subtitle (always fits, mobile-friendly).
  // Only statuses actually present, plus goal if any.
  const present = new Set([...placed.values()].map((b) => b.node.status))
  const legendItems = ['done', 'in_progress', 'blocked', 'pending'].filter((s) => present.has(s))
  if (goal) legendItems.push('goal')
  const legendY = 64
  let legendX = MARGIN
  const legendSvg = legendItems
    .map((s) => {
      const c = STATUS[s]
      const item = `<rect x="${legendX}" y="${legendY}" width="13" height="13" rx="3" fill="${c.bg}" stroke="${c.stroke}" stroke-width="1.5"/>
        <text x="${legendX + 19}" y="${legendY + 11}" class="t-legend">${esc(c.label)}</text>`
      legendX += 19 + c.label.length * 6.7 + 22 // swatch + label + gap
      return item
    })
    .join('\n  ')

  const heading = `Epic #${esc(graph.epic ?? '')} — ${esc(graph.title || graph.slug || '')}`
  const counts = (() => {
    const c = { done: 0, in_progress: 0, blocked: 0, pending: 0 }
    for (const b of placed.values()) c[b.node.status] = (c[b.node.status] || 0) + 1
    const total = placed.size
    return `${total} issue${total === 1 ? '' : 's'} · ${c.done} done · ${c.in_progress} in progress · ${c.blocked} blocked · ${c.pending} pending`
  })()

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <defs>
    <marker id="arrowhead" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L7,3 L0,6 Z" fill="#868e96"/>
    </marker>
  </defs>
  <style>
    .t-id{font-size:13px;font-weight:700;}
    .t-title{font-size:13.5px;fill:#1e1e1e;}
    .t-legend{font-size:12px;fill:#495057;}
    .t-heading{font-size:20px;font-weight:800;fill:#111827;}
    .t-sub{font-size:12.5px;fill:#6b7280;}
    .t-foot{font-size:11px;fill:#9ca3af;}
  </style>
  <rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="#ffffff"/>
  <text x="${MARGIN}" y="30" class="t-heading">${heading}</text>
  <text x="${MARGIN}" y="50" class="t-sub">${esc(counts)}</text>
  ${legendSvg}
  ${arrowParts.join('\n  ')}
  ${boxParts.join('\n  ')}
  <text x="${MARGIN}" y="${canvasH - 12}" class="t-foot">Generated from the GitHub sub-issue tree · edit the .excalidraw to change the layout, then commit it back.</text>
</svg>`
}

export function toHtml(graph) {
  const svg = toSvg(graph)
  return `<!DOCTYPE html>
<!-- ticket-diagram — generated by scripts/ticket-excalidraw.mjs. Offline, no JS/CDN. -->
<html lang="en"><head><meta charset="UTF-8"/>
<style>html,body{margin:0;padding:0;background:#ffffff;}svg{display:block;}</style>
</head><body>${svg}</body></html>`
}
