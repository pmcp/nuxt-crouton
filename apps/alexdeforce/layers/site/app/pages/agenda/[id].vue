<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

const { data: event, error } = await useFetch(`/api/public/agenda/${id}`)

if (error.value) {
  throw createError({ status: 404, statusText: 'Event not found' })
}

useHead({
  title: event.value?.title ? `${event.value.title} — Alex Deforce` : 'Alex Deforce'
})

function formatDate(date: string | number | null) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}
</script>

<template>
  <div v-if="event" class="pmcp-article">
    <NuxtLink to="/agenda" class="text-sm inline-block border-b-2 border-white hover:border-black mb-5">
      ← Overzicht agenda
    </NuxtLink>

    <h1 class="pb-5 pt-1"><span class="text-xl">{{ event.title }}</span></h1>

    <p v-if="event.date" class="text-sm text-gray-500 mb-4">{{ formatDate(event.date) }}</p>

    <div v-if="event.contentHtml" class="prose prose-sm prose-p:font-medium" v-html="event.contentHtml" />
  </div>
</template>
