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

const pdfLinks = [
  { label: 'Jaarkalender 2025-2026', href: '#' },
  { label: 'Algemene informatie voor studenten', href: '#' },
  { label: 'Artistiek Pedagogisch Project', href: '#' },
  { label: 'Academie reglement', href: '#' },
  { label: 'Lees ons taalbeleid', href: '#' },
  { label: 'Evaluatiereglement', href: '#' }
]

useHead({
  title: 'Onze academie — Sint-Lukas Academie'
})
</script>

<template>
  <div>
    <!-- Banner image -->
    <div class="w-full relative mb-12 md:mb-16 z-0 h-96">
      <img
        src="/assets/uploads/banner-academie.jpg"
        alt="Onze academie"
        class="h-full w-full object-cover object-center relative z-20"
      />
    </div>

    <!-- Content -->
    <div class="mx-auto px-6 lg:px-8 max-w-7xl grid grid-cols-1 gap-8">
      <h1 class="text-4xl pb-0">Onze academie</h1>

      <div
        v-if="page?.contentHtml"
        class="prose prose-neutral max-w-none"
        v-html="page.contentHtml"
      />
      <div v-else class="grid md:grid-cols-2 gap-4 md:gap-0">
        <!-- Left column: description + aanbod link -->
        <div class="prose prose-neutral pr-0 md:pr-8">
          <p>
            Sint-Lukas Academie is al sinds 1880 dé plek voor beeldende kunsten in Brussel.
            Wij bieden een breed aanbod aan voor kinderen, jongeren en volwassenen.
            Met ateliers voor tekenen, schilderen, beeldhouwen, grafiek, textiel, fotografie,
            digitale kunst en meer, is er voor iedereen iets te ontdekken.
          </p>
          <NuxtLink
            :to="`/${locale}/aanbod`"
            class="inline-flex items-center gap-2 no-underline font-semibold text-primary hover:underline"
          >
            Aanbod &rarr;
          </NuxtLink>
        </div>

        <!-- Right column: info text + PDF downloads -->
        <div class="border-l-0 md:border-l md:pl-8">
          <div class="prose prose-neutral">
            <p>
              Onze academie hecht veel belang aan een warme, creatieve leeromgeving
              waar iedereen zich kan ontwikkelen op eigen tempo. Hieronder vind je
              alle belangrijke documenten.
            </p>
          </div>
          <ul class="mt-4 space-y-2">
            <li v-for="pdf in pdfLinks" :key="pdf.label">
              <a
                :href="pdf.href"
                target="_blank"
                class="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <UIcon name="i-heroicons-document-arrow-down" class="size-4 shrink-0" />
                {{ pdf.label }}
              </a>
            </li>
          </ul>
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
            :location="(location as any).location"
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
