<script setup lang="ts">
/**
 * Public Page Redirect Route
 *
 * Redirects URLs without locale to the default locale.
 * /acme/about-us → /acme/en/about-us
 * /acme/ → /acme/en/
 *
 * In single-team mode, this route matches /nl/ (team=nl, slug=[]).
 * Detects the locale-as-team case and redirects to /nl/ via [locale]/[...slug].
 *
 * The actual page rendering happens in [team]/[locale]/[...slug].vue
 */
definePageMeta({
  validate: async (route) => {
    const reservedPrefixes = ['auth', 'api', 'admin', 'dashboard', '_nuxt', '__nuxt']
    const teamParam = route.params.team as string
    if (reservedPrefixes.includes(teamParam) || teamParam.includes('.')) {
      return false
    }

    // Single-team mode: team param is actually a locale code (e.g., /nl/ → team=nl).
    // Reject so Vue Router falls through to the /:locale/:slug* route.
    const config = useRuntimeConfig()
    const singleTeamSlug = (config.public?.croutonPages as any)?.singleTeam?.slug
    if (singleTeamSlug && teamParam !== singleTeamSlug && /^[a-z]{2,3}$/.test(teamParam)) {
      return false
    }

    // Verify team actually exists to avoid catching routes meant for other pages
    try {
      const { valid } = await $fetch<{ valid: boolean }>(`/api/crouton-pages/validate-team/${teamParam}`)
      return valid
    } catch {
      return false
    }
  }
})

const route = useRoute()
const { teamId } = useTeamContext()

// Safely get locale - may fail during unexpected SSR contexts (e.g., refreshNuxtData triggers)
let locale = ref('en')
try {
  const i18n = useI18n()
  locale = i18n.locale
} catch {
  if (import.meta.dev) {
    console.warn('[crouton-pages] useI18n() failed in redirect route, using fallback locale')
  }
}

// Get team and slug from route params
const team = teamId.value ?? ''
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
