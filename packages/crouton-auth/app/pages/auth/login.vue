<script setup lang="ts">
/**
 * Login Page — Redirect to home and open auth modal.
 *
 * Auth flows now use the RouteModal overlay. Direct URL access
 * (e.g. /auth/login) redirects to "/" and opens the modal there.
 */
definePageMeta({
  middleware: 'guest'
})

const route = useRoute()
const authModal = useAuthModal()

onMounted(async () => {
  const redirectTo = (route.query.redirect as string) || '/'
  await navigateTo('/', { replace: true })
  authModal.open('login', redirectTo, '/')
})
</script>

<template>
  <div />
</template>
