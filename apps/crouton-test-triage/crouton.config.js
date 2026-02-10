export default {
  collections: [
    { name: 'flows', fieldsFile: './schemas/flow.json' },
    { name: 'flowInputs', fieldsFile: './schemas/flow-input.json' },
    { name: 'flowOutputs', fieldsFile: './schemas/flow-output.json' },
    { name: 'discussions', fieldsFile: './schemas/discussion.json' },
    { name: 'tasks', fieldsFile: './schemas/task.json' },
    { name: 'jobs', fieldsFile: './schemas/job.json' },
    { name: 'userMappings', fieldsFile: './schemas/user-mapping.json' },
    { name: 'inboxMessages', fieldsFile: './schemas/inbox-message.json' }
  ],

  targets: [
    {
      layer: 'triage',
      collections: [
        'flows',
        'flowInputs',
        'flowOutputs',
        'discussions',
        'tasks',
        'jobs',
        'userMappings',
        'inboxMessages'
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
