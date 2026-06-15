<script setup lang="ts">
const { data: events } = await useFetch('/api/public/agenda')

const now = new Date()
now.setHours(0, 0, 0, 0)

const upcoming = computed(() =>
  (events.value || [])
    .filter(e => e.date && new Date(e.date) >= now)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
)

const past = computed(() =>
  (events.value || [])
    .filter(e => e.date && new Date(e.date) < now)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
)

function formatDate(date: string | number | null) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}
</script>

<template>
  <div>
    <div>
      <h2 class="text-lg mb-1">Binnenkort</h2>
      <ul v-if="upcoming.length">
        <li v-for="event in upcoming" :key="event.id" class="py-1">
          <NuxtLink
            :to="`/agenda/${event.id}`"
            class="inline-block border-b-2 border-white hover:border-black pt-1"
          >
            <span v-if="event.date">{{ formatDate(event.date) }} - </span>{{ event.title }}
          </NuxtLink>
        </li>
      </ul>
      <div v-else>No upcoming events</div>
    </div>

    <div class="mt-10">
      <h2 class="text-lg mb-1">Afgelopen</h2>
      <ul v-if="past.length">
        <li v-for="event in past" :key="event.id" class="py-1">
          <NuxtLink
            :to="`/agenda/${event.id}`"
            class="inline-block border-b-2 border-white hover:border-black pt-1"
          >
            <span v-if="event.date">{{ formatDate(event.date) }} - </span>{{ event.title }}
          </NuxtLink>
        </li>
      </ul>
      <div v-else>No passed events</div>
    </div>
  </div>
</template>
