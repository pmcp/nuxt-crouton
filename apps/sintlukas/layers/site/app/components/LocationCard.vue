<script setup lang="ts">
const props = defineProps<{
  title: string
  street: string
  zip: string
  city: string
  isMain?: boolean
  location?: string | null
}>()

// Location is stored as "lat,lng" string
const parsedLocation = computed(() => {
  if (!props.location) return null
  const parts = props.location.split(',').map(Number)
  if (parts.length !== 2 || parts.some(isNaN)) return null
  return { lat: parts[0], lng: parts[1] }
})

// Mapbox expects [lng, lat] order
const mapCenter = computed<[number, number] | null>(() => {
  if (!parsedLocation.value) return null
  return [parsedLocation.value.lng, parsedLocation.value.lat]
})

const googleMapsUrl = computed(() => {
  if (!parsedLocation.value) return null
  return `https://maps.google.com/?ll=${parsedLocation.value.lat},${parsedLocation.value.lng}`
})
</script>

<template>
  <div class="bg-white rounded-none border border-neutral-200 p-5">
    <h3 class="font-semibold text-neutral-900 mb-2">{{ title }}</h3>
    <p class="text-sm text-neutral-600 leading-relaxed">
      {{ street }}<br>
      {{ zip }} {{ city }}
    </p>
    <UBadge v-if="isMain" color="primary" variant="subtle" size="xs" class="mt-3">
      Hoofdschool
    </UBadge>

    <!-- Map embed -->
    <div v-if="mapCenter" class="mt-4">
      <div class="h-40 w-full overflow-hidden border border-neutral-200">
        <client-only>
          <CroutonMapsMap
            :center="mapCenter"
            :zoom="14"
            height="160px"
            width="100%"
          >
            <template #default="{ map }">
              <CroutonMapsMarker
                v-if="map"
                :map="map as any"
                :position="mapCenter!"
              />
            </template>
          </CroutonMapsMap>
        </client-only>
      </div>
      <a
        v-if="googleMapsUrl"
        :href="googleMapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
      >
        Bekijk in Google Maps
      </a>
    </div>
  </div>
</template>
