<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * Pages Navigation Component
 *
 * Displays navigation links from published pages using UNavigationMenu.
 * Floating pill-style nav inspired by Nuxt UI portfolio template.
 * Includes language switcher and dark/light mode toggle.
 *
 * @example
 * <CroutonPagesNav />
 */

const { navigation, isLoading, isActive } = useNavigation()
const colorMode = useColorMode()

// Transform navigation data to UNavigationMenu format
const menuItems = computed<NavigationMenuItem[]>(() => {
  if (!navigation.value) return []

  return navigation.value.map((item: any) => ({
    label: item.title || item.slug,
    icon: item.icon,
    to: item.path,
    active: isActive(item),
    children: item.children?.length
      ? item.children.map((child: any) => ({
          label: child.title || child.slug,
          icon: child.icon,
          to: child.path
        }))
      : undefined
  }))
})

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50">
    <template v-if="isLoading">
      <div class="flex items-center gap-2 bg-muted/80 backdrop-blur-sm rounded-full px-4 py-2 border border-default shadow-lg">
        <USkeleton class="h-6 w-16 rounded-full" />
        <USkeleton class="h-6 w-16 rounded-full" />
        <USkeleton class="h-6 w-16 rounded-full" />
      </div>
    </template>
    <div
      v-else
      class="flex items-center gap-1 bg-muted/80 backdrop-blur-sm rounded-full px-2 sm:px-4 border border-default shadow-lg shadow-neutral-950/5"
    >
      <UNavigationMenu
        :items="menuItems"
        variant="link"
        color="neutral"
        :ui="{
          link: 'px-2 py-1',
          linkLeadingIcon: 'hidden'
        }"
      />

      <USeparator orientation="vertical" class="h-5 mx-1" />

      <!-- Language Switcher -->
      <CroutonI18nLanguageSwitcher class="w-auto" />

      <!-- Dark/Light Mode Toggle -->
      <ClientOnly>
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="toggleColorMode"
        />
      </ClientOnly>
    </div>
  </div>
</template>
