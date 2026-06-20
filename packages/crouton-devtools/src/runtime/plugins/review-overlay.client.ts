import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { buildAnnotation, type ReviewAnnotation } from '../overlay/capture'

/**
 * Preview-review overlay (epic #488, #489).
 *
 * A self-contained in-page toolbar for deployed STAGING previews: click an
 * element, type a comment, and it captures a structured `ReviewAnnotation`
 * (route + selector + bounding box + the owning source file from #490's
 * `data-crouton-src`). It POSTs to `/api/_review` (the GitHub bridge lands in
 * #491); until that endpoint exists the payload is still logged + toasted so the
 * capture half is verifiable on its own.
 *
 * Vanilla DOM on purpose — no dependency on the host app's UI library, so it
 * renders identically on any crouton app/sandbox preview. Gating is build-time
 * (the module only registers this plugin when NUXT_PUBLIC_CROUTON_REVIEW=true),
 * with a runtime double-check; production bundles never include it.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const enabled = import.meta.dev || useRuntimeConfig().public.croutonReview
  if (!enabled) return

  const NS = 'crouton-review'
  let selecting = false
  let frozen: Element | null = null

  // --- styles -------------------------------------------------------------
  const style = document.createElement('style')
  style.textContent = `
    .${NS}-fab{position:fixed;right:16px;bottom:16px;z-index:2147483646;
      font:600 13px system-ui,sans-serif;padding:8px 12px;border-radius:9999px;
      border:none;cursor:pointer;color:#fff;background:#6366f1;
      box-shadow:0 4px 14px rgba(0,0,0,.25)}
    .${NS}-fab[data-on="true"]{background:#dc2626}
    .${NS}-hl{position:fixed;z-index:2147483645;pointer-events:none;
      border:2px solid #6366f1;background:rgba(99,102,241,.12);border-radius:3px;
      transition:all .04s linear}
    .${NS}-panel{position:fixed;z-index:2147483647;width:280px;
      font:13px system-ui,sans-serif;background:#fff;color:#111;border-radius:10px;
      box-shadow:0 8px 30px rgba(0,0,0,.3);padding:12px;border:1px solid #e5e7eb}
    .${NS}-panel code{font-size:11px;color:#6366f1;word-break:break-all}
    .${NS}-panel textarea{width:100%;box-sizing:border-box;margin-top:8px;
      min-height:64px;resize:vertical;border:1px solid #d1d5db;border-radius:6px;
      padding:6px;font:13px system-ui,sans-serif}
    .${NS}-row{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
    .${NS}-row button{font:600 12px system-ui;padding:6px 10px;border-radius:6px;
      border:none;cursor:pointer}
    .${NS}-send{background:#6366f1;color:#fff}
    .${NS}-cancel{background:#f3f4f6;color:#111}
    .${NS}-toast{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);
      z-index:2147483647;background:#111;color:#fff;font:13px system-ui;
      padding:8px 14px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.3)}
  `
  document.head.appendChild(style)

  const isOurs = (el: EventTarget | null) =>
    el instanceof Element && el.closest(`[class^="${NS}-"]`) !== null

  // --- highlight ----------------------------------------------------------
  const hl = document.createElement('div')
  hl.className = `${NS}-hl`
  hl.style.display = 'none'
  document.body.appendChild(hl)

  const moveHighlightTo = (el: Element) => {
    const r = el.getBoundingClientRect()
    hl.style.display = 'block'
    hl.style.left = `${r.left}px`
    hl.style.top = `${r.top}px`
    hl.style.width = `${r.width}px`
    hl.style.height = `${r.height}px`
  }

  const onMove = (e: MouseEvent) => {
    if (!selecting || isOurs(e.target)) return
    if (e.target instanceof Element) moveHighlightTo(e.target)
  }

  // --- toast --------------------------------------------------------------
  const toast = (msg: string) => {
    const t = document.createElement('div')
    t.className = `${NS}-toast`
    t.textContent = msg
    document.body.appendChild(t)
    setTimeout(() => t.remove(), 2600)
  }

  // --- submit -------------------------------------------------------------
  const submit = async (annotation: ReviewAnnotation) => {
    try {
      await $fetch('/api/_review', { method: 'POST', body: annotation })
      toast('Sent to PR ✓')
    }
    catch {
      // The endpoint lands in #491; until then prove capture works on its own.
      console.warn('[crouton-review] /api/_review not available yet (#491). Annotation:', annotation)
      toast('Captured (endpoint pending #491)')
    }
  }

  // --- comment panel ------------------------------------------------------
  const openPanel = (el: Element) => {
    const r = el.getBoundingClientRect()
    const panel = document.createElement('div')
    panel.className = `${NS}-panel`
    const file = (el.closest('[data-crouton-src]') as HTMLElement | null)
      ?.getAttribute('data-crouton-src') ?? 'unknown'
    panel.innerHTML = `
      <div><strong>Comment</strong> · <code>${file}</code></div>
      <textarea placeholder="What should change here?"></textarea>
      <div class="${NS}-row">
        <button class="${NS}-cancel" type="button">Cancel</button>
        <button class="${NS}-send" type="button">Send</button>
      </div>`
    // Position near the element, clamped to the viewport.
    const top = Math.min(r.bottom + 8, window.innerHeight - 180)
    const left = Math.min(r.left, window.innerWidth - 296)
    panel.style.top = `${Math.max(8, top)}px`
    panel.style.left = `${Math.max(8, left)}px`
    document.body.appendChild(panel)

    const textarea = panel.querySelector('textarea') as HTMLTextAreaElement
    textarea.focus()

    const close = () => {
      panel.remove()
      hl.style.display = 'none'
      frozen = null
    }
    panel.querySelector(`.${NS}-cancel`)!.addEventListener('click', close)
    panel.querySelector(`.${NS}-send`)!.addEventListener('click', () => {
      const text = textarea.value.trim()
      if (!text) {
        textarea.focus()
        return
      }
      submit(buildAnnotation(el, text, window.location.pathname))
      close()
    })
  }

  const onClick = (e: MouseEvent) => {
    if (!selecting || isOurs(e.target) || !(e.target instanceof Element)) return
    e.preventDefault()
    e.stopPropagation()
    frozen = e.target
    setSelecting(false)
    moveHighlightTo(frozen)
    openPanel(frozen)
  }

  // --- mode toggle --------------------------------------------------------
  const fab = document.createElement('button')
  fab.className = `${NS}-fab`
  fab.type = 'button'
  fab.textContent = '💬 Comment'
  document.body.appendChild(fab)

  function setSelecting(on: boolean) {
    selecting = on
    fab.dataset.on = String(on)
    fab.textContent = on ? '✕ Cancel' : '💬 Comment'
    if (!on && !frozen) hl.style.display = 'none'
  }

  fab.addEventListener('click', () => setSelecting(!selecting))
  document.addEventListener('mousemove', onMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setSelecting(false)
  })
})
