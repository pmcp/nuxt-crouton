<script setup lang="ts">
/**
 * Contact page — main school info + locations grid.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const locale = computed(() => String(route.params.locale))

const { data: locations } = await useFetch('/api/public/locations')

// Try to load CMS content for contact page
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
const otherLocations = computed(() =>
  (locations.value || []).filter((l: any) => !l.isMain)
)

useHead({
  title: 'Contact — Sint-Lukas Academie'
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="text-3xl sm:text-4xl font-bold text-neutral-900 mb-10">Contact</h1>

    <!-- Main school -->
    <section v-if="mainLocation" class="mb-16">
      <h2 class="text-lg font-bold uppercase tracking-wider text-neutral-500 mb-6">Hoofdschool</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <p class="text-neutral-700 leading-relaxed">
            {{ mainLocation.street }}<br>
            {{ mainLocation.zip }} {{ mainLocation.city }}
          </p>
          <div class="mt-4 space-y-1 text-sm text-neutral-600">
            <p>Algemene info: <a href="mailto:info.academie@sintlukas.brussels" class="text-sintlukas-600 hover:underline">info.academie@sintlukas.brussels</a></p>
            <p>Tel: <a href="tel:+3222177700" class="text-sintlukas-600 hover:underline">02 217 77 00</a></p>
          </div>

          <!-- CMS content for additional info -->
          <div
            v-if="page?.contentHtml"
            class="prose prose-sm prose-neutral mt-6"
            v-html="page.contentHtml"
          />
        </div>

        <!-- Map placeholder -->
        <div v-if="mainLocation.location" class="aspect-video rounded-xl overflow-hidden bg-neutral-100">
          <CroutonMapsEmbed v-if="mainLocation.location" :location="mainLocation.location" class="size-full" />
        </div>
      </div>
    </section>

    <!-- Other locations -->
    <section v-if="otherLocations.length">
      <h2 class="text-lg font-bold uppercase tracking-wider text-neutral-500 mb-6">Vestigingen</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <SiteLocationCard
          v-for="location in otherLocations"
          :key="location.id"
          :title="t(location, 'title')"
          :street="location.street"
          :zip="location.zip"
          :city="location.city"
        />
      </div>
    </section>
  </div>
</template>
