<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

useHead({ title: 'Nieuwe werkvergunning — KVR' })

const items: string[] = []
const activeItem = {}
const collection = 'kvrWerkvergunningens'
const loading = 'notLoading'
const action = 'create' as const
</script>

<template>
  <div class="min-h-screen bg-[#e8e8e8] py-6 text-neutral-900">
    <div class="max-w-4xl mx-auto mb-3 flex items-center justify-between px-4 text-sm">
      <NuxtLink to="/" class="text-neutral-600 hover:text-neutral-900">← Terug</NuxtLink>
    </div>
    <KvrWerkvergunningensForm
      :items="items"
      :active-item="activeItem"
      :collection="collection"
      :loading="loading"
      :action="action"
    />
  </div>
</template>
