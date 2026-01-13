// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // nuxt-crouton now auto-includes auth, admin, and i18n
  extends: [
    '@friendlyinternet/nuxt-crouton',          // Core (includes auth, admin, i18n)
    '@friendlyinternet/nuxt-crouton-email',    // Optional: Email functionality
    '@friendlyinternet/nuxt-crouton-maps',     // Optional: Maps functionality
    '@friendlyinternet/crouton-bookings',      // Bookings app (auto-discovered)
    './layers/bookings'                        // Local customizations
  ],
  modules: ['@nuxthub/core', '@nuxt/ui'],
  hub: { db: 'sqlite' },

  // Enable booking email functionality
  runtimeConfig: {
    croutonBookings: {
      email: { enabled: true }
    },
    public: {
      croutonBookings: {
        email: { enabled: true }
      },
      mapbox: {
        accessToken: process.env.MAPBOX_TOKEN || '',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [4.3517, 50.8503], // Brussels [lng, lat]
        zoom: 12
      }
    }
  }
})