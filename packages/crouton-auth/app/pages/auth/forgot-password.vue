<script setup lang="ts">
/**
 * Forgot Password Page — Redirect to home and open auth modal.
 *
 * Auth flows now use the RouteModal overlay. Direct URL access
 * (e.g. /auth/forgot-password) redirects to "/" and opens the modal there.
 */
definePageMeta({
  middleware: 'guest'
})

const authModal = useAuthModal()

onMounted(async () => {
  await navigateTo('/', { replace: true })
  authModal.open('forgot-password', '/', '/')
})
</script>

<template>
  <div />
</template>
