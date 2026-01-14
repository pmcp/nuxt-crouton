<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// Check if TeamSwitcher is available (from nuxt-crouton-auth)
const hasTeamSwitcher = ref(false)
const TeamSwitcherComponent = shallowRef<ReturnType<typeof resolveComponent> | null>(null)

// Check if team switcher should be shown
const config = useRuntimeConfig()
const showSwitcher = computed(() => config.public.crouton?.auth?.teams?.showSwitcher !== false)

onMounted(() => {
  if (showSwitcher.value) {
    const teamSwitcher = resolveComponent('TeamSwitcher')
    if (typeof teamSwitcher !== 'string') {
      TeamSwitcherComponent.value = teamSwitcher
      hasTeamSwitcher.value = true
    }
  }
})

// Try to use theme variant if available (from nuxt-crouton-themes)
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
    getVariant: (base: string) => base
  }
})

const getVariant = (base: string) => themeHelpers.value.getVariant(base)

// Translation support
const { t } = useT()

const route = useRoute()

// Get team context
const { teamSlug: teamSlugRef, teamId: teamIdRef } = useTeamContext()

// Get auto-discovered app routes
const { dashboardRoutes } = useCroutonApps()

// Convert app routes to navigation items
const appRouteItems = computed<NavigationMenuItem[]>(() => {
  const teamParam = teamSlugRef.value || teamIdRef.value || ''
  if (!teamParam || !dashboardRoutes.value.length) return []

  return dashboardRoutes.value.map(appRoute => ({
    label: t(appRoute.label),
    icon: appRoute.icon,
    to: `/dashboard/${teamParam}${appRoute.path}`,
    active: route.path.includes(appRoute.path),
    ...(appRoute.badge !== undefined && { badge: String(appRoute.badge) }),
    ...(appRoute.children && appRoute.children.length > 0 && {
      children: appRoute.children.filter(c => !c.hidden).map(child => ({
        label: t(child.label),
        icon: child.icon,
        to: `/dashboard/${teamParam}${child.path}`,
        active: route.path.includes(child.path)
      }))
    })
  }))
})

// Navigation items
const navItems = computed<NavigationMenuItem[][]>(() => {
  const teamParam = teamSlugRef.value || teamIdRef.value || ''

  if (!teamParam) {
    return [[], []]
  }

  // Core dashboard items
  const coreItems: NavigationMenuItem[] = [
    {
      label: t('navigation.dashboard'),
      icon: 'i-lucide-layout-dashboard',
      to: `/dashboard/${teamParam}`,
      active: route.path === `/dashboard/${teamParam}` || route.path === `/dashboard/${teamParam}/`
    }
  ]

  // Build main navigation
  const mainItems: NavigationMenuItem[] = [
    ...coreItems,
    // Auto-discovered app routes (e.g., Bookings)
    ...appRouteItems.value
  ]

  // Bottom items
  const bottomItems: NavigationMenuItem[] = [
    {
      label: t('navigation.settings'),
      icon: 'i-lucide-settings',
      to: `/dashboard/${teamParam}/settings`
    }
  ]

  return [mainItems, bottomItems]
})
</script>

<template>
  <UDashboardSidebar
    collapsible
    resizable
    :ui="{ footer: 'border-t border-default' }"
  >
    <template #header="{ collapsed }">
      <!-- Logo only - single line to align with navbar height -->
      <div v-if="!collapsed" class="flex items-center gap-2">
        <UIcon name="i-lucide-croissant" class="size-5 text-primary" />
        <span class="font-semibold text-sm">Crouton</span>
      </div>
      <UIcon v-else name="i-lucide-croissant" class="size-5 text-primary mx-auto" />
    </template>

    <template #default="{ collapsed }">
      <!-- Team Switcher (multi-tenant mode only) -->
      <component
        :is="TeamSwitcherComponent"
        v-if="hasTeamSwitcher && !collapsed"
        size="sm"
        class="w-full"
      />

      <UButton
        :label="collapsed ? undefined : t('common.search') + '...'"
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
        <CroutonAppearanceSwitcher
          :mode="collapsed ? 'cycle' : 'dropdown'"
          size="sm"
        />
      </div>
    </template>
  </UDashboardSidebar>
</template>
