import { createVNode, render, type Component } from 'vue'

/**
 * Mount an overlay component into `<body>` once, rendered with the host app's
 * context so global Nuxt UI components resolve — without the host placing
 * anything in its layout. Shared by the launcher and (later) the Annotate tool
 * overlay.
 */
export function mountOverlayInBody(component: Component, appContext: unknown, id: string): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(id)) return

  const container = document.createElement('div')
  container.id = id
  document.body.appendChild(container)

  const vnode = createVNode(component)
  ;(vnode as { appContext?: unknown }).appContext = appContext
  render(vnode, container)
}
