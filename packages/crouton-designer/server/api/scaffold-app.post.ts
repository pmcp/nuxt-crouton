interface ScaffoldRequest {
  appName: string
  config: {
    name: string
    packages?: string[]
    languages?: string[]
    defaultLocale?: string
  }
  schemas: Record<string, string>
  seedData?: Record<string, Array<Record<string, any>>>
  packageCollections?: Array<{ name: string; layerName: string }>
  publishableCollections?: string[]
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody<ScaffoldRequest>(event)

  // Validate appName
  if (!body.appName || !/^[a-z][a-z0-9-]*$/.test(body.appName)) {
    throw createError({
      status: 400,
      statusText: 'Invalid app name. Use lowercase letters, numbers, and hyphens.'
    })
  }

  if (!body.schemas || Object.keys(body.schemas).length === 0) {
    throw createError({
      status: 400,
      statusText: 'At least one schema is required.'
    })
  }

  // Clean seed data (strip _id from designer entries)
  let seedData = body.seedData
  if (seedData) {
    const cleaned: Record<string, Array<Record<string, unknown>>> = {}
    for (const [name, entries] of Object.entries(seedData)) {
      if (entries && entries.length > 0) {
        cleaned[name] = entries.map(({ _id, ...rest }) => rest)
      }
    }
    seedData = cleaned
  }

  return executeScaffoldPipeline({
    appName: body.appName,
    packages: body.config.packages || [],
    schemas: body.schemas,
    seedData,
    packageCollections: body.packageCollections,
    configExtra: {
      publishableCollections: body.publishableCollections,
      locales: body.config.languages,
      defaultLocale: body.config.defaultLocale,
    },
  })
})
