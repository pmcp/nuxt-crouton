import { defineEventHandler } from 'h3'
import { useAppConfig } from '#imports'

export default defineEventHandler(async (event) => {
  // Get collections from app config
  const appConfig = useAppConfig()
  const collections = appConfig.croutonCollections || {}

  // Transform to array format for easier UI consumption
  const collectionsArray = Object.entries(collections).map(([key, config]) => {
    const configObj = typeof config === 'object' ? config : {}
    return {
      key,
      ...configObj,
      name: configObj?.name || key
    }
  })

  return {
    success: true,
    data: collectionsArray,
    count: collectionsArray.length
  }
})
