export default {
  collections: [
    {
      name: 'canvases',
      fieldsFile: './schemas/canvas.json'
    },
    {
      name: 'nodes',
      fieldsFile: './schemas/node.json',
      hierarchy: {
        enabled: true,
        parentField: 'parentId'
      }
    },
    {
      name: 'injectRequests',
      fieldsFile: './schemas/inject-request.json'
    }
  ],

  targets: [
    {
      layer: 'thinkgraph',
      collections: ['canvases', 'nodes', 'injectRequests']
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
