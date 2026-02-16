<script setup lang="ts">
const { isReady } = useAppReady()

// Safety timeout: force-show after 3s even if a gate is stuck
const forceShow = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
if (import.meta.client) {
  timer = setTimeout(() => {
    forceShow.value = true
    console.warn('[crouton] App readiness timeout — force-showing content. Check unresolved gates.')
  }, 3000)
  watch(isReady, (ready) => {
    if (ready && timer) {
      clearTimeout(timer)
      timer = undefined
    }
  })
}

const showContent = computed(() => isReady.value || forceShow.value)
</script>

<template>
  <UApp>
    <div class="bg-default" data-vaul-drawer-wrapper>
      <!-- Loading screen (overlay) -->
      <div
        v-if="!showContent"
        class="fixed inset-0 bg-default z-50 flex items-center justify-center"
      >
        <div class="animate-pulse">
          <div class="h-8 w-8 rounded-full bg-muted" />
        </div>
      </div>

      <!-- App content (always in DOM for SSR, hidden via class) -->
      <div
        :class="{ invisible: !showContent }"
        class="transition-opacity duration-200"
        :style="{ opacity: showContent ? 1 : 0 }"
      >
        <NuxtLayout>
          <NuxtPage />
          <CroutonForm />
        </NuxtLayout>
      </div>
    </div>
  </UApp>
</template>
