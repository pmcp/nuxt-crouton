<script setup lang="ts">
definePageMeta({
  title: 'Register',
  layout: false
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="w-full max-w-md p-8">
      <h1 class="text-2xl font-bold text-center mb-8">Register</h1>
      <AuthRegisterForm />
      <p class="mt-4 text-center text-sm text-muted">
        Already have an account?
        <NuxtLink to="/login" class="text-primary">Login</NuxtLink>
      </p>
    </div>
  </div>
</template>