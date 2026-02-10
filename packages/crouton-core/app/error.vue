<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const is404 = computed(() => props.error?.statusCode === 404)

// Try to use i18n if available, otherwise use fallback strings
const nuxtApp = useNuxtApp()
const hasI18n = computed(() => !!nuxtApp.$i18n)

// Fallback translations for when i18n is not installed
const fallbackStrings: Record<string, Record<string, string>> = {
  errorPage: {
    error: 'Error',
    backToHome: 'Back to home',
    tryAgain: 'Try again',
    helpfulLinks: 'Here are some helpful links:'
  },
  'errorPage.404': {
    title: 'Page not found',
    description: 'The page you\'re looking for doesn\'t exist or has been moved.'
  },
  'errorPage.401': {
    title: 'Unauthorized',
    description: 'Please sign in to access this page.'
  },
  'errorPage.403': {
    title: 'Access denied',
    description: 'You don\'t have permission to access this page.'
  },
  'errorPage.500': {
    title: 'Server error',
    description: 'Something went wrong on our end. Please try again later.'
  },
  'errorPage.default': {
    title: 'Error',
    description: 'An unexpected error occurred.'
  },
  navigation: {
    home: 'Home',
    dashboard: 'Dashboard'
  }
}

// Translation helper that works with or without i18n
const t = (key: string): string => {
  if (hasI18n.value) {
    const i18n = nuxtApp.$i18n as { t: (key: string) => string }
    const translated = i18n.t(key)
    // If i18n returns the key, it means translation is missing
    if (translated !== key) return translated
  }

  // Fallback: parse key and get from fallback strings
  const parts = key.split('.')
  if (parts.length >= 2) {
    // Try nested lookup (e.g., 'errorPage.404.title')
    const group = parts.slice(0, -1).join('.')
    const field = parts[parts.length - 1]
    if (group && field && fallbackStrings[group]?.[field]) {
      return fallbackStrings[group][field]
    }
    // Try simple lookup (e.g., 'navigation.home')
    const simpleGroup = parts[0]
    const simpleField = parts.slice(1).join('.')
    if (simpleGroup && simpleField && fallbackStrings[simpleGroup]?.[simpleField]) {
      return fallbackStrings[simpleGroup][simpleField]
    }
  }

  return key
}

// Icon mapping for different error codes
const errorIcons: Record<number, string> = {
  404: 'i-lucide-file-question',
  401: 'i-lucide-lock',
  403: 'i-lucide-shield-x',
  500: 'i-lucide-server-crash'
}

// Get error configuration based on status code
const errorConfig = computed(() => {
  const code = props.error?.statusCode || 500
  const codeKey = [404, 401, 403, 500].includes(code) ? code : 'default'

  return {
    statusMessage: t(`errorPage.${codeKey}.title`),
    message: t(`errorPage.${codeKey}.description`),
    icon: errorIcons[code] || 'i-lucide-alert-triangle'
  }
})

useSeoMeta({
  title: () => is404.value ? t('errorPage.404.title') : `${t('errorPage.error')} ${props.error?.statusCode || 500}`,
  description: () => errorConfig.value.message
})
</script>

<template>
  <div class="min-h-screen bg-default flex flex-col">
    <UMain>
      <UContainer class="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <!-- Animated icon -->
        <div class="relative mb-8">
          <div class="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div class="relative bg-elevated rounded-full p-6 ring-1 ring-default">
            <UIcon
              :name="errorConfig.icon"
              class="w-16 h-16 text-primary"
            />
          </div>
        </div>

        <!-- Status code -->
        <p class="text-sm font-semibold text-primary tracking-wide uppercase mb-2">
          {{ t('errorPage.error') }} {{ error?.statusCode || 500 }}
        </p>

        <!-- Status message -->
        <h1 class="text-4xl sm:text-5xl font-bold text-highlighted mb-4">
          {{ errorConfig.statusMessage }}
        </h1>

        <!-- Description -->
        <p class="text-lg text-muted max-w-md mb-8">
          {{ errorConfig.message }}
        </p>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row items-center gap-4">
          <UButton
            size="lg"
            color="primary"
            to="/"
            icon="i-lucide-home"
            @click="clearError({ redirect: '/' })"
          >
            {{ t('errorPage.backToHome') }}
          </UButton>

          <UButton
            size="lg"
            color="neutral"
            variant="outline"
            icon="i-lucide-rotate-ccw"
            @click="clearError()"
          >
            {{ t('errorPage.tryAgain') }}
          </UButton>
        </div>

        <!-- Additional help for 404 -->
        <div
          v-if="is404"
          class="mt-12 pt-8 border-t border-default w-full max-w-md"
        >
          <p class="text-sm text-muted mb-4">
            {{ t('errorPage.helpfulLinks') }}
          </p>
          <div class="flex flex-wrap justify-center gap-4">
            <UButton
              variant="link"
              color="neutral"
              to="/"
              size="sm"
            >
              {{ t('navigation.home') }}
            </UButton>
          </div>
        </div>
      </UContainer>
    </UMain>
  </div>
</template>
