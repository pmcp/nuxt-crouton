// Single-Tenant Team App Example
// One organization with multiple users - ideal for company/team applications
export default defineNuxtConfig({
  extends: ['@crouton/auth'],

  // NuxtHub for D1 database
  hub: {
    database: true
  },

  croutonAuth: {
    mode: 'single-tenant',

    // App name (used as default organization name)
    appName: 'Acme Corporation',
    defaultTeamId: 'acme-corp',

    // Authentication methods
    methods: {
      password: {
        enabled: true,
        minLength: 12,
        requireUppercase: true,
        requireNumbers: true
      },
      // Disable OAuth for internal team app
      oauth: undefined,
      // Enable passkeys for secure access
      passkeys: true,
      // Enable 2FA for security
      twoFactor: {
        enabled: true,
        backupCodesCount: 10,
        trustedDevices: true,
        trustedDeviceExpiry: 30 // days
      }
    },

    // Team configuration (users cannot create teams)
    teams: {
      allowCreate: false,
      requireInvite: true,
      defaultRole: 'member',
      memberLimit: 500
    },

    // Billing disabled for internal team app
    billing: {
      enabled: false
    },

    // UI configuration
    ui: {
      redirects: {
        afterLogin: '/dashboard',
        afterLogout: '/',
        afterRegister: '/dashboard'
      }
    }
  }
})
