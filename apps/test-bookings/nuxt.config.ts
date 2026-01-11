// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth',
    '@friendlyinternet/nuxt-crouton-i18n',
    '@friendlyinternet/nuxt-crouton-maps',
    '@friendlyinternet/crouton-bookings',
    './layers/bookings'
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