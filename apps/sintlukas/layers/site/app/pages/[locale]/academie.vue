<script setup lang="ts">
/**
 * Academie page — faithful port of original.
 * Banner image, title + text with sidebars, background-grid separator,
 * vestigingen + team in 2-column grid.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const locale = computed(() => String(route.params.locale))

const { data: persons } = await useFetch('/api/public/persons')
const { data: locations } = await useFetch('/api/public/locations')
const { data: page } = await useFetch('/api/public/pages/academie')

function t(item: any, field: string): string {
  const translations = item?.translations as Record<string, Record<string, any>> | undefined
  const localeVal = translations?.[locale.value]?.[field]
  if (localeVal) return String(localeVal)
  return String(item?.[field] || '')
}

useHead({
  title: 'Onze academie — Sint-Lukas Academie'
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

    <!-- Content -->
    <div class="mx-auto px-6 lg:px-8 max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-16">
      <div class="flex flex-col col-span-full md:col-span-2">
        <h1 class="text-4xl pb-0">Academie</h1>
        <div
          v-if="page?.contentHtml"
          class="prose prose-neutral max-w-none mt-4"
          v-html="page.contentHtml"
        />
        <div v-else class="prose prose-neutral max-w-3xl mt-4">
          <p>
            Sint-Lukas Academie is al sinds 1880 dé plek voor beeldende kunsten in Brussel.
            Wij bieden een breed aanbod aan voor kinderen, jongeren en volwassenen.
          </p>
        </div>
      </div>
    </div>

    <!-- Background grid separator -->
    <div class="mt-8">
      <div class="background-grid" style="width: 300vw; position: absolute; left: -100vw; height: 99999px;" />
    </div>

    <!-- Vestigingen + Team -->
    <div class="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-[1] pt-16 grid grid-cols-2 gap-16">
      <div class="col-span-full lg:col-span-1">
        <div class="uppercase text-sm font-bold pb-4">Vestigingen</div>
        <div v-if="locations?.length" class="grid gap-4">
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

      <div class="col-span-full lg:col-span-1">
        <div class="uppercase text-sm font-bold pb-4">Team</div>
        <div v-if="persons?.length" class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SitePersonCard
            v-for="person in persons"
            :key="person.id"
            :first-name="person.firstName"
            :last-name="person.lastName"
            :role="person.role"
            :image="person.image"
          />
        </div>
      </div>

      <div class="h-8" />
    </div>
  </div>
</template>
