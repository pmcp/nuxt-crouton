export default defineMcpTool({
  name: 'list_app_collections',
  description: 'List all registered Crouton collections in the running app with their metadata, fields, and API paths. Use this first to discover what collections are available.',
  inputSchema: {},
  async handler() {
    const collections = getMcpCollections()
    return jsonResult(collections.map(mapCollectionToMcpFormat))
  }
})
