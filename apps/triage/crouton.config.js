export default {
  collections: [
    { name: 'flows', fieldsFile: './schemas/flow.json' },
    { name: 'inputs', fieldsFile: './schemas/input.json' },
    { name: 'outputs', fieldsFile: './schemas/output.json' },
    { name: 'discussions', fieldsFile: './schemas/discussion.json' },
    { name: 'tasks', fieldsFile: './schemas/task.json' },
    { name: 'jobs', fieldsFile: './schemas/job.json' },
    { name: 'users', fieldsFile: './schemas/user.json' },
    { name: 'messages', fieldsFile: './schemas/message.json' },
    {
      name: 'pages',
      fieldsFile: './schemas/pages.json',
      formComponent: 'CroutonPagesForm',
      sortable: true,
      hierarchy: {
        enabled: true,
        parentField: 'parentId',
        orderField: 'order',
        pathField: 'path',
        depthField: 'depth'
      }
    }
  ],

  targets: [
    {
      layer: 'triage',
      collections: [
        'flows',
        'inputs',
        'outputs',
        'discussions',
        'tasks',
        'jobs',
        'users',
        'messages'
      ]
    },
    { layer: 'pages', collections: ['pages'] }
  ],

  dialect: 'sqlite',

  flags: {
    useTeamUtility: true,
    useMetadata: true,
    autoRelations: true,
    noTranslations: true,
    noDb: false
  }
}
