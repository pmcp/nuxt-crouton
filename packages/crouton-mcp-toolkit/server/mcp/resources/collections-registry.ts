export default defineMcpResource({
  uri: 'crouton://collections',
  description: 'Complete registry of all Crouton collections with their fields, API paths, default values, and configuration.',
  async handler(uri: URL) {
    const collections = getMcpCollections()

    const registry = collections.map(c => ({
      name: c.name,
      key: (c as any).key,
      layer: c.layer,
      apiPath: c.apiPath,
      fields: c.columns?.map(col => ({
        key: col.accessorKey,
        label: col.header
      })) || [],
      defaultValues: c.defaultValues || {},
      sortable: c.sortable?.enabled || false
    }))

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(registry, null, 2)
      }]
    }
  }
})
