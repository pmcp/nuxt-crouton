#!/usr/bin/env node
// PROTOTYPE (epic #479) — generate an editable Excalidraw scene from a ticket tree.
//
// Proves the "Excalidraw diagrams connected to tickets" idea: feed it the epic's
// sub-issue graph (nodes + Blocked-by edges + status) and it emits a `.excalidraw`
// file a human can open at excalidraw.com, rearrange/annotate freely, and hand back
// (commit the edited `.excalidraw` → the agent re-reads it). Arrows are BOUND to the
// boxes, so dragging a box keeps the graph connected — that's the iterate-with-the-bot
// property we want.
//
// Usage:  node scripts/proto-ticket-excalidraw.mjs > out.excalidraw
// (Hard-coded here to the library-catalog epic #453 tree as a test fixture.)

import { writeFileSync, mkdirSync } from 'node:fs'

// ── status palette ───────────────────────────────────────────────────────────
const PALETTE = {
  done:        { stroke: '#2f9e44', bg: '#ebfbee', tag: '✅ done' },
  in_progress: { stroke: '#f08c00', bg: '#fff9db', tag: '🔄 in progress' },
  pending:     { stroke: '#1971c2', bg: '#e7f5ff', tag: '⏳ pending' },
  blocked:     { stroke: '#e03131', bg: '#fff5f5', tag: '🔒 blocked' },
  goal:        { stroke: '#5f3dc4', bg: '#f3f0ff', tag: '🌐 goal' },
}

// ── the ticket tree (this is the bit a real tool reads from GitHub) ───────────
const TITLE = 'Epic #453 — Library Catalog POC'
const NODES = [
  { id: 'n454', label: '#454 Schemas + config',     status: 'done',        x: 80,  y: 220 },
  { id: 'n455', label: '#455 Scaffold + generate',   status: 'done',        x: 400, y: 220 },
  { id: 'n457', label: '#457 Deploy preview',        status: 'pending',     x: 720, y: 220 },
  { id: 'nurl', label: '🌐 library-catalog.pmcp.dev', status: 'goal',       x: 1040, y: 220 },
  { id: 'n456', label: '#456 Refine UI (optional)',  status: 'in_progress', x: 400, y: 400 },
]
const EDGES = [
  { from: 'n454', to: 'n455' },
  { from: 'n455', to: 'n457' },
  { from: 'n457', to: 'nurl' },
  { from: 'n455', to: 'n456' },
  { from: 'n456', to: 'n457', dashed: true }, // optional polish, off critical path
]

const W = 240, H = 92
const rnd = () => Math.floor(Math.random() * 2 ** 31)
const els = []

// title
els.push({
  id: 'title', type: 'text', x: 80, y: 150, width: 700, height: 36, angle: 0,
  strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid',
  strokeWidth: 1, strokeStyle: 'solid', roughness: 1, opacity: 100, groupIds: [],
  frameId: null, roundness: null, seed: rnd(), version: 1, versionNonce: rnd(),
  isDeleted: false, boundElements: [], updated: Date.now(), link: null, locked: false,
  text: TITLE, fontSize: 28, fontFamily: 3, textAlign: 'left', verticalAlign: 'top',
  baseline: 25, containerId: null, originalText: TITLE, lineHeight: 1.25,
})

const byId = Object.fromEntries(NODES.map(n => [n.id, n]))

for (const n of NODES) {
  const p = PALETTE[n.status]
  const textId = `${n.id}_t`
  els.push({
    id: n.id, type: 'rectangle', x: n.x, y: n.y, width: W, height: H, angle: 0,
    strokeColor: p.stroke, backgroundColor: p.bg, fillStyle: 'solid', strokeWidth: 2,
    strokeStyle: 'solid', roughness: 1, opacity: 100, groupIds: [], frameId: null,
    roundness: { type: 3 }, seed: rnd(), version: 1, versionNonce: rnd(), isDeleted: false,
    boundElements: [{ type: 'text', id: textId }], updated: Date.now(), link: null, locked: false,
  })
  const label = `${n.label}\n${p.tag}`
  els.push({
    id: textId, type: 'text', x: n.x + 12, y: n.y + 26, width: W - 24, height: 48, angle: 0,
    strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 1,
    strokeStyle: 'solid', roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null,
    seed: rnd(), version: 1, versionNonce: rnd(), isDeleted: false, boundElements: [],
    updated: Date.now(), link: null, locked: false, text: label, fontSize: 16, fontFamily: 3,
    textAlign: 'center', verticalAlign: 'middle', baseline: 40, containerId: n.id,
    originalText: label, lineHeight: 1.25,
  })
}

for (let i = 0; i < EDGES.length; i++) {
  const e = EDGES[i]
  const a = byId[e.from], b = byId[e.to]
  const id = `edge${i}`
  // start at right-or-bottom of A, end at left-or-top of B (simple heuristic)
  const horizontal = Math.abs((b.y) - (a.y)) < 60
  const sx = horizontal ? a.x + W : a.x + W / 2
  const sy = horizontal ? a.y + H / 2 : a.y + H
  const ex = horizontal ? b.x : b.x + W / 2
  const ey = horizontal ? b.y + H / 2 : b.y
  els.push({
    id, type: 'arrow', x: sx, y: sy, width: ex - sx, height: ey - sy, angle: 0,
    strokeColor: '#495057', backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 2,
    strokeStyle: e.dashed ? 'dashed' : 'solid', roughness: 1, opacity: 100, groupIds: [],
    frameId: null, roundness: { type: 2 }, seed: rnd(), version: 1, versionNonce: rnd(),
    isDeleted: false, boundElements: [], updated: Date.now(), link: null, locked: false,
    points: [[0, 0], [ex - sx, ey - sy]], lastCommittedPoint: null,
    startBinding: { elementId: a.id, focus: 0, gap: 6 },
    endBinding: { elementId: b.id, focus: 0, gap: 6 },
    startArrowhead: null, endArrowhead: 'arrow',
  })
  // register the arrow on both boxes so dragging a box keeps the arrow attached
  for (const nid of [a.id, b.id]) {
    const box = els.find(x => x.id === nid)
    box.boundElements.push({ type: 'arrow', id })
  }
}

const scene = {
  type: 'excalidraw', version: 2, source: 'https://excalidraw.com',
  elements: els,
  appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
  files: {},
}

mkdirSync('writeups/diagrams', { recursive: true })
const out = 'writeups/diagrams/library-catalog-453.excalidraw'
writeFileSync(out, JSON.stringify(scene, null, 2))
JSON.parse(JSON.stringify(scene)) // sanity
console.log(`wrote ${out}  (${els.length} elements)`)
