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

useHead({
  title: 'Contact — Sint-Lukas Academie'
})
</script>

<template>
  <div>
    <!-- Banner -->
    <div class="w-full relative mb-12 md:mb-16 z-0 h-60">
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
          <div v-else-if="mainLocation" class="prose">
            <p>
              {{ mainLocation.street }}<br>
              {{ mainLocation.zip }} {{ mainLocation.city }}
            </p>
          </div>
        </div>

        <!-- Map -->
        <div class="relative h-80 col-span-full md:h-full md:col-start-3 lg:col-start-3 my-8 md:my-0">
          <CroutonMapsEmbed
            v-if="mainLocation?.location"
            :location="mainLocation.location"
            class="h-full w-full"
          />
        </div>
      </div>
    </div>

    <!-- All vestigingen -->
    <div class="mx-auto px-6 lg:px-8 max-w-7xl relative z-[1] pt-16 grid grid-cols-2 gap-8">
      <div class="col-span-full lg:col-span-full">
        <div class="uppercase text-sm font-bold pb-4">Vestigingen</div>
        <div v-if="locations?.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SiteLocationCard
            v-for="location in locations"
            :key="location.id"
            :title="t(location, 'title')"
            :street="location.street"
            :zip="location.zip"
            :city="location.city"
            :is-main="location.isMain"
          />
        </div>
      </div>
    </div>
    <div class="h-8" />
  </div>
</template>
