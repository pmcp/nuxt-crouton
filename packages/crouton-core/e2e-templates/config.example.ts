/**
 * E2E Test Configuration
 *
 * Copy this to e2e/config.ts in your app and customize.
 */
export const e2eConfig = {
  // Test user credentials
  testUser: {
    name: 'E2E Test User',
    email: 'e2e-test@example.com',
    password: 'TestPassword123!'
  },

  // Multi-tenant mode (set to false for single-tenant apps)
  multiTenant: true,

  // Base URL (defaults to http://localhost:3000)
  baseUrl: 'http://localhost:3000',

  // Collections to test
  // Leave empty to skip collection tests, or specify which to include
  collections: {
    // Example: test projects with custom field mapping
    // projects: {
    //   nameField: 'title',
    //   requiredFields: { status: 'active' }
    // }
  }
}