// Multi-Tenant SaaS Example
// Users can create and join multiple organizations
export default defineNuxtConfig({
  extends: ['@crouton/auth'],

  croutonAuth: {
    mode: 'multi-tenant',

    // Authentication methods
    methods: {
      password: {
        enabled: true,
        minLength: 8
      },
      oauth: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!
        },
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        }
      },
      passkeys: true,
      twoFactor: {
        enabled: true,
        backupCodesCount: 10
      }
    },

    // Team configuration
    teams: {
      allowCreate: true,
      limit: 5, // Max 5 teams per user
      memberLimit: 50,
      requireInvite: true,
      defaultRole: 'member'
    },

    // Stripe billing
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
            description: 'For individuals getting started',
            stripePriceId: 'price_free',
            price: 0,
            interval: 'month',
            features: [
              '3 projects',
              '1 team member',
              'Basic support'
            ]
          },
          {
            id: 'pro',
            name: 'Pro',
            description: 'For growing teams',
            stripePriceId: 'price_pro_monthly',
            price: 29,
            interval: 'month',
            features: [
              'Unlimited projects',
              '10 team members',
              'Priority support',
              'Advanced analytics'
            ]
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'For large organizations',
            stripePriceId: 'price_enterprise_monthly',
            price: 99,
            interval: 'month',
            features: [
              'Unlimited everything',
              'Unlimited team members',
              'SSO & SAML',
              'Dedicated support',
              'Custom integrations'
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
