<script setup lang="ts">
// Try to use auth if available (crouton-auth is an optional peer dep)
const auth = tryUseAuth()
const loggedIn = computed(() => auth?.loggedIn?.value ?? false)
const user = computed(() => auth?.user?.value ?? null)
const isSuperAdmin = computed(() => user.value?.superAdmin === true)

// Get installed apps
const { appsList } = useCroutonApps()

// Detect installed core modules by checking for known features
const appConfig = useAppConfig()

const installedModules = computed(() => {
  const modules: { name: string; icon: string; description: string }[] = []

  // Core is always installed
  modules.push({
    name: 'Core',
    icon: 'i-lucide-box',
    description: 'CRUD composables & components'
  })

  // Auth - check if auth composable works
  if (auth) {
    modules.push({
      name: 'Auth',
      icon: 'i-lucide-shield',
      description: 'Authentication & teams'
    })
  }

  // i18n - check for translation config
  if (appConfig.croutonI18n || typeof useT === 'function') {
    modules.push({
      name: 'i18n',
      icon: 'i-lucide-languages',
      description: 'Translations'
    })
  }

  // Admin - check for admin routes existence
  if (appConfig.croutonAdmin !== false) {
    modules.push({
      name: 'Admin',
      icon: 'i-lucide-settings',
      description: 'Admin dashboard'
    })
  }

  return modules
})

function tryUseAuth() {
  try {
    return useAuth()
  } catch {
    return null
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <div class="max-w-lg w-full space-y-8">
      <!-- Header -->
      <div class="text-center space-y-2">
        <div class="flex items-center justify-center gap-2 text-primary">
          <UIcon
            name="i-lucide-croissant"
            class="size-8"
          />
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Crouton
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Your app is ready
        </p>
      </div>

      <!-- Installed Modules -->
      <div class="space-y-3">
        <h2 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Installed Modules
        </h2>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="mod in installedModules"
            :key="mod.name"
            class="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
          >
            <UIcon
              :name="mod.icon"
              class="size-4 text-gray-500 dark:text-gray-400 shrink-0"
            />
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {{ mod.name }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Installed Apps -->
      <div
        v-if="appsList.length > 0"
        class="space-y-3"
      >
        <h2 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Installed Apps
        </h2>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="app in appsList"
            :key="app.id"
            class="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
          >
            <UIcon
              :name="app.icon || 'i-lucide-package'"
              class="size-4 text-gray-500 dark:text-gray-400 shrink-0"
            />
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
              {{ app.name }}
            </p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-3">
        <template v-if="loggedIn">
          <!-- Logged in state -->
          <UButton
            to="/admin"
            size="lg"
            block
          >
            <UIcon name="i-lucide-layout-grid" />
            Go to Admin
          </UButton>
          <UButton
            v-if="isSuperAdmin"
            to="/super-admin"
            size="lg"
            variant="outline"
            block
          >
            <UIcon name="i-lucide-shield-check" />
            Super Admin
          </UButton>
        </template>
        <template v-else>
          <!-- Logged out state -->
          <UButton
            to="/auth/login"
            size="lg"
            block
          >
            <UIcon name="i-lucide-log-in" />
            Login
          </UButton>
          <UButton
            to="/auth/register"
            size="lg"
            variant="outline"
            block
          >
            <UIcon name="i-lucide-user-plus" />
            Register
          </UButton>
        </template>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-gray-400 dark:text-gray-500">
        <a
          href="https://crouton.dev"
          target="_blank"
          class="hover:text-gray-600 dark:hover:text-gray-300"
        >
          crouton.dev
        </a>
      </p>
    </div>
  </div>
</template>