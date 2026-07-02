import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'

/**
 * zz-error-catcher — TEMPORARY debug aid (#1039). Pure-DOM on-page error box that
 * captures from load: window.onerror + unhandledrejection + Vue errorHandler +
 * warnHandler (so "Failed to resolve component" / render errors show on mobile,
 * which eruda misses because it inits lazily on first Console toggle). Named `zz-`
 * so it registers after other plugins. Gated to dev/review. Remove once the
 * spec-walk panel renders (this is the prototype of the crouton-feedback
 * "capture from load" improvement).
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return
  if (!(import.meta.dev || useRuntimeConfig().public.croutonFeedback)) return

  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;top:0;left:0;right:0;max-height:45vh;overflow:auto;z-index:2147483647;background:rgba(130,0,0,.96);color:#fff;font:11px/1.45 ui-monospace,monospace;padding:8px 10px;display:none;white-space:pre-wrap'
  const title = document.createElement('div')
  title.textContent = '⚠️ debug catcher — tap to clear'
  title.style.cssText = 'font-weight:700;margin-bottom:4px;opacity:.8'
  box.appendChild(title)
  const add = (label: string, msg: string) => {
    box.style.display = 'block'
    const p = document.createElement('div')
    p.textContent = `[${label}] ${msg}`
    box.appendChild(p)
  }
  box.addEventListener('click', () => { box.style.display = 'none'; box.querySelectorAll('div:not(:first-child)').forEach(n => n.remove()) })
  const mount = () => { if (document.body && !document.body.contains(box)) document.body.appendChild(box) }
  if (document.body) mount(); else window.addEventListener('DOMContentLoaded', mount)

  window.addEventListener('error', e => add('js', `${e.message}${e.filename ? ` @ ${e.filename.split('/').pop()}:${e.lineno}` : ''}`))
  window.addEventListener('unhandledrejection', e => add('promise', String((e.reason && e.reason.message) || e.reason)))

  const app = nuxtApp.vueApp
  const prevErr = app.config.errorHandler
  app.config.errorHandler = (err: unknown, inst: unknown, info: string) => {
    add('vue', `${info}: ${(err as Error)?.message || String(err)}`)
    if (typeof prevErr === 'function') (prevErr as (...a: unknown[]) => void)(err, inst, info)
  }
  const prevWarn = app.config.warnHandler
  app.config.warnHandler = (msg: string, inst: unknown, trace: string) => {
    add('warn', msg)
    if (typeof prevWarn === 'function') (prevWarn as (...a: unknown[]) => void)(msg, inst, trace)
  }
})
