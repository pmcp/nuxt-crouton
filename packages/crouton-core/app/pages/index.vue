<script setup lang="ts">
// Try to use auth if available (crouton-auth is an optional peer dep)
const auth = tryUseAuth()
const loggedIn = computed(() => auth?.loggedIn?.value ?? false)
const user = computed(() => auth?.user?.value ?? null)
const isSuperAdmin = computed(() => user.value?.superAdmin === true)

function tryUseAuth() {
  try {
    return useAuth()
  } catch {
    return null
  }
}

function tryUseTeam() {
  try {
    return useTeam()
  } catch {
    return null
  }
}

function tryUseSession() {
  try {
    return useSession()
  } catch {
    return null
  }
}

const teamComposable = tryUseTeam()
const sessionComposable = tryUseSession()

const teams = computed(() => teamComposable?.teams?.value ?? [])
const canCreateTeam = computed(() => teamComposable?.canCreateTeam?.value ?? false)
const isPending = computed(() => sessionComposable?.isPending?.value ?? false)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <div class="max-w-2xl w-full space-y-8">
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
      </div>

      <!-- Auth-aware content -->
      <ClientOnly>
        <!-- Loading state -->
        <div
          v-if="isPending"
          class="py-12 text-center text-gray-400 dark:text-gray-500"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="size-6 animate-spin mx-auto mb-2"
          />
        </div>

        <!-- Logged in: Team cards -->
        <template v-else-if="loggedIn">
          <p class="text-center text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {{ user?.name || user?.email }}
          </p>

          <div class="grid gap-4 sm:grid-cols-2">
            <!-- Team cards -->
            <UCard
              v-for="team in teams"
              :key="team.id"
              class="hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div class="flex items-center gap-3 mb-4">
                <UAvatar
                  v-if="team.logo"
                  :src="team.logo"
                  :alt="team.name"
                  size="lg"
                />
                <div
                  v-else
                  class="flex items-center justify-center size-10 rounded-full bg-gray-100 dark:bg-gray-800"
                >
                  <UIcon
                    name="i-lucide-building-2"
                    class="size-5 text-gray-400 dark:text-gray-500"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="font-semibold text-gray-900 dark:text-white truncate">
                    {{ team.name }}
                  </h3>
                  <p class="text-xs text-gray-400 dark:text-gray-500 truncate">
                    /{{ team.slug }}
                  </p>
                </div>
              </div>
              <div class="flex gap-2">
                <UButton
                  :to="`/admin/${team.slug}`"
                  size="sm"
                  variant="soft"
                  class="flex-1"
                >
                  <UIcon name="i-lucide-layout-grid" />
                  Admin
                </UButton>
                <UButton
                  :to="`/${team.slug}`"
                  size="sm"
                  variant="outline"
                  class="flex-1"
                >
                  <UIcon name="i-lucide-globe" />
                  Website
                </UButton>
              </div>
            </UCard>

            <!-- Create team card -->
            <NuxtLink
              v-if="canCreateTeam"
              to="/onboarding/create-team"
              class="block"
            >
              <UCard class="h-full hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer border-dashed">
                <div class="flex flex-col items-center justify-center gap-2 py-4 text-gray-400 dark:text-gray-500">
                  <UIcon
                    name="i-lucide-plus"
                    class="size-8"
                  />
                  <span class="text-sm font-medium">Create team</span>
                </div>
              </UCard>
            </NuxtLink>
          </div>

          <!-- Super admin shortcut -->
          <div
            v-if="isSuperAdmin"
            class="pt-2"
          >
            <UButton
              to="/super-admin"
              size="lg"
              variant="outline"
              block
            >
              <UIcon name="i-lucide-shield-check" />
              Super Admin
            </UButton>
          </div>
        </template>

        <!-- Logged out: Login / Register -->
        <template v-else>
          <p class="text-center text-sm text-gray-500 dark:text-gray-400">
            Sign in to get started
          </p>
          <div class="space-y-3">
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
          </div>
        </template>
      </ClientOnly>

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
