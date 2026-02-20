export default defineMcpResource({
  uri: 'crouton://collections',
  description: 'Complete registry of all Crouton collections with their fields, API paths, default values, and configuration.',
  async handler(uri: URL) {
    const collections = getMcpCollections()

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(collections.map(mapCollectionToMcpFormat), null, 2)
      }]
    }
  }
})
