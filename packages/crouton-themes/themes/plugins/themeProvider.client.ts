// Theme Provider Plugin
// Runs client-side only. Provides theme state and menu items via Vue's inject
// system so other layers (crouton-auth) can consume them without a hard
// cross-package dependency.
//
// Consuming layers inject using these keys:
//   'crouton:themePreferenceItems' → ComputedRef<DropdownMenuItem[]>
//   'crouton:hasThemes'            → true (presence check)

import type { DropdownMenuItem } from '@nuxt/ui'

export default defineNuxtPlugin((nuxtApp) => {
  const { themeMenuItem } = useThemeMenuItems()

  // Provide theme items as a computed so consumers stay reactive
  nuxtApp.vueApp.provide(
    'crouton:themePreferenceItems',
    computed<DropdownMenuItem[]>(() => [themeMenuItem.value])
  )

  // Simple boolean flag so consumers can check theme layer is active
  nuxtApp.vueApp.provide('crouton:hasThemes', true)
})