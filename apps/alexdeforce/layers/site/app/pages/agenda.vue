<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: events } = await useFetch('/api/public/agenda')

const now = new Date().toISOString().split('T')[0]

const upcoming = computed(() =>
  (events.value || [])
    .filter(e => e.date && e.date >= now)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
)

const past = computed(() =>
  (events.value || [])
    .filter(e => e.date && e.date < now)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
)

function formatDate(date: string | null) {
  if (!date) return ''
  return date.split('T')[0]
}
</script>

<template>
  <div>
    <section v-if="upcoming.length" class="mb-10">
      <h2 class="text-lg mb-1">Binnenkort</h2>
      <ul>
        <li v-for="event in upcoming" :key="event.id" class="py-1">
          <span class="text-xs text-gray-400 mr-2">{{ formatDate(event.date) }}</span>
          <span class="inline-block border-b-2 border-white hover:border-black pt-1 transition-colors">
            {{ event.title }}
          </span>
        </li>
      </ul>
    </section>

    <section v-if="past.length">
      <h2 class="text-lg mb-1">Afgelopen</h2>
      <ul>
        <li v-for="event in past" :key="event.id" class="py-1">
          <span class="text-xs text-gray-400 mr-2">{{ formatDate(event.date) }}</span>
          <span>{{ event.title }}</span>
        </li>
      </ul>
    </section>

    <p v-if="!events?.length" class="text-sm text-gray-400">
      No events yet.
    </p>
  </div>
</template>
