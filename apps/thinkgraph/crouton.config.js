export default {
  collections: [
    {
      name: 'decisions',
      fieldsFile: './schemas/decision.json'
    }
  ],

  targets: [
    {
      layer: 'thinkgraph',
      collections: ['decisions']
    }
  ],

  dialect: 'sqlite',

  flags: {
    useTeamUtility: true,
    useMetadata: false,
    autoRelations: true,
    noTranslations: true,
    noDb: false
  }
}
