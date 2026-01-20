/**
 * Get list of framework packages based on features config
 */
export function getFrameworkPackages(features = {}) {
  const packages = ['@fyit/crouton-core']  // Always include core

  // Core add-ons (enabled by default, can be disabled with `false`)
  if (features.auth !== false) packages.push('@fyit/crouton-auth')
  if (features.admin !== false) packages.push('@fyit/crouton-admin')
  if (features.i18n !== false) packages.push('@fyit/crouton-i18n')

  // Optional add-ons (disabled by default, must be explicitly enabled)
  if (features.editor) packages.push('@fyit/crouton-editor')
  if (features.flow) packages.push('@fyit/crouton-flow')
  if (features.assets) packages.push('@fyit/crouton-assets')
  if (features.maps) packages.push('@fyit/crouton-maps')
  if (features.ai) packages.push('@fyit/crouton-ai')
  if (features.email) packages.push('@fyit/crouton-email')
  if (features.events) packages.push('@fyit/crouton-events')
  if (features.collab) packages.push('@fyit/crouton-collab')
  if (features.pages) packages.push('@fyit/crouton-pages')

  // Mini-apps
  if (features.bookings) packages.push('@fyit/crouton-bookings')
  if (features.sales) packages.push('@fyit/crouton-sales')

  return packages
}
