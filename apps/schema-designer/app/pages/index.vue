<script setup lang="ts">
// Redirect to schema designer main page
const router = useRouter()

onMounted(() => {
  router.replace('/schema-designer')
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
  </div>
</template>
