<script setup lang="ts">
definePageMeta({
  title: 'Login',
  layout: false
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="w-full max-w-md p-8">
      <h1 class="text-2xl font-bold text-center mb-8">Login</h1>
      <AuthLoginForm />
      <p class="mt-4 text-center text-sm text-muted">
        Don't have an account?
        <NuxtLink to="/register" class="text-primary">Register</NuxtLink>
      </p>
    </div>
  </div>
</template>