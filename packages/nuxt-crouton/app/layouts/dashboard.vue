<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// Check if TeamSwitcher is available (from nuxt-crouton-auth)
// Use shallowRef for component refs to avoid Vue making them reactive (performance warning)
const hasTeamSwitcher = ref(false)
const TeamSwitcherComponent = shallowRef<ReturnType<typeof resolveComponent> | null>(null)

// Check if team switcher should be shown
const config = useRuntimeConfig()
const showSwitcher = computed(() => config.public.crouton?.auth?.teams?.showSwitcher !== false)

onMounted(() => {
  // Load TeamSwitcher if enabled
  if (showSwitcher.value) {
    const teamSwitcher = resolveComponent('TeamSwitcher')
    if (typeof teamSwitcher !== 'string') {
      TeamSwitcherComponent.value = teamSwitcher
      hasTeamSwitcher.value = true
    }
  }
})

// Try to use theme variant if available (from nuxt-crouton-themes)
// Returns both the base variant and getVariant helper for compound variants
const themeHelpers = computed(() => {
  try {
    // @ts-expect-error - composable may not exist when themes not installed
    const switcher = useThemeSwitcher?.()
    if (switcher) {
      return {
        variant: switcher.variant?.value,
        getVariant: switcher.getVariant
      }
    }
  } catch {
    // Themes not installed
  }
  return {
    variant: undefined,
    getVariant: (base: string) => base // Passthrough when themes not installed
  }
})

const variant = computed(() => themeHelpers.value.variant)
const getVariant = (base: string) => themeHelpers.value.getVariant(base)

// Get collections from app config (the proper registry)
const appConfig = useAppConfig()
const route = useRoute()

// Get team context (handles personal/single-tenant modes where team isn't in URL)
const { teamSlug: teamSlugRef, teamId: teamIdRef, buildDashboardUrl, hasTeamContext } = useTeamContext()


// Build navigation from crouton collections registry
const collections = computed(() => {
  const registry = (appConfig.croutonCollections || {}) as Record<string, { name?: string; layer?: string }>
  if (!registry || Object.keys(registry).length === 0) return []

  return Object.entries(registry).map(([key, config]) => {
    // Create a nice label from the collection name
    // e.g., "projectManagementProjects" -> "Projects"
    const simpleName = config.name || key
    const label = simpleName
      .replace(/^[a-z]+([A-Z])/, '$1') // Remove camelCase prefix (layer name)
      .replace(/([A-Z])/g, ' $1') // Add spaces before capitals
      .trim()
      .replace(/^./, c => c.toUpperCase()) // Capitalize first letter

    return {
      key,
      label,
      icon: 'i-lucide-folder'
    }
  })
})

// Navigation items
const navItems = computed<NavigationMenuItem[][]>(() => {
  // Use teamSlug if available, fallback to teamId for URL construction
  const teamParam = teamSlugRef.value || teamIdRef.value || ''

  // Don't render navigation links until team context is available
  if (!teamParam) {
    return [[], []]
  }

  const collectionItems: NavigationMenuItem[] = collections.value.map(col => ({
    label: col.label,
    icon: col.icon,
    to: `/dashboard/${teamParam}/crouton/${col.key}`,
    active: route.path.includes(`/crouton/${col.key}`)
  }))

  const mainItems: NavigationMenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: `/dashboard/${teamParam}/crouton`,
      active: route.path.endsWith('/crouton')
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
      to: `/dashboard/${teamParam}/settings`
    }
  ]

  return [mainItems, bottomItems]
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
        <div class="flex flex-col gap-2 w-full">
          <!-- Logo -->
          <div v-if="!collapsed" class="flex items-center gap-2">
            <UIcon name="i-lucide-croissant" class="size-5 text-primary" />
            <span class="font-semibold text-sm">Crouton</span>
          </div>
          <UIcon v-else name="i-lucide-croissant" class="size-5 text-primary mx-auto" />

          <!-- Team Switcher (multi-tenant mode only) -->
          <component
            :is="TeamSwitcherComponent"
            v-if="hasTeamSwitcher && !collapsed"
            size="sm"
            class="w-full"
          />
        </div>
      </template>

      <template #default="{ collapsed }">
        <UButton
          :label="collapsed ? undefined : 'Search...'"
          icon="i-lucide-search"
          color="neutral"
          :variant="getVariant('outline')"
          block
          :square="collapsed"
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
          <!-- Appearance switcher: shows ThemeSwitcher (if themes installed) + DarkModeSwitcher -->
          <CroutonAppearanceSwitcher
            :mode="collapsed ? 'cycle' : 'dropdown'"
            size="sm"
          />
        </div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>