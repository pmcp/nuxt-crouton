<script setup lang="ts">
/**
 * AuthSidebar Component
 *
 * Main sidebar component for dashboard and admin layouts.
 * Uses Nuxt UI's DashboardSidebar with navigation menu.
 * Context-aware: shows different navigation based on route context (dashboard vs admin).
 * Mode-aware: shows team management features only in multi-tenant mode.
 * Auto-discovers app routes via useCroutonApps().
 *
 * Theme integration: when @fyit/crouton-themes/themes is extended, automatically
 * shows ThemeCompactPicker in the footer and adds a theme submenu to the user menu.
 * No configuration required — detected via Vue's provide/inject system.
 *
 * @example
 * ```vue
 * <AuthSidebar :navigation-items="navItems" />
 * ```
 */
import { inject, resolveComponent } from 'vue'
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'
import type { ComputedRef } from 'vue'

interface Props {
  /** Navigation menu items */
  navigationItems?: NavigationMenuItem[][]
  /** Whether the sidebar is collapsible */
  collapsible?: boolean
  /** Whether the sidebar is resizable */
  resizable?: boolean
  /** App logo component or image URL */
  logo?: string
  /** App name (shown when sidebar expanded) */
  appName?: string
  /** Collapsed app icon */
  collapsedIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  collapsible: true,
  resizable: true,
  collapsedIcon: 'i-lucide-layout-dashboard'
})

// Theme integration (zero hard dependency on crouton-themes)
// When crouton-themes/themes is active, its plugin provides these via Vue inject.
const injectedThemeItems = inject<ComputedRef<DropdownMenuItem[]>>('crouton:themePreferenceItems')
const themePreferenceItems = computed<DropdownMenuItem[]>(() => injectedThemeItems?.value ?? [])
// ThemeCompactPicker is globally registered by crouton-themes when active.
// resolveComponent returns the string name when not found — we check for that.
const themeCompactPicker = resolveComponent('ThemeCompactPicker')
const hasThemePicker = typeof themeCompactPicker !== 'string'

const { t } = useT()
const route = useRoute()
const { buildDashboardUrl, teamSlug } = useTeamContext()
const { showTeamManagement } = useTeam()

// Get auto-discovered app routes
const { dashboardRoutes, adminRoutes, settingsRoutes } = useCroutonApps()

// Detect context: admin vs dashboard
const isAdminContext = computed(() => route.path.startsWith('/admin'))

// Build admin URL helper
function buildAdminUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const slug = teamSlug.value
  if (slug) {
    return `/admin/${slug}${cleanPath}`
  }
  return `/admin${cleanPath}`
}

// Build URL based on context
function buildContextUrl(path: string): string {
  return isAdminContext.value ? buildAdminUrl(path) : buildDashboardUrl(path, '')
}

// Convert app routes to navigation items
function appRoutesToNavItems(routes: Array<{ path: string; label: string; icon?: string }>): NavigationMenuItem[] {
  return routes.map((appRoute) => ({
    label: t(appRoute.label) || appRoute.label,
    icon: appRoute.icon || 'i-lucide-folder',
    to: buildContextUrl(appRoute.path)
  }))
}

