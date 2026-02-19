<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'
import { useMediaQuery } from '@vueuse/core'

/**
 * Pages Navigation Component
 *
 * Two-pill floating nav:
 * - Left pill: Page navigation links (hidden when only 1 page)
 * - Right pill: User menu (or login link), language switcher, dark mode toggle
 *
 * Responsive behavior:
 * - Desktop (md+): Full horizontal pills
 * - Mobile: Condensed pills with hamburger drawer for pages
 *
 * @example
 * <CroutonPagesNav />
 */

const { navigation, isLoading, isActive } = useNavigation()
const { user, userInitials, dropdownItems: userDropdownItems } = useUserMenuItems()
const { currentTeam, isAdmin } = useTeam()
const { teamSlug: teamSlugRef, teamId: teamIdRef } = useTeamContext()
const { appsList, getAppAllRoutes } = useCroutonApps()
const { adminCollections } = useCroutonCollectionsNav()
const colorMode = useColorMode()
const { t } = useT()

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
    onSelect: item.children?.length ? undefined : closeDrawer,
    children: item.children?.length
      ? item.children.map((child: any) => ({
          label: child.title || child.slug,
          icon: child.icon,
          to: child.path,
          onSelect: closeDrawer
        }))
      : undefined
  }))
})

// Show left pill only when more than 1 page
const showPageNav = computed(() => menuItems.value.length > 1)

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Admin dropdown menu items — mirrors AdminSidebar logic dynamically
const adminPrefix = computed(() => {
  const teamParam = teamSlugRef.value || teamIdRef.value || currentTeam.value?.slug || ''
  return teamParam ? `/admin/${teamParam}` : '/admin'
})

const adminDropdownItems = computed<DropdownMenuItem[][]>(() => {
  const prefix = adminPrefix.value
  const groups: DropdownMenuItem[][] = []

  // Dashboard
  groups.push([
    {
      label: t('admin.dashboard') || 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: prefix
    }
  ])

  // Team section — same keys as AdminSidebar
  const teamPath = `${prefix}/team`
  groups.push([
    {
      label: t('teams.members') || 'Members',
      icon: 'i-lucide-users',
      to: teamPath
    },
    {
      label: t('pages.admin.pages') || 'Pages',
      icon: 'i-lucide-file-text',
      to: `${prefix}/pages`
    },
    {
      label: t('teams.teamSettings') || 'Team Settings',
      icon: 'i-lucide-settings',
      to: `${teamPath}/settings`
    },
    {
      label: t('navigation.translations') || 'Translations',
      icon: 'i-lucide-languages',
      to: `${prefix}/translations`
    }
  ])

  // Collections — dynamic from useCroutonCollectionsNav()
  if (adminCollections.value.length > 0) {
    const basePath = `${prefix}/crouton`
    groups.push(
      adminCollections.value.map(col => ({
        label: col.label,
        icon: col.icon || 'i-lucide-database',
        to: `${basePath}/${col.name}`
      }))
    )
  }

  // App routes — dynamic from useCroutonApps()
  for (const app of appsList.value) {
    const allRoutes = getAppAllRoutes(app.id)
    if (allRoutes.length === 0) continue

    groups.push(
      allRoutes.map(appRoute => ({
        label: t(appRoute.label) || appRoute.label,
        icon: appRoute.icon,
        to: `${prefix}${appRoute.path}`
      }))
    )
  }

  return groups
})

// Shared pill styles
const pillClass = 'flex items-center gap-1 bg-muted/80 backdrop-blur-sm rounded-full border border-default shadow-lg shadow-neutral-950/5'
</script>

