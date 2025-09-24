// Plugin to load user's crouton collections registry dynamically
export default defineNuxtPlugin(async () => {
  try {
    // Try to import user's registry from app/crouton-collections.ts
    const userRegistry = await import('~/app/crouton-collections').catch(() => null)

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
    console.debug('Crouton registry not found at app/crouton-collections.ts - run the generator to create collections')
  }

  // Provide empty registry if none exists
  return {
    provide: {
      croutonRegistry: {}
    }
  }
})