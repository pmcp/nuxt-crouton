// Plugin to load user's crouton collections registry dynamically
export default defineNuxtPlugin(async () => {
  try {
    // Try to import user's registry from crouton.config.ts at root level
    const userRegistry = await import('~/crouton.config').catch(() => null)

    if (userRegistry?.croutonCollections) {
      // Make the registry available globally
      return {
        provide: {
          croutonRegistry: userRegistry.croutonCollections
        }
      }
    }
  } catch (error) {
    // Registry doesn't exist yet
    console.debug('Crouton registry not found at crouton.config.ts - run the generator to create collections')
  }

  // Provide empty registry if none exists
  return {
    provide: {
      croutonRegistry: {}
    }
  }
})