import { createVNode, render } from 'vue'
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import CroutonDevTools from '../components/CroutonDevTools.vue'

/**
 * Mounts the unified dev-tools launcher (#809).
 *
 * The module only adds this plugin when dev-tools are enabled for the build
 * (local dev, or `NUXT_PUBLIC_CROUTON_DEVTOOLS=true`); we double-check at
 * runtime so production ships nothing. Folder-based auto-on (pocs/fixtures) is
 * #811.
 *
 * The launcher is appended to `<body>` after mount and rendered with the host
 * app's context (`appContext`), so the global Nuxt UI components inside the SFC
 * resolve — without the host app having to place anything in its layout.
 */
const ROOT_ID = '__crouton_devtools_root'

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const enabled = import.meta.dev || useRuntimeConfig().public.croutonDevtools
  if (!enabled) return

  nuxtApp.hook('app:mounted', () => {
    if (document.getElementById(ROOT_ID)) return

    const container = document.createElement('div')
    container.id = ROOT_ID
    document.body.appendChild(container)

    const vnode = createVNode(CroutonDevTools)
    vnode.appContext = nuxtApp.vueApp._context
    render(vnode, container)
  })
})
