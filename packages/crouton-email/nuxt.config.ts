export default defineNuxtConfig({
  // Layer metadata
  $meta: {
    name: '@crouton/email',
    version: '0.1.0',
  },

  // Auto-imports from the layer
  imports: {
    dirs: ['app/composables'],
  },

  // Components from the layer
  components: [
    { path: 'app/components', pathPrefix: false },
  ],

  // Runtime config defaults
  runtimeConfig: {
    // Server-only config (private)
    email: {
      resendApiKey: '', // RESEND_API_KEY
      from: '', // EMAIL_FROM (e.g., noreply@example.com)
      fromName: '', // EMAIL_FROM_NAME (e.g., My App)
      replyTo: '', // EMAIL_REPLY_TO (optional)
    },

    // Public config
    public: {
      crouton: {
        email: {
          // Brand customization for email templates
          brand: {
            name: 'My App',
            logoUrl: '', // Optional logo URL for email headers
            primaryColor: '#0F766E', // Teal-700
            url: '', // App URL for links in emails
          },
          // Verification settings
          verification: {
            codeLength: 6,
            codeExpiry: 10, // minutes
            resendCooldown: 60, // seconds
          },
          // Magic link settings
          magicLink: {
            expiry: 10, // minutes
            resendCooldown: 60, // seconds
          },
        },
      },
    },
  },

  // Nitro server config
  nitro: {
    imports: {
      dirs: ['server/utils'],
    },
  },

  // Compatibility
  compatibilityDate: '2024-11-01',
})
