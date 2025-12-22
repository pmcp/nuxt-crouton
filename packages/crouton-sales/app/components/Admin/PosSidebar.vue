<template>
  <UNavigationMenu
    orientation="vertical"
    :items="navigationItems"
    class="w-full"
  />
</template>

<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const props = defineProps<{
  /** Base path for navigation links (e.g., '/dashboard/my-team') */
  basePath: string
  /** Whether to show the Printers navigation item (opt-in for print feature) */
  showPrinters?: boolean
  /** Whether to show the Helpers navigation item */
  showHelpers?: boolean
  /** Additional navigation items to append */
  additionalItems?: NavigationMenuItem[]
}>()

const navigationItems = computed<NavigationMenuItem[][]>(() => {
  const items: NavigationMenuItem[] = [
    {
      label: 'Events',
      icon: 'i-lucide-calendar',
      to: `${props.basePath}/events`,
    },
    {
      label: 'Products',
      icon: 'i-lucide-package',
      to: `${props.basePath}/products`,
    },
    {
      label: 'Categories',
      icon: 'i-lucide-folder',
      to: `${props.basePath}/categories`,
    },
    {
      label: 'Locations',
      icon: 'i-lucide-map-pin',
      to: `${props.basePath}/locations`,
    },
  ]

  // Opt-in: Show printers if enabled
  if (props.showPrinters) {
    items.push({
      label: 'Printers',
      icon: 'i-lucide-printer',
      to: `${props.basePath}/printers`,
    })
  }

  // Opt-in: Show helpers if enabled
  if (props.showHelpers) {
    items.push({
      label: 'Helpers',
      icon: 'i-lucide-users',
      to: `${props.basePath}/helpers`,
    })
  }

  items.push({
    label: 'Clients',
    icon: 'i-lucide-user',
    to: `${props.basePath}/clients`,
  })

  // Add any additional custom items
  if (props.additionalItems) {
    items.push(...props.additionalItems)
  }

  return [items]
})
</script>
