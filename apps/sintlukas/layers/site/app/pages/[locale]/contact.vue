<script setup lang="ts">
/**
 * Contact page — faithful port of original.
 * Banner image, 5-column grid: contact info + map, then all vestigingen.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const locale = computed(() => String(route.params.locale))

const { data: locations } = await useFetch('/api/public/locations')
const { data: page } = await useFetch('/api/public/pages/contact')

function t(item: any, field: string): string {
  const translations = item?.translations as Record<string, Record<string, any>> | undefined
  const localeVal = translations?.[locale.value]?.[field]
  if (localeVal) return String(localeVal)
  return String(item?.[field] || '')
}

const mainLocation = computed(() =>
  (locations.value || []).find((l: any) => l.isMain)
)

// Parse main location coordinates for map [lng, lat]
const mainMapCenter = computed<[number, number] | null>(() => {
  const loc = mainLocation.value?.location
  if (!loc || typeof loc !== 'string') return null
  const parts = loc.split(',').map(Number)
  if (parts.length !== 2 || parts.some(isNaN)) return null
  return [parts[1], parts[0]] // [lng, lat]
})

useHead({
  title: 'Contact — Sint-Lukas Academie'
})
</script>

<template>
  <div>
    <!-- Banner -->
    <div class="w-full relative mb-12 md:mb-16 z-0 h-96">
      <img
        src="/assets/uploads/banner-contact.jpg"
        alt="Contact banner"
        class="absolute inset-0 h-full w-full object-cover"
      >
      <div class="absolute z-30 h-full w-full pt-8 sm:pt-16 top-0">
        <div class="text-4xl leading-tight h-auto whitespace-pre-line mx-auto px-6 lg:px-8 max-w-7xl" />
      </div>
    </div>

    <!-- Main contact info + map (5-col grid like original) -->
    <div class="mx-auto px-6 lg:px-8 max-w-7xl">
      <div class="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-5 gap-8">
        <div class="flex flex-col col-span-full md:col-span-2 gap-8">
          <h1 class="text-4xl pb-0">Contact</h1>
          <div
            v-if="page?.contentHtml"
            class="prose"
            v-html="page.contentHtml"
          />
          <div v-else class="prose">
            <h3>HOOFDSCHOOL</h3>
            <p>
              Groenstraat 156,<br>
              1030 Brussel (Schaarbeek)
            </p>
            <p>
              Algemene info:<br>
              <a href="mailto:info.academie@sintlukas.brussels">info.academie@sintlukas.brussels</a><br>
              02 217 77 00
            </p>
            <p>
              Directie:<br>
              <a href="mailto:academie@sintlukas.brussels">academie@sintlukas.brussels</a>
            </p>
            <p>Welkom op het secretariaat:</p>
            <ul>
              <li><strong>maandag, dinsdag en donderdag</strong> van 08:40 tot 21:00</li>
              <li><strong>woensdag en vrijdag</strong> van 08:40 tot 17:00 uur</li>
            </ul>
            <p>
              De Academie ligt op wandelafstand van het Brussel Noord station en is bereikbaar via
              tramlijnen T3, T4, T55, T25 , T94, M Rogier, M Kruidtuin.
            </p>
          </div>
        </div>

        <!-- Map -->
        <div class="relative h-80 col-span-full md:h-full md:col-start-3 lg:col-start-3 my-8 md:my-0">
          <client-only>
            <CroutonMapsMap
              v-if="mainMapCenter"
              :center="mainMapCenter"
              :zoom="15"
              height="100%"
              width="100%"
            >
              <template #default="{ map }">
                <CroutonMapsMarker
                  v-if="map"
                  :map="map as any"
                  :position="mainMapCenter!"
                />
              </template>
            </CroutonMapsMap>
          </client-only>
        </div>
      </div>
    </div>

    <!-- All vestigingen -->
    <div class="mx-auto px-6 lg:px-8 max-w-7xl relative z-[1] pt-16 grid grid-cols-2 gap-8">
      <div class="col-span-full lg:col-span-full">
        <div class="uppercase text-sm font-bold pb-4">Vestigingen</div>
        <div v-if="locations?.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SiteLocationCard
            v-for="location in locations"
            :key="location.id"
            :title="t(location, 'title')"
            :street="location.street"
            :zip="location.zip"
            :city="location.city"
            :is-main="location.isMain"
            :location="(location as any).location"
          />
        </div>
      </div>
    </div>
    <div class="h-8" />
  </div>
</template>