<template>
  <div class="fixed top-4 sm:top-6 inset-x-0 z-50 px-4 sm:px-6">
    <!-- Loading state -->
    <template v-if="isLoading">
      <div class="relative flex items-center justify-center">
        <div :class="[pillClass, 'px-4 py-2']">
          <USkeleton class="h-6 w-16 rounded-full" />
          <USkeleton class="h-6 w-16 rounded-full" />
          <USkeleton class="h-6 w-16 rounded-full" />
        </div>
        <div :class="[pillClass, 'px-2 py-1 absolute right-0']">
          <USkeleton class="h-8 w-8 rounded-full" />
          <USkeleton class="h-6 w-12 rounded-full" />
          <USkeleton class="h-8 w-8 rounded-full" />
        </div>
      </div>
    </template>

    <!-- Desktop layout -->
    <div v-else-if="isDesktop" class="relative flex items-center" :class="showPageNav ? 'justify-center' : 'justify-end'">
      <!-- Center pill: Page navigation (hidden when ≤1 page) -->
      <div v-if="showPageNav" :class="[pillClass, 'px-4']">
        <UNavigationMenu
          :items="menuItems"
          variant="link"
          color="neutral"
          :ui="{
            link: 'px-2 py-1',
            linkLeadingIcon: 'hidden',
            childLinkLabel: 'whitespace-nowrap'
          }"
        />
      </div>

      <!-- Right pill: User menu + language + dark mode (pinned right) -->
      <div :class="[pillClass, 'px-2 py-1', showPageNav && 'absolute right-0']">
        <ClientOnly>
          <!-- Authenticated: Avatar dropdown -->
          <UDropdownMenu
            v-if="user"
            :items="userDropdownItems"
            :content="{ align: 'end', side: 'bottom' }"
            :ui="{ content: 'w-56' }"
          >
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              class="rounded-full"
            >
              <template #leading>
                <UAvatar
                  :src="user?.image ?? undefined"
                  :alt="user?.name ?? 'User'"
                  :text="userInitials"
                  size="2xs"
                />
              </template>
            </UButton>
          </UDropdownMenu>

          <!-- Not authenticated: Login button -->
          <UButton
            v-else
            to="/auth/login"
            icon="i-lucide-log-in"
            color="neutral"
            variant="ghost"
            size="sm"
            :label="t('auth.signIn') || 'Sign In'"
          />

          <!-- Admin menu -->
          <UDropdownMenu
            v-if="user && isAdmin && currentTeam?.slug"
            :items="adminDropdownItems"
            :content="{ align: 'end', side: 'bottom' }"
            :ui="{ content: 'w-48' }"
          >
            <UButton
              icon="i-lucide-settings"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Admin menu"
            />
          </UDropdownMenu>
        </ClientOnly>

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
    </div>

    <!-- Mobile layout -->
    <div v-else class="relative flex items-center" :class="showPageNav ? 'justify-center' : 'justify-end'">
      <!-- Center pill: Hamburger + drawer (hidden when ≤1 page) -->
      <div v-if="showPageNav" :class="[pillClass, 'px-2 py-1']">
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
              <CroutonI18nLanguageSwitcher class="w-auto" />
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
      </div>
      <!-- Right pill: User + language + dark mode (pinned right) -->
      <div :class="[pillClass, 'px-2 py-1', showPageNav && 'absolute right-0']">
        <ClientOnly>
          <!-- Authenticated: Avatar dropdown -->
          <UDropdownMenu
            v-if="user"
            :items="userDropdownItems"
            :content="{ align: 'end', side: 'bottom' }"
            :ui="{ content: 'w-56' }"
          >
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              class="rounded-full"
            >
              <template #leading>
                <UAvatar
                  :src="user?.image ?? undefined"
                  :alt="user?.name ?? 'User'"
                  :text="userInitials"
                  size="2xs"
                />
              </template>
            </UButton>
          </UDropdownMenu>

          <!-- Not authenticated: Login button -->
          <UButton
            v-else
            to="/auth/login"
            icon="i-lucide-log-in"
            color="neutral"
            variant="ghost"
            size="sm"
          />

          <!-- Admin menu -->
          <UDropdownMenu
            v-if="user && isAdmin && currentTeam?.slug"
            :items="adminDropdownItems"
            :content="{ align: 'end', side: 'bottom' }"
            :ui="{ content: 'w-48' }"
          >
            <UButton
              icon="i-lucide-settings"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Admin menu"
            />
          </UDropdownMenu>
        </ClientOnly>

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
  </div>
</template>
