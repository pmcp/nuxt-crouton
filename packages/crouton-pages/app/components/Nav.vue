<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useMediaQuery } from '@vueuse/core'

/**
 * Pages Navigation Component
 *
 * Displays navigation links from published pages using UNavigationMenu.
 * Floating pill-style nav inspired by Nuxt UI portfolio template.
 * Includes language switcher and dark/light mode toggle.
 *
 * Responsive behavior:
 * - Desktop (md+): Full horizontal pill nav
 * - Mobile: Condensed pill with hamburger that opens a Drawer
 *
 * @example
 * <CroutonPagesNav />
 */

const { navigation, isLoading, isActive } = useNavigation()
const colorMode = useColorMode()

// Responsive breakpoint
const isDesktop = useMediaQuery('(min-width: 768px)')

// Mobile drawer state
const drawerOpen = ref(false)

// Close drawer when navigating (only for leaf items, not accordion expand)
const closeDrawer = () => {
  drawerOpen.value = false
}

// Transform navigation data to UNavigationMenu format
const menuItems = computed<NavigationMenuItem[]>(() => {
  if (!navigation.value) return []

  return navigation.value.map((item: any) => ({
    label: item.title || item.slug,
    icon: item.icon,
    to: item.path,
    active: isActive(item),
    // Only close drawer on leaf items (no children)
    onSelect: item.children?.length ? undefined : closeDrawer,
    children: item.children?.length
      ? item.children.map((child: any) => ({
          label: child.title || child.slug,
          icon: child.icon,
          to: child.path,
          // Always close drawer on child item click
          onSelect: closeDrawer
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
    <!-- Loading state -->
    <template v-if="isLoading">
      <div class="flex items-center gap-2 bg-muted/80 backdrop-blur-sm rounded-full px-4 py-2 border border-default shadow-lg">
        <USkeleton class="h-6 w-16 rounded-full" />
        <USkeleton class="h-6 w-16 rounded-full" />
        <USkeleton class="h-6 w-16 rounded-full" />
      </div>
    </template>

    <!-- Desktop: Full horizontal pill nav -->
    <div
      v-else-if="isDesktop"
      class="flex items-center gap-1 bg-muted/80 backdrop-blur-sm rounded-full px-4 border border-default shadow-lg shadow-neutral-950/5"
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

    <!-- Mobile: Condensed pill with hamburger + Drawer -->
    <div
      v-else
      class="flex items-center gap-1 bg-muted/80 backdrop-blur-sm rounded-full px-2 py-1 border border-default shadow-lg shadow-neutral-950/5"
    >
      <!-- Hamburger menu button that opens drawer -->
      <UDrawer v-model:open="drawerOpen" direction="left" :ui="{ content: 'w-72' }">
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Open navigation menu"
        />

        <template #header>
          <span class="text-lg font-semibold">Menu</span>
        </template>

        <template #body>
          <UNavigationMenu
            orientation="vertical"
            :items="menuItems"
            variant="link"
            color="neutral"
            class="w-full"
          />
        </template>

        <template #footer>
          <div class="flex items-center justify-between px-2">
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
        </template>
      </UDrawer>

      <USeparator orientation="vertical" class="h-5" />

      <!-- Language Switcher (compact) -->
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
