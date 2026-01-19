export default {
  // Scope mapping: commit scope → display name
  scopeMap: {
    // Core packages
    crouton: 'crouton',
    'crouton-core': 'crouton-core',
    'crouton-cli': 'crouton-cli',
    'crouton-auth': 'crouton-auth',
    'crouton-admin': 'crouton-admin',
    // Feature packages
    'crouton-i18n': 'crouton-i18n',
    'crouton-editor': 'crouton-editor',
    'crouton-assets': 'crouton-assets',
    'crouton-flow': 'crouton-flow',
    'crouton-bookings': 'crouton-bookings',
    'crouton-sales': 'crouton-sales',
    'crouton-ai': 'crouton-ai',
    'crouton-collab': 'crouton-collab',
    'crouton-devtools': 'crouton-devtools',
    'crouton-email': 'crouton-email',
    'crouton-events': 'crouton-events',
    'crouton-maps': 'crouton-maps',
    'crouton-mcp': 'crouton-mcp',
    'crouton-pages': 'crouton-pages',
    'crouton-schema-designer': 'crouton-schema-designer',
    'crouton-themes': 'crouton-themes',
    // Non-package scopes
    docs: 'Documentation',
    root: 'Root',
    playground: 'Playground',
    test: 'Testing',
  },
  types: {
    feat: { title: '🚀 Features' },
    fix: { title: '🐛 Bug Fixes' },
    perf: { title: '⚡ Performance' },
    refactor: { title: '♻️ Refactors' },
    docs: { title: '📖 Documentation' },
    test: { title: '✅ Tests' },
    chore: { title: '🏠 Chores' },
    ci: { title: '🔧 CI' },
  },
  // GitHub configuration
  repo: 'pmcp/nuxt-crouton',
  from: '', // Auto-detect from last tag
  to: 'HEAD',
}