// Default navigation items if none provided
const defaultNavItems = computed<NavigationMenuItem[][]>(() => {
  const baseUrl = isAdminContext.value ? buildAdminUrl('') : buildDashboardUrl('', '')

  // Main items - dashboard/admin home
  const mainItems: NavigationMenuItem[] = [
    {
      label: isAdminContext.value ? t('navigation.admin') : t('navigation.dashboard'),
      icon: 'i-lucide-layout-dashboard',
      to: baseUrl || (isAdminContext.value ? '/admin' : '/'),
      active: route.path === baseUrl || route.path === '/' || route.path === '/admin'
    }
  ]

  // Add app-specific routes based on context
  const appRoutes = isAdminContext.value ? adminRoutes.value : dashboardRoutes.value
  if (appRoutes.length > 0) {
    mainItems.push(...appRoutesToNavItems(appRoutes))
  }

  // Settings section
  const settingsChildren: NavigationMenuItem[] = []

  if (isAdminContext.value) {
    // Admin context: team settings
    settingsChildren.push(
      {
        label: t('teams.teamSettings'),
        icon: 'i-lucide-building-2',
        to: `${baseUrl}/settings`
      },
      {
        label: t('teams.members'),
        icon: 'i-lucide-users',
        to: `${baseUrl}/members`
      },
      {
        label: t('teams.invitationsShort') || t('teams.invitations') || 'Invitations',
        icon: 'i-lucide-mail',
        to: `${baseUrl}/invitations`
      }
    )

    // Add app-specific settings routes (e.g., email templates from bookings)
    if (settingsRoutes.value.length > 0) {
      settingsChildren.push(
        ...settingsRoutes.value.map((appRoute) => ({
          label: t(appRoute.label) || appRoute.label,
          icon: appRoute.icon || 'i-lucide-settings',
          to: `${baseUrl}/settings${appRoute.path}`
        }))
      )
    }
  } else {
    // Dashboard context: account settings
    settingsChildren.push(
      {
        label: t('navigation.account'),
        icon: 'i-lucide-user',
        to: `${baseUrl}/settings`
      },
      {
        label: t('account.security'),
        icon: 'i-lucide-shield',
        to: `${baseUrl}/settings/security`
      }
    )

    // Team settings in dashboard (if multi-tenant)
    if (showTeamManagement.value) {
      settingsChildren.push(
        {
          label: t('teams.team'),
          icon: 'i-lucide-building-2',
          to: `${baseUrl}/settings/team`
        },
        {
          label: t('teams.members'),
          icon: 'i-lucide-users',
          to: `${baseUrl}/settings/members`
        }
      )
    }
  }

  const settingsItems: NavigationMenuItem[] = [
    {
      label: t('navigation.settings'),
      icon: 'i-lucide-settings',
      defaultOpen: route.path.includes('/settings') || route.path.includes('/members') || route.path.includes('/invitations'),
      children: settingsChildren
    }
  ]

  return [mainItems, settingsItems]
})

const navItems = computed(() => props.navigationItems ?? defaultNavItems.value)
</script>

<template>
  <UDashboardSidebar
    :collapsible="collapsible"
    :resizable="resizable"
    :ui="{ footer: 'border-t border-default' }"
  >
    <template #header="{ collapsed }">
      <!-- App Logo/Name -->
      <div class="flex items-center gap-2">
        <img
          v-if="logo && !collapsed"
          :src="logo"
          :alt="appName"
          class="h-6 w-auto"
        >
        <UIcon
          v-else
          :name="collapsedIcon"
          class="size-6 text-primary"
        />
        <span
          v-if="!collapsed && appName"
          class="font-semibold text-highlighted truncate"
        >
          {{ appName }}
        </span>
      </div>
    </template>

    <template #default="{ collapsed }">
      <!-- Team Section (multi-tenant only) -->
      <SidebarTeamSection
        v-if="showTeamManagement"
        :collapsed="collapsed"
        class="mb-2"
      />

      <!-- Navigation Menu -->
      <UNavigationMenu
        :collapsed="collapsed"
        :items="navItems"
        orientation="vertical"
        class="flex-1"
      />
    </template>

    <template #footer="{ collapsed }">
      <!-- Theme swatch strip (shown when crouton-themes is active and sidebar is expanded) -->
      <div
        v-if="hasThemePicker && !collapsed"
        class="px-3 pt-2 pb-1 flex items-center gap-2"
      >
        <span class="text-xs text-muted">Theme</span>
        <component :is="themeCompactPicker" size="xs" />
      </div>

      <!-- User Menu (with theme submenu injected when crouton-themes is active) -->
      <SidebarUserMenu
        :collapsed="collapsed"
        :preference-items="themePreferenceItems"
      />
    </template>
  </UDashboardSidebar>
</template>
