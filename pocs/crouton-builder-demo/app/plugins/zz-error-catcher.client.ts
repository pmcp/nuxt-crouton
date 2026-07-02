import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'

/**
 * zz-error-catcher — TEMPORARY debug HUD (#1039). Two jobs, both "capture from load"
 * (which eruda misses, initing lazily on first toggle):
 *   1. Error box: window error/unhandledrejection + Vue error/warnHandler → red box.
 *   2. Live status line: reads the SpecWalkPanel's DOM markers every 500ms and shows
 *      mounted / open / sheet-rendered, so we can tell WHY the panel is invisible:
 *        - mounted=NO            → panel not mounting (app.vue/resolve)
 *        - mounted=YES open=false→ open flag not shared/reactive
 *        - open=true sheet=NO    → v-if not reacting / render bailed
 *        - open=true sheet=YES   → it renders — a CSS/stacking issue
 * Gated dev/review. Remove once the panel works.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return
  if (!(import.meta.dev || useRuntimeConfig().public.croutonFeedback)) return

  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:rgba(20,20,30,.95);color:#0f0;font:11px/1.5 ui-monospace,monospace;padding:6px 10px;white-space:pre-wrap;max-height:45vh;overflow:auto'
  const status = document.createElement('div')
  status.style.cssText = 'color:#7fd7ff;font-weight:700'
  box.appendChild(status)
  const add = (label: string, msg: string) => {
    box.style.background = 'rgba(130,0,0,.96)'; box.style.color = '#fff'
    const p = document.createElement('div'); p.textContent = `[${label}] ${msg}`; box.appendChild(p)
  }
  box.addEventListener('click', () => { box.querySelectorAll('div:not(:first-child)').forEach(n => n.remove()); box.style.background = 'rgba(20,20,30,.95)'; box.style.color = '#0f0' })
  const mount = () => { if (document.body && !document.body.contains(box)) document.body.appendChild(box) }
  if (document.body) mount(); else window.addEventListener('DOMContentLoaded', mount)

  // Live status HUD
  setInterval(() => {
    const marker = document.querySelector('[data-sw-mounted]')
    const mounted = !!marker
    const open = marker?.getAttribute('data-sw-open') ?? 'n/a'
    const sheet = !!document.querySelector('[data-sw-sheet]')
    const sw = (window as unknown as { __SW?: Record<string, unknown> }).__SW || {}
    status.textContent = `SW · app=${sw.app ? 'Y' : 'N'} import=${sw.imp ? 'Y' : 'N'} panelSetup=${sw.panel ? 'Y' : 'N'} walk=${sw.walk ?? '?'} · mounted=${mounted ? 'YES' : 'NO'} open=${open} sheet=${sheet ? 'YES' : 'NO'}`
  }, 500)

  window.addEventListener('error', e => add('js', `${e.message}${e.filename ? ` @ ${e.filename.split('/').pop()}:${e.lineno}` : ''}`))
  window.addEventListener('unhandledrejection', e => add('promise', String((e.reason && e.reason.message) || e.reason)))
  const app = nuxtApp.vueApp
  const prevErr = app.config.errorHandler
  app.config.errorHandler = (err: unknown, inst: unknown, info: string) => { add('vue', `${info}: ${(err as Error)?.message || String(err)}`); if (typeof prevErr === 'function') (prevErr as (...a: unknown[]) => void)(err, inst, info) }
  const prevWarn = app.config.warnHandler
  app.config.warnHandler = (msg: string, inst: unknown, trace: string) => { add('warn', msg); if (typeof prevWarn === 'function') (prevWarn as (...a: unknown[]) => void)(msg, inst, trace) }
})
