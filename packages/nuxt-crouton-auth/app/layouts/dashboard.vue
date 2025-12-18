<script setup lang="ts">
/**
 * Dashboard Layout
 *
 * Main dashboard layout with sidebar and content area.
 * Uses Nuxt UI's DashboardGroup for responsive sidebar management.
 *
 * @example
 * In a page:
 * ```vue
 * <template>
 *   <div>Page content</div>
 * </template>
 *
 * <script setup>
 * definePageMeta({ layout: 'dashboard' })
 * </script>
 * ```
 */
import type { NavigationMenuItem } from '@nuxt/ui'

interface Props {
  /** Custom navigation items for the sidebar */
  navigationItems?: NavigationMenuItem[][]
  /** App logo URL */
  logo?: string
  /** App name */
  appName?: string
}

const props = defineProps<Props>()

// Get app name from runtime config if not provided
const config = useRuntimeConfig()
const appName = computed(() => props.appName ?? config.public.crouton?.auth?.appName ?? 'Dashboard')
</script>

<template>
  <UDashboardGroup>
    <SidebarAuthSidebar
      :navigation-items="navigationItems"
      :logo="logo"
      :app-name="appName"
    />

    <UDashboardPanel>
      <slot />
    </UDashboardPanel>
  </UDashboardGroup>
</template>
