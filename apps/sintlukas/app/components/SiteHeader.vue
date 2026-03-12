<script setup lang="ts">
/**
 * Sint-Lukas site header with explicit navigation.
 * Fixed top, white background, logo + nav links + CTA button.
 */
const { locale } = useI18n()

const mobileMenuOpen = ref(false)
const route = useRoute()

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})

const navItems = computed(() => [
  { label: 'Home', to: `/${locale.value}`, match: (p: string) => p === `/${locale.value}` || p === `/${locale.value}/` },
  { label: 'Aanbod', to: `/${locale.value}/aanbod`, match: (p: string) => p.startsWith(`/${locale.value}/aanbod`) },
  { label: 'Academie', to: `/${locale.value}/academie`, match: (p: string) => p.startsWith(`/${locale.value}/academie`) },
  { label: 'Contact', to: `/${locale.value}/contact`, match: (p: string) => p.startsWith(`/${locale.value}/contact`) },
])

const registrationLink = computed(() => ({
  label: 'Inschrijven',
  to: `/${locale.value}/inschrijven`
}))

function isActive(item: { match: (p: string) => boolean }) {
  return item.match(route.path)
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink :to="`/${locale}`" class="shrink-0">
          <img src="/logo.svg" alt="Sint-Lukas Academie" class="h-10" />
        </NuxtLink>

        <!-- Desktop navigation -->
        <nav class="hidden md:flex items-center gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            :class="isActive(item)
              ? 'text-sintlukas-700 bg-sintlukas-50'
              : 'text-neutral-600 hover:text-sintlukas-700 hover:bg-sintlukas-50'"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <!-- Right side -->
        <div class="flex items-center gap-2">
          <!-- CTA button -->
          <UButton
            :to="registrationLink.to"
            size="sm"
            class="hidden sm:inline-flex"
          >
            {{ registrationLink.label }}
          </UButton>

          <!-- Language switcher -->
          <CroutonI18nLanguageSwitcher class="w-auto hidden sm:flex" />

          <!-- Mobile menu button -->
          <UButton
            :icon="mobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
            variant="ghost"
            color="neutral"
            size="sm"
            class="md:hidden"
            @click="mobileMenuOpen = !mobileMenuOpen"
          />
        </div>
      </div>

      <!-- Mobile navigation -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="mobileMenuOpen" class="md:hidden pb-4 border-t border-neutral-100 pt-3">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="block px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            :class="isActive(item)
              ? 'text-sintlukas-700 bg-sintlukas-50'
              : 'text-neutral-600 hover:text-sintlukas-700 hover:bg-sintlukas-50'"
          >
            {{ item.label }}
          </NuxtLink>
          <NuxtLink
            :to="registrationLink.to"
            class="block px-3 py-2 text-sm font-medium text-sintlukas-600 rounded-lg hover:bg-sintlukas-50 transition-colors"
          >
            {{ registrationLink.label }}
          </NuxtLink>
          <div class="mt-3 px-3">
            <CroutonI18nLanguageSwitcher class="w-auto" />
          </div>
        </div>
      </Transition>
    </div>
  </header>
</template>
