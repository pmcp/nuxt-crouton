<script setup lang="ts">
/**
 * AuthSidebar Component
 *
 * Main sidebar component for the dashboard layout.
 * Uses Nuxt UI's DashboardSidebar with navigation menu.
 * Mode-aware: shows team management features only in multi-tenant mode.
 *
 * @example
 * ```vue
 * <AuthSidebar :navigation-items="navItems" />
 * ```
 */
import type { NavigationMenuItem } from '@nuxt/ui'

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
  collapsedIcon: 'i-lucide-layout-dashboard',
})

const emit = defineEmits<{
  /** Emitted when navigation item is selected */
  navigate: [item: NavigationMenuItem]
}>()

const { buildDashboardUrl } = useTeamContext()
const { showTeamManagement } = useTeam()

// Default navigation items if none provided
const defaultNavItems = computed<NavigationMenuItem[][]>(() => {
  const route = useRoute()
  const baseUrl = buildDashboardUrl('', '')

  const mainItems: NavigationMenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: baseUrl || '/dashboard',
      active: route.path === baseUrl || route.path === '/dashboard',
    },
  ]

  const settingsItems: NavigationMenuItem[] = [
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      defaultOpen: route.path.includes('/settings'),
      children: [
        {
          label: 'Account',
          icon: 'i-lucide-user',
          to: `${baseUrl}/settings`,
        },
        {
          label: 'Security',
          icon: 'i-lucide-shield',
          to: `${baseUrl}/settings/security`,
        },
        ...(showTeamManagement.value
          ? [
              {
                label: 'Team',
                icon: 'i-lucide-building-2',
                to: `${baseUrl}/settings/team`,
              },
              {
                label: 'Members',
                icon: 'i-lucide-users',
                to: `${baseUrl}/settings/members`,
              },
            ]
          : []),
      ],
    },
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
      <!-- User Menu -->
      <SidebarUserMenu :collapsed="collapsed" />
    </template>
  </UDashboardSidebar>
</template>
