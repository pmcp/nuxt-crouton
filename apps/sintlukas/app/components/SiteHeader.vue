<script setup lang="ts">
/**
 * Sint-Lukas site header — faithful port of original UHeader style.
 * No backdrop blur, underline active states, rounded-none CTA button.
 */
const { locale } = useI18n()

const mobileMenuOpen = ref(false)
const route = useRoute()

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})

const navItems = computed(() => [
  { label: 'Start', to: `/${locale.value}`, match: (p: string) => p === `/${locale.value}` || p === `/${locale.value}/` },
  { label: 'Aanbod', to: `/${locale.value}/aanbod`, match: (p: string) => p.startsWith(`/${locale.value}/aanbod`) },
  { label: 'Academie', to: `/${locale.value}/academie`, match: (p: string) => p.startsWith(`/${locale.value}/academie`) },
  { label: 'Contact', to: `/${locale.value}/contact`, match: (p: string) => p.startsWith(`/${locale.value}/contact`) },
])

function isActive(item: { match: (p: string) => boolean }) {
  return item.match(route.path)
}
</script>

<template>
  <header class="sticky -top-0 z-40 bg-white border-b-0 pt-4 pb-4">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-end justify-between">
        <!-- Logo -->
        <NuxtLink :to="`/${locale}`" class="shrink-0 mr-4">
          <SvgLogo />
        </NuxtLink>

        <!-- Desktop navigation -->
        <nav class="hidden lg:flex items-center gap-0 grow">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="relative px-2.5 py-0 text-md font-medium transition-colors after:absolute after:bottom-0 after:inset-x-2 after:block after:h-[1px] after:mt-2"
            :class="isActive(item)
              ? 'text-gray-900 after:bg-black'
              : 'text-gray-500 hover:text-gray-900 hover:after:bg-sintlukas-500'"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <!-- Right side: CTA + language switcher -->
        <div class="flex items-center gap-2">
          <UButton
            :to="`/${locale}/inschrijven`"
            size="md"
            color="neutral"
            class="hidden sm:inline-flex rounded-none font-bold"
          >
            Inschrijven
          </UButton>

          <CroutonI18nLanguageSwitcher class="w-auto hidden sm:flex" />

          <!-- Mobile menu button -->
          <button
            class="lg:hidden rounded-none bg-sintlukas-200 hover:bg-sintlukas-500 p-3"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <UIcon
              :name="mobileMenuOpen ? 'i-heroicons-x-mark-20-solid' : 'i-heroicons-bars-3-20-solid'"
              class="size-5"
            />
          </button>
        </div>
      </div>

      <!-- Mobile navigation panel -->
      <div v-if="mobileMenuOpen" class="lg:hidden mt-4">
        <div class="flex flex-col gap-4 w-full justify-center">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="text-3xl text-center py-4"
          >
            <span class="hover:border-b">{{ item.label }}</span>
          </NuxtLink>
          <NuxtLink
            :to="`/${locale}/inschrijven`"
            class="text-3xl text-center py-4"
          >
            <span class="hover:border-b">Inschrijven</span>
          </NuxtLink>
          <div class="flex justify-center mt-2">
            <CroutonI18nLanguageSwitcher class="w-auto" />
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navButtons a {
  margin-bottom: 0 !important;
  padding: 12px !important;
}
</style>
