export default defineMcpTool({
  description: 'List all registered Crouton collections with their metadata, fields, and API paths. Use this first to discover what collections are available.',
  inputSchema: {},
  async handler() {
    const collections = getMcpCollections()

    const result = collections.map(c => ({
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

    return jsonResult(result)
  }
})
