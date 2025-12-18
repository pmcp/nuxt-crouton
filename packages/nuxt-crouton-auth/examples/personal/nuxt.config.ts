// Personal Workspace Example
// One organization per user - ideal for personal productivity apps
export default defineNuxtConfig({
  extends: ['@crouton/auth'],

  croutonAuth: {
    mode: 'personal',

    // App name (used in personal workspace naming)
    appName: 'My Notes App',

    // Authentication methods
    methods: {
      password: true,
      oauth: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        }
      },
      magicLink: {
        enabled: true,
        expiresIn: 600 // 10 minutes
      },
      passkeys: true,
      twoFactor: false // Optional for personal apps
    },

    // Team configuration (personal mode auto-creates one org per user)
    teams: {
      allowCreate: false,
      requireInvite: false
    },

    // Personal billing (user-based, not organization-based)
    billing: {
      enabled: true,
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
        secretKey: process.env.STRIPE_SECRET_KEY!,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
        trialDays: 14,
        plans: [
          {
            id: 'free',
            name: 'Free',
            description: 'Get started for free',
            stripePriceId: 'price_free',
            price: 0,
            interval: 'month',
            features: [
              '100 notes',
              'Basic features',
              'Mobile app'
            ]
          },
          {
            id: 'premium',
            name: 'Premium',
            description: 'Unlock all features',
            stripePriceId: 'price_premium_monthly',
            price: 9,
            interval: 'month',
            features: [
              'Unlimited notes',
              'Advanced editor',
              'Offline sync',
              'Priority support',
              'API access'
            ]
          },
          {
            id: 'premium-yearly',
            name: 'Premium (Yearly)',
            description: 'Save 20% with annual billing',
            stripePriceId: 'price_premium_yearly',
            price: 86,
            interval: 'year',
            features: [
              'Unlimited notes',
              'Advanced editor',
              'Offline sync',
              'Priority support',
              'API access',
              '2 months free'
            ]
          }
        ]
      }
    },

    // UI configuration
    ui: {
      redirects: {
        afterLogin: '/dashboard',
        afterLogout: '/',
        afterRegister: '/dashboard'
      }
    }
  },

  // NuxtHub for D1 database
  hub: {
    database: true
  }
})
