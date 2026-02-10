export default {
  collections: [
    { name: 'flows', fieldsFile: './schemas/flow.json' },
    { name: 'inputs', fieldsFile: './schemas/input.json' },
    { name: 'outputs', fieldsFile: './schemas/output.json' },
    { name: 'discussions', fieldsFile: './schemas/discussion.json' },
    { name: 'tasks', fieldsFile: './schemas/task.json' },
    { name: 'jobs', fieldsFile: './schemas/job.json' },
    { name: 'users', fieldsFile: './schemas/user.json' },
    { name: 'messages', fieldsFile: './schemas/message.json' }
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
    }
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
