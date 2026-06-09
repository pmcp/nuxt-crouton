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

// Resolve which locale to normalize a no-locale URL to. Public pages use
// URL-driven locale (/[team]/[locale]/[slug] — a deliberate design choice), so a
// bare /team URL is canonicalised to the app's configured default locale, NOT a
// hardcoded 'en' (see commit "base/required locale follows defaultLocale").
//
// Prefer the live i18n locale when available; only when i18n is genuinely
// unavailable (rare SSR contexts — the reason this is guarded) do we fall back
// to config. croutonI18n.supportedLocales is driven by crouton.config.js, so a
// single-locale app resolves to that locale (e.g. 'nl') rather than 'en'.
const runtimeConfig = useRuntimeConfig()
const pagesConfig = runtimeConfig.public?.croutonPages as { defaultLocale?: string } | undefined
const i18nCfg = runtimeConfig.croutonI18n as { supportedLocales?: string[]; defaultLocale?: string } | undefined

let localeCode = ''
try {
  localeCode = useI18n().locale.value
} catch {
  if (import.meta.dev) {
    console.warn('[crouton-pages] useI18n() unavailable in redirect route, using configured default locale')
  }
}
if (!localeCode) {
  // Resolve the app's configured default — never hardcode 'en' for a non-en app.
  // Order: single supported locale → croutonI18n.defaultLocale (from crouton.config.js)
  // → croutonPages.defaultLocale → 'en' as a last resort.
  localeCode = (i18nCfg?.supportedLocales?.length === 1 ? i18nCfg.supportedLocales[0]! : '')
    || i18nCfg?.defaultLocale
    || pagesConfig?.defaultLocale
    || 'en'
}

// Get team slug from route params (not teamId — context may not be resolved during client-side nav)
const team = route.params.team as string
const slugParts = route.params.slug
const slug = !slugParts || (Array.isArray(slugParts) && slugParts.length === 0)
  ? ''
  : Array.isArray(slugParts) ? slugParts.join('/') : slugParts

// Redirect to locale-prefixed URL
const targetUrl = slug ? `/${team}/${localeCode}/${slug}` : `/${team}/${localeCode}/`

await navigateTo(targetUrl, { redirectCode: 301 })
</script>

<template>
  <div />
</template>
