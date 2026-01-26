<script setup lang="ts">
/**
 * Public Page Redirect Route
 *
 * Redirects URLs without locale to the default locale.
 * /acme/about-us → /acme/en/about-us
 * /acme/ → /acme/en/
 *
 * The actual page rendering happens in [team]/[locale]/[...slug].vue
 */
const route = useRoute()

// Safely get locale - may fail during unexpected SSR contexts (e.g., refreshNuxtData triggers)
let locale = ref('en')
try {
  const i18n = useI18n()
  locale = i18n.locale
} catch (error) {
  if (import.meta.dev) {
    console.warn('[crouton-pages] useI18n() failed in redirect route, using fallback locale')
  }
}

// Reserved prefixes that should NOT be treated as team slugs
const reservedPrefixes = ['auth', 'api', 'admin', 'dashboard', '_nuxt', '__nuxt']
const teamParam = route.params.team as string

if (reservedPrefixes.includes(teamParam)) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page Not Found'
  })
}

// Get team and slug from route params
const team = route.params.team as string
const slugParts = route.params.slug
const slug = !slugParts || (Array.isArray(slugParts) && slugParts.length === 0)
  ? ''
  : Array.isArray(slugParts) ? slugParts.join('/') : slugParts

// Redirect to locale-prefixed URL
const targetUrl = slug ? `/${team}/${locale.value}/${slug}` : `/${team}/${locale.value}/`

await navigateTo(targetUrl, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
