/**
 * Get list of framework packages based on features config
 *
 * IMPORTANT: @fyit/crouton-core already includes these packages internally:
 * - @fyit/crouton-auth
 * - @fyit/crouton-admin
 * - @fyit/crouton-i18n
 *
 * DO NOT add them separately - it causes duplicate layer loading which breaks
 * composable resolution (e.g., useT becomes "$setup.t is not a function").
 *
 * @see packages/crouton-core/nuxt.config.ts - extends array
 */
export function getFrameworkPackages(features = {}) {
  // Core package includes auth, admin, and i18n - always required
  const packages = ['@fyit/crouton-core']

  // NOTE: auth, admin, i18n are BUNDLED in crouton-core
  // The features flags below are intentionally NOT adding separate packages.
  // They exist for future use (e.g., disabling features at runtime) but
  // should NOT result in separate package additions to the extends array.
  //
  // Previously this code added @fyit/crouton-auth, @fyit/crouton-admin,
  // @fyit/crouton-i18n separately - this caused SSR errors from duplicate
  // composable resolution.

  // Optional add-ons (disabled by default, must be explicitly enabled)
  if (features.editor) packages.push('@fyit/crouton-editor')
  if (features.flow) packages.push('@fyit/crouton-flow')
  if (features.assets) packages.push('@fyit/crouton-assets')
  if (features.maps) packages.push('@fyit/crouton-maps')
  if (features.ai) packages.push('@fyit/crouton-ai')  // Supports boolean or { defaultModel: '...' }
  if (features.email) packages.push('@fyit/crouton-email')
  if (features.events) packages.push('@fyit/crouton-events')
  if (features.collab) packages.push('@fyit/crouton-collab')
  if (features.pages) packages.push('@fyit/crouton-pages')

  // Mini-apps
  if (features.bookings) packages.push('@fyit/crouton-bookings')
  if (features.sales) packages.push('@fyit/crouton-sales')

  return packages
}
