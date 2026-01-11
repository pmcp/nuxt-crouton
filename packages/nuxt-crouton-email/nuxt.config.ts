import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'

export default defineNuxtConfig({
  // Layer metadata
  $meta: {
    name: '@crouton/email',
    version: '0.1.0'
  },

  // Components from the layer
  components: [
    { path: 'app/components', pathPrefix: false }
  ],

  // Auto-imports from the layer
  imports: {
    dirs: ['app/composables']
  },

  // Runtime config defaults
  runtimeConfig: {
    // Server-only config (private)
    email: {
      resendApiKey: '', // RESEND_API_KEY
      from: '', // EMAIL_FROM (e.g., noreply@example.com)
      fromName: '', // EMAIL_FROM_NAME (e.g., My App)
      replyTo: '' // EMAIL_REPLY_TO (optional)
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
            url: '' // App URL for links in emails
          },
          // Verification settings
          verification: {
            codeLength: 6,
            codeExpiry: 10, // minutes
            resendCooldown: 60 // seconds
          },
          // Magic link settings
          magicLink: {
            expiry: 10, // minutes
            resendCooldown: 60 // seconds
          }
        }
      }
    }
  },

  // Compatibility
  compatibilityDate: '2024-11-01',

  // Alias for consuming packages (e.g., crouton-bookings)
  alias: {
    '#crouton-email': fileURLToPath(new URL('./', import.meta.url))
  },

  // Nitro server config
  nitro: {
    imports: {
      dirs: ['server/utils']
    },
    // Required for vue-email: enables Vue SFC compilation in server context
    // See: https://vuemail.net/getting-started/nuxt-nitro
    rollupConfig: {
      plugins: [vue()]
    }
  }
})
