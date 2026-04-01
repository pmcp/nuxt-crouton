export default {
  collections: [
    {
      name: 'projects',
      fieldsFile: './schemas/project.json'
    },
    {
      name: 'nodes',
      fieldsFile: './schemas/node.json',
      hierarchy: {
        enabled: true,
        parentField: 'parentId'
      }
    },
    // Legacy collections (kept for migration reference only — not actively used)
    {
      name: 'canvases',
      fieldsFile: './schemas/canvas.json'
    },
    {
      name: 'injectRequests',
      fieldsFile: './schemas/inject-request.json'
    }
  ],

  targets: [
    {
      layer: 'thinkgraph',
      collections: ['projects', 'nodes', 'canvases', 'injectRequests']
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
