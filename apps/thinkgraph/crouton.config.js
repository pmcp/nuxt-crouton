export default {
  collections: [
    // PM collections (new)
    {
      name: 'projects',
      fieldsFile: './schemas/project.json'
    },
    {
      name: 'workItems',
      fieldsFile: './schemas/work-item.json',
      hierarchy: {
        enabled: true,
        parentField: 'parentId'
      }
    },
    // Legacy collections (kept for migration)
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
      collections: ['projects', 'workItems', 'canvases', 'nodes', 'injectRequests']
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
