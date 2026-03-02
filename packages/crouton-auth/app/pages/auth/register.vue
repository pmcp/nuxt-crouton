<script setup lang="ts">
/**
 * Register Page — Redirect to home and open auth modal.
 *
 * Auth flows now use the RouteModal overlay. Direct URL access
 * (e.g. /auth/register) redirects to "/" and opens the modal there.
 */
definePageMeta({
  middleware: 'guest'
})

const route = useRoute()
const authModal = useAuthModal()

onMounted(async () => {
  const redirectTo = (route.query.redirect as string) || '/'
  await navigateTo('/', { replace: true })
  authModal.open('register', redirectTo, '/')
})
</script>

<template>
  <div />
</template>
