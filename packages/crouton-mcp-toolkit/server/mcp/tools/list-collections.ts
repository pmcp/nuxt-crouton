export default defineMcpTool({
  name: 'list_app_collections',
  description: 'List all registered Crouton collections in the running app with their metadata, fields, and API paths. Use this first to discover what collections are available.',
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
