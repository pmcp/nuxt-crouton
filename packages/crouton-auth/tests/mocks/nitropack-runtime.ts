// Mock for nitropack/runtime to avoid virtual module resolution errors in tests
export const useNitroApp = () => ({
  hooks: {
    hook: () => {},
    callHook: async () => {}
  }
})
