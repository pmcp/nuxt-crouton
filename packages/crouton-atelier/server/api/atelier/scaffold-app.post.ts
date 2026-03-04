interface AtelierScaffoldRequest {
  appName: string
  packages: string[]
  schemas: Record<string, string>
  seedData?: Record<string, Array<Record<string, unknown>>>
  packageCollections?: Array<{ name: string, layerName: string }>
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody<AtelierScaffoldRequest>(event)

  if (!body.appName || !/^[a-z][a-z0-9-]*$/.test(body.appName)) {
    throw createError({
      status: 400,
      statusText: 'Invalid app name. Use lowercase letters, numbers, and hyphens.'
    })
  }

  return executeScaffoldPipeline({
    appName: body.appName,
    packages: body.packages,
    schemas: body.schemas,
    seedData: body.seedData,
    packageCollections: body.packageCollections,
  })
})
