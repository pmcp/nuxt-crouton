<script setup lang="ts">
const { currentTheme } = useThemeSwitcher()

// Theme-specific background classes
const backgroundClass = computed(() => {
  switch (currentTheme.value) {
    case 'ko':
      return 'bg-[var(--ko-surface-light)] dark:bg-[var(--ko-surface-dark)]'
    case 'minimal':
      return 'bg-white dark:bg-black'
    case 'kr11':
      return 'bg-stone-100 dark:bg-stone-900'
    default:
      return 'bg-gray-50 dark:bg-gray-900'
  }
})

const headerClass = computed(() => {
  switch (currentTheme.value) {
    case 'ko':
      return 'border-[var(--ko-surface-mid)] bg-[var(--ko-surface-light)]/80 dark:bg-[var(--ko-surface-dark)]/80'
    case 'minimal':
      return 'border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80'
    case 'kr11':
      return 'border-stone-300 dark:border-stone-700 bg-stone-100/80 dark:bg-stone-900/80'
    default:
      return 'border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80'
  }
})
</script>

<template>
  <UApp>
    <div class="min-h-screen" :class="backgroundClass">
      <header class="sticky top-0 z-50 border-b backdrop-blur-sm" :class="headerClass">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Theme Playground</h1>
          <ThemeSwitcher show-color-mode />
        </div>
      </header>
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>
