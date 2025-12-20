<script setup lang="ts">
definePageMeta({
  title: 'Blog Posts',
  middleware: ['auth'] // Requires login
})
</script>

<template>
  <UContainer class="py-8">
    <!-- Uses the generated CroutonCollection component -->
    <BlogPostsList />
  </UContainer>
</template>