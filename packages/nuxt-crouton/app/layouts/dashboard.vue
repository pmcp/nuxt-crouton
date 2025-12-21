<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// Check if ThemeSwitcher is available (from nuxt-crouton-themes)
const ThemeSwitcherComponent = resolveComponent('ThemeSwitcher')
const hasThemeSwitcher = typeof ThemeSwitcherComponent !== 'string'

// Try to use theme variant if available
const variant = computed(() => {
  try {
    // @ts-expect-error - composable may not exist
    const { variant: themeVariant } = useThemeSwitcher?.() ?? {}
    return themeVariant?.value
  } catch {
    return undefined
  }
})

// Get crouton config for navigation
const { public: { croutonConfig } } = useRuntimeConfig()
const route = useRoute()

// Build navigation from collections config
const collections = computed(() => {
  const config = croutonConfig as { collections?: Record<string, { label?: string; icon?: string }> } | undefined
  if (!config?.collections) return []

  return Object.entries(config.collections).map(([key, value]) => ({
    key,
    label: value.label || key.charAt(0).toUpperCase() + key.slice(1),
    icon: value.icon || 'i-lucide-folder'
  }))
})

// Navigation items
const navItems = computed<NavigationMenuItem[][]>(() => {
  const teamSlug = route.params.team as string

  const collectionItems: NavigationMenuItem[] = collections.value.map(col => ({
    label: col.label,
    icon: col.icon,
    to: `/dashboard/${teamSlug}/crouton/${col.key}`,
    active: route.path.includes(`/crouton/${col.key}`)
  }))

  const mainItems: NavigationMenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: `/dashboard/${teamSlug}/crouton`,
      active: route.path === `/dashboard/${teamSlug}/crouton`
    },
    ...(collectionItems.length > 0 ? [{
      label: 'Collections',
      icon: 'i-lucide-database',
      defaultOpen: true,
      children: collectionItems
    }] : collectionItems)
  ]

  const bottomItems: NavigationMenuItem[] = [
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: `/dashboard/${teamSlug}/settings`
    }
  ]

  return [mainItems, bottomItems]
})

// Page title from route meta or path
const pageTitle = computed(() => {
  const meta = route.meta as { title?: string }
  if (meta.title) return meta.title

  // Extract from path
  const segments = route.path.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  if (lastSegment === 'crouton') return 'Dashboard'
  return lastSegment?.charAt(0).toUpperCase() + lastSegment?.slice(1) || 'Dashboard'
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
      :ui="{ footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <div v-if="!collapsed" class="flex items-center gap-2">
          <UIcon name="i-lucide-croissant" class="size-5 text-primary" />
          <span class="font-semibold text-sm">Crouton</span>
        </div>
        <UIcon v-else name="i-lucide-croissant" class="size-5 text-primary mx-auto" />
      </template>

      <template #default="{ collapsed }">
        <UButton
          :label="collapsed ? undefined : 'Search...'"
          icon="i-lucide-search"
          color="neutral"
          variant="outline"
          block
          :square="collapsed"
          :variant-override="variant"
        >
          <template v-if="!collapsed" #trailing>
            <div class="flex items-center gap-0.5 ms-auto">
              <UKbd value="meta" variant="subtle" />
              <UKbd value="K" variant="subtle" />
            </div>
          </template>
        </UButton>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="navItems[0]"
          orientation="vertical"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="navItems[1]"
          orientation="vertical"
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex items-center gap-2 w-full">
          <!-- Theme Switcher (only if nuxt-crouton-themes is available) -->
          <component
            :is="ThemeSwitcherComponent"
            v-if="hasThemeSwitcher"
            :mode="collapsed ? 'cycle' : 'dropdown'"
            size="sm"
            show-color-mode
          />

          <!-- Color mode toggle fallback when no theme switcher -->
          <ClientOnly v-else>
            <UButton
              :icon="$colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="$colorMode.preference = $colorMode.value === 'dark' ? 'light' : 'dark'"
            />
          </ClientOnly>
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar :title="pageTitle">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #right>
            <slot name="navbar-right" />
          </template>
        </UDashboardNavbar>
      </template>

      <template #default>
        <div class="p-6">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>