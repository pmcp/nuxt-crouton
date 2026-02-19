// Theme Provider Plugin
// Runs client-side only. Writes theme menu items into a shared Nuxt useState key
// so other layers (crouton-auth) can read them without a hard cross-package dependency.
//
// Consuming layers read:
//   useState('crouton:themePreferenceItems', () => [])
//
// On the server this state is [] (dropdown is closed so no hydration mismatch).
// On the client the plugin populates it reactively before the app mounts.

import type { DropdownMenuItem } from '@nuxt/ui'

export default defineNuxtPlugin(() => {
  const { themeMenuItem } = useThemeMenuItems()

  // Shared state key — readable by any layer without importing from crouton-themes
  const sharedItems = useState<DropdownMenuItem[]>('crouton:themePreferenceItems', () => [])

  // Keep in sync as the active theme changes (updates the `active` flag on items)
  watchEffect(() => {
    sharedItems.value = [themeMenuItem.value]
  })
})
