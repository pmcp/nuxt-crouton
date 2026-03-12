export default {
  collections: [
    {
      name: 'decisions',
      fieldsFile: './schemas/decision.json'
    },
    {
      name: 'chatConversations',
      fieldsFile: './schemas/chat-conversation.json'
    }
  ],

  targets: [
    {
      layer: 'thinkgraph',
      collections: ['decisions', 'chatConversations']
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
