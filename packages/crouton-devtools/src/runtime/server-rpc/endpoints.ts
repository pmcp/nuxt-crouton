import { defineEventHandler } from 'h3'
import { useAppConfig } from '#imports'

export default defineEventHandler(async (_event) => {
  // Get collections from app config
  const appConfig = useAppConfig()
  const collections = appConfig.croutonCollections || {}

  const endpoints = []

  // Generate endpoint definitions for each collection
  for (const [key, config] of Object.entries(collections)) {
    const configObj = typeof config === 'object' ? config : {}
    const name = configObj?.name || key
    const basePath = configObj?.apiPath || `/api/crouton-collection/${name}`

    // List/Search endpoint
    endpoints.push({
      collection: name,
      operation: 'list',
      method: 'GET',
      path: `${basePath}/search`,
      params: [
        { name: 'page', type: 'number', description: 'Page number (default: 1)' },
        { name: 'limit', type: 'number', description: 'Items per page (default: 10)' },
        { name: 'filter', type: 'json', description: 'Filter object (e.g., {"active": true})' },
        { name: 'sort', type: 'string', description: 'Sort field (e.g., "createdAt")' }
      ],
      requiresBody: false
    })

    // Get single item endpoint
    endpoints.push({
      collection: name,
      operation: 'get',
      method: 'GET',
      path: `${basePath}/:id`,
      params: [
        { name: 'id', type: 'string', description: 'Item ID', required: true, pathParam: true }
      ],
      requiresBody: false
    })

    // Create endpoint
    endpoints.push({
      collection: name,
      operation: 'create',
      method: 'POST',
      path: basePath,
      params: [],
      requiresBody: true,
      bodyDescription: 'Item data to create'
    })

    // Update endpoint
    endpoints.push({
      collection: name,
      operation: 'update',
      method: 'PATCH',
      path: `${basePath}/:id`,
      params: [
        { name: 'id', type: 'string', description: 'Item ID', required: true, pathParam: true }
      ],
      requiresBody: true,
      bodyDescription: 'Fields to update'
    })

    // Delete endpoint
    endpoints.push({
      collection: name,
      operation: 'delete',
      method: 'DELETE',
      path: `${basePath}/:id`,
      params: [
        { name: 'id', type: 'string', description: 'Item ID', required: true, pathParam: true }
      ],
      requiresBody: false
    })
  }

  return {
    success: true,
    data: endpoints,
    count: endpoints.length
  }
})
