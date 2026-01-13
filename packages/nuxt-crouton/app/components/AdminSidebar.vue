<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

interface Props {
  /**
   * The type of admin context: 'team' for team admin, 'super' for super admin
   * @default 'team'
   */
  context?: 'team' | 'super'
}

const props = withDefaults(defineProps<Props>(), {
  context: 'team'
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

// Get team context (for team admin)
const { teamSlug: teamSlugRef, teamId: teamIdRef, hasTeamContext } = useTeamContext()
const route = useRoute()

// Get auto-discovered app routes
const { adminRoutes, settingsRoutes } = useCroutonApps()

// Build URL based on context
const buildAdminUrl = (path: string): string => {
  if (props.context === 'super') {
    return `/super-admin${path}`
  }
  const teamParam = teamSlugRef.value || teamIdRef.value || ''
  return teamParam ? `/admin/${teamParam}${path}` : `/admin${path}`
}

// Convert app admin routes to navigation items
const appAdminItems = computed<NavigationMenuItem[]>(() => {
  if (!adminRoutes.value.length) return []

  return adminRoutes.value.map(appRoute => ({
    label: t(appRoute.label),
    icon: appRoute.icon,
    to: buildAdminUrl(appRoute.path),
    active: route.path.includes(appRoute.path),
    ...(appRoute.badge !== undefined && { badge: String(appRoute.badge) }),
    ...(appRoute.children && appRoute.children.length > 0 && {
      children: appRoute.children.filter(c => !c.hidden).map(child => ({
        label: t(child.label),
        icon: child.icon,
        to: buildAdminUrl(child.path),
        active: route.path.includes(child.path)
      }))
    })
  }))
})

// Convert app settings routes to navigation items
// Settings routes are under /admin/[team]/settings/ so we prepend /settings
const appSettingsItems = computed<NavigationMenuItem[]>(() => {
  if (!settingsRoutes.value.length) return []

  return settingsRoutes.value.map(appRoute => ({
    label: t(appRoute.label),
    icon: appRoute.icon || 'i-lucide-settings-2',
    to: buildAdminUrl(`/settings${appRoute.path}`),
    active: route.path.includes(`/settings${appRoute.path}`),
    ...(appRoute.badge !== undefined && { badge: String(appRoute.badge) })
  }))
})

// Core navigation items based on context
const coreItems = computed<NavigationMenuItem[]>(() => {
  if (props.context === 'super') {
    // Super Admin core items
    return [
      {
        label: t('admin.dashboard') || 'Dashboard',
        icon: 'i-lucide-shield-check',
        to: '/super-admin',
        active: route.path === '/super-admin' || route.path === '/super-admin/'
      },
      {
        label: t('admin.users') || 'Users',
        icon: 'i-lucide-users',
        to: '/super-admin/users',
        active: route.path.includes('/super-admin/users')
      },
      {
        label: t('admin.teams') || 'Teams',
        icon: 'i-lucide-building-2',
        to: '/super-admin/teams',
        active: route.path.includes('/super-admin/teams')
      }
    ]
  }

  // Team Admin core items
  const teamParam = teamSlugRef.value || teamIdRef.value || ''
  if (!teamParam) return []

  return [
    {
      label: t('admin.dashboard') || 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: `/admin/${teamParam}`,
      active: route.path === `/admin/${teamParam}` || route.path === `/admin/${teamParam}/`
    },
    {
      label: t('teams.members') || 'Members',
      icon: 'i-lucide-users',
      to: `/admin/${teamParam}/members`,
      active: route.path.includes('/members')
    },
    {
      label: t('teams.pendingInvitations') || 'Invitations',
      icon: 'i-lucide-mail',
      to: `/admin/${teamParam}/invitations`,
      active: route.path.includes('/invitations')
    }
  ]
})

// Settings items (team admin only)
const settingsItems = computed<NavigationMenuItem[]>(() => {
  if (props.context === 'super') return []

  const teamParam = teamSlugRef.value || teamIdRef.value || ''
  if (!teamParam) return []

  return [
    {
      label: t('teams.teamSettings') || 'Team Settings',
      icon: 'i-lucide-settings',
      to: `/admin/${teamParam}/settings`,
      active: route.path.includes('/settings')
    },
    // Add auto-discovered settings routes
    ...appSettingsItems.value
  ]
})

// Navigation items
const navItems = computed<NavigationMenuItem[][]>(() => {
  // Main items: core + auto-discovered admin routes
  const mainItems: NavigationMenuItem[] = [
    ...coreItems.value,
    // Auto-discovered app admin routes
    ...appAdminItems.value
  ]

  // Bottom items: settings (for team admin)
  const bottomItems: NavigationMenuItem[] = settingsItems.value.length > 0
    ? [{
        label: t('navigation.settings') || 'Settings',
        icon: 'i-lucide-settings',
        defaultOpen: false,
        children: settingsItems.value
      }]
    : []

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
      <div class="flex flex-col gap-2 w-full">
        <!-- Admin badge/logo -->
        <div v-if="!collapsed" class="flex items-center gap-2">
          <UIcon
            :name="context === 'super' ? 'i-lucide-shield-check' : 'i-lucide-settings'"
            class="size-5 text-primary"
          />
          <span class="font-semibold text-sm">
            {{ context === 'super' ? t('admin.superAdmin') || 'Super Admin' : t('admin.teamAdmin') || 'Team Admin' }}
          </span>
        </div>
        <UIcon
          v-else
          :name="context === 'super' ? 'i-lucide-shield-check' : 'i-lucide-settings'"
          class="size-5 text-primary mx-auto"
        />
      </div>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        :collapsed="collapsed"
        :items="navItems[0]"
        orientation="vertical"
      />

      <UNavigationMenu
        v-if="navItems[1]?.length"
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

        <!-- Back to dashboard link -->
        <UButton
          v-if="!collapsed && context === 'team'"
          :to="hasTeamContext ? `/dashboard/${teamSlugRef || teamIdRef}` : '/dashboard'"
          color="neutral"
          :variant="getVariant('ghost')"
          size="sm"
          icon="i-lucide-arrow-left"
          class="ml-auto"
        >
          {{ t('navigation.backToDashboard') || 'Back' }}
        </UButton>
      </div>
    </template>
  </UDashboardSidebar>
</template>
