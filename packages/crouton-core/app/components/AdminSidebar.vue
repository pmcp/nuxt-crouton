<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// Check if TeamSwitcher is available (from nuxt-crouton-auth)
const hasTeamSwitcher = ref(false)
const TeamSwitcherComponent = shallowRef<ReturnType<typeof resolveComponent> | null>(null)

// Check if UserMenu is available (from nuxt-crouton-auth)
const hasUserMenu = ref(false)
const UserMenuComponent = shallowRef<ReturnType<typeof resolveComponent> | null>(null)

// Check if team switcher should be shown (for team admin only)
const runtimeConfig = useRuntimeConfig()
const showSwitcher = computed(() => runtimeConfig.public.crouton?.auth?.teams?.showSwitcher !== false)

onMounted(() => {
  // Resolve TeamSwitcher
  if (showSwitcher.value) {
    const teamSwitcher = resolveComponent('TeamSwitcher')
    if (typeof teamSwitcher !== 'string') {
      TeamSwitcherComponent.value = teamSwitcher
      hasTeamSwitcher.value = true
    }
  }

  // Resolve UserMenu (SidebarUserMenu)
  const userMenu = resolveComponent('SidebarUserMenu')
  if (typeof userMenu !== 'string') {
    UserMenuComponent.value = userMenu
    hasUserMenu.value = true
  }
})

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
const { appsList, getAppAllRoutes } = useCroutonApps()

// Get registered collections for admin navigation
const { adminCollections } = useCroutonCollectionsNav()

// Build URL based on context
const buildAdminUrl = (path: string): string => {
  if (props.context === 'super') {
    return `/super-admin${path}`
  }
  const teamParam = teamSlugRef.value || teamIdRef.value || ''
  return teamParam ? `/admin/${teamParam}${path}` : `/admin${path}`
}

// Build app groups - each registered app becomes a navigation group
const appGroups = computed<NavigationMenuItem[]>(() => {
  if (props.context === 'super') return [] // Super admin doesn't use app groups

  const groups: NavigationMenuItem[] = []

  for (const app of appsList.value) {
    const allRoutes = getAppAllRoutes(app.id)
    if (allRoutes.length === 0) continue

    // Convert routes to navigation items
    const routeItems: NavigationMenuItem[] = allRoutes.map(appRoute => {
      const fullPath = buildAdminUrl(appRoute.path)
      // Exact match: current path equals the route path (with or without trailing slash)
      const isExactMatch = route.path === fullPath || route.path === `${fullPath}/`
      return {
        label: t(appRoute.label),
        icon: appRoute.icon,
        to: fullPath,
        active: isExactMatch,
        ...(appRoute.badge !== undefined && { badge: String(appRoute.badge) })
      }
    })

    // Single-item apps appear flat (no group header)
    if (routeItems.length === 1) {
      groups.push(routeItems[0])
    } else {
      // Multi-item apps get a group header
      groups.push({
        label: app.name,
        icon: app.icon,
        defaultOpen: true,
        children: routeItems
      })
    }
  }

  return groups
})

// Dashboard item (standalone at top)
const dashboardItem = computed<NavigationMenuItem | null>(() => {
  if (props.context === 'super') {
    return {
      label: t('admin.dashboard') || 'Dashboard',
      icon: 'i-lucide-shield-check',
      to: '/super-admin',
      active: route.path === '/super-admin' || route.path === '/super-admin/'
    }
  }

  const teamParam = teamSlugRef.value || teamIdRef.value || ''
  if (!teamParam) return null

  return {
    label: t('admin.dashboard') || 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: `/admin/${teamParam}`,
    active: route.path === `/admin/${teamParam}` || route.path === `/admin/${teamParam}/`
  }
})

