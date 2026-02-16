import { z } from 'zod'

export default defineMcpResource({
  uri: 'crouton://schema/{collection}',
  description: 'Detailed field information for a specific Crouton collection including types, defaults, and column definitions.',
  async handler(uri: URL) {
    // Extract collection name from URI path
    const collectionName = uri.pathname.split('/').pop()

    if (!collectionName) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Collection name required in URI path' })
        }]
      }
    }

    const col = getMcpCollectionByName(collectionName)

    if (!col) {
      const available = getMcpCollections().map(c => c.name)
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: `Collection "${collectionName}" not found`,
            availableCollections: available
          })
        }]
      }
    }

    const schema = {
      name: col.name,
      key: (col as any).key,
      layer: col.layer,
      apiPath: col.apiPath,
      fields: col.columns?.map(col => ({
        key: col.accessorKey,
        label: col.header
      })) || [],
      defaultValues: col.defaultValues || {},
      sortable: col.sortable
    }

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(schema, null, 2)
      }]
    }
  }
})
