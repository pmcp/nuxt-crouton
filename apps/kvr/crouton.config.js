export default {
  collections: [
    { name: 'settings', fieldsFile: './schemas/settings.json' },
    { name: 'werkvergunningen', fieldsFile: './schemas/werkvergunningen.json' }
  ],

  targets: [
    { layer: 'kvr', collections: ['settings', 'werkvergunningen'] }
  ],

  dialect: 'sqlite',

  flags: {
    noTranslations: true
  }
}