// Team group with sub-items (navigates to team section with horizontal tabs)
const teamItem = computed<NavigationMenuItem | null>(() => {
  if (props.context === 'super') {
    // Super Admin uses flat items, not a team group
    return null
  }

  const teamParam = teamSlugRef.value || teamIdRef.value || ''
  if (!teamParam) return null

  const teamPath = `/admin/${teamParam}/team`
  const translationsPath = `/admin/${teamParam}/translations`
  return {
    label: t('navigation.team') || 'Team',
    icon: 'i-lucide-users',
    defaultOpen: true,
    children: [
      {
        label: t('teams.members') || 'Members',
        icon: 'i-lucide-users',
        to: teamPath,
        active: route.path === teamPath || route.path === `${teamPath}/`
      },
      {
        label: t('teams.invitations') || 'Invitations',
        icon: 'i-lucide-mail',
        to: `${teamPath}/invitations`,
        active: route.path === `${teamPath}/invitations` || route.path === `${teamPath}/invitations/`
      },
      {
        label: t('teams.teamSettings') || 'Team Settings',
        icon: 'i-lucide-settings',
        to: `${teamPath}/settings`,
        active: route.path === `${teamPath}/settings` || route.path === `${teamPath}/settings/`
      },
      {
        label: t('navigation.translations') || 'Translations',
        icon: 'i-lucide-languages',
        to: translationsPath,
        active: route.path === translationsPath || route.path.startsWith(`${translationsPath}/`)
      }
    ]
  }
})

// Collections group - registered crouton collections
const collectionsItem = computed<NavigationMenuItem | null>(() => {
  if (props.context === 'super') return null
  if (adminCollections.value.length === 0) return null

  const teamParam = teamSlugRef.value || teamIdRef.value || ''
  if (!teamParam) return null

  const basePath = `/admin/${teamParam}/crouton`

  return {
    label: t('navigation.collections') || 'Collections',
    icon: 'i-lucide-database',
    defaultOpen: false,
    children: adminCollections.value.map(col => ({
      label: col.label,
      icon: col.icon,
      to: `${basePath}/${col.name}`,
      active: route.path.includes(`${basePath}/${col.name}`)
    }))
  }
})

// Super Admin core items (flat, no grouping)
const superAdminItems = computed<NavigationMenuItem[]>(() => {
  if (props.context !== 'super') return []

  return [
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
})

// Navigation items - structured by domain/app
const navItems = computed<NavigationMenuItem[][]>(() => {
  const mainItems: NavigationMenuItem[] = []

  // 1. Dashboard (standalone at top)
  if (dashboardItem.value) {
    mainItems.push(dashboardItem.value)
  }

  // 2. For super admin: flat items (Users, Teams)
  if (props.context === 'super') {
    mainItems.push(...superAdminItems.value)
  }

  // 3. For team admin: Team group (Members, Invitations, Settings, Translations)
  if (teamItem.value) {
    mainItems.push(teamItem.value)
  }

  // 4. Collections group (registered crouton collections)
  if (collectionsItem.value) {
    mainItems.push(collectionsItem.value)
  }

  // 5. App groups (Bookings, etc.) - each app gets its own group
  mainItems.push(...appGroups.value)

  // No bottom items - everything is in the main navigation now
  return [mainItems, []]
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
        <!-- Team Switcher in header (team admin only) -->
        <component
          :is="TeamSwitcherComponent"
          v-if="hasTeamSwitcher && !collapsed && context === 'team'"
          route-prefix="/admin"
          size="sm"
          class="w-full"
        />
        <!-- Collapsed: show settings icon for team admin -->
        <UIcon
          v-else-if="collapsed && context === 'team'"
          name="i-lucide-settings"
          class="size-5 text-primary mx-auto"
        />
        <!-- Super Admin header -->
        <div v-else-if="context === 'super' && !collapsed" class="flex items-center gap-2">
          <UIcon
            name="i-lucide-shield-check"
            class="size-5 text-primary"
          />
          <span class="font-semibold text-sm">
            {{ t('admin.superAdmin') || 'Super Admin' }}
          </span>
        </div>
        <UIcon
          v-else-if="context === 'super' && collapsed"
          name="i-lucide-shield-check"
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
      <!-- User Menu -->
      <component
        :is="UserMenuComponent"
        v-if="hasUserMenu"
        :collapsed="collapsed"
      />
    </template>
  </UDashboardSidebar>
</template>
