// Development startup log (deduplicated across layer resolution)
const _dependencies = (globalThis as unknown as Record<string, Set<string>>).__croutonLayers ??= new Set()
if (process.env.NODE_ENV !== 'production' && !_dependencies.has('crouton-printing')) {
  _dependencies.add('crouton-printing')
  console.log('🍞 crouton:printing ✓ Layer loaded')
}

export default defineNuxtConfig({
  // Usage (addon layer — extend alongside the package that owns the print
  // engine + queue, e.g. crouton-sales):
  // extends: ['@fyit/crouton-core', '@fyit/crouton-sales', '@fyit/crouton-printing', './layers/sales']

  $meta: {
    description: 'On-site physical print delivery for Nuxt Crouton - ESC/POS drainer + HTTP spooler endpoints',
    name: 'crouton-printing'
  }

  // Nuxt's layer mechanism auto-registers this layer's server/{api,plugins,utils}
  // in the consuming app's Nitro (same as crouton-sales) — no extra config needed.
  // The transport endpoints/plugin reference cross-file deps via explicit imports.
})
