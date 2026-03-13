<script setup lang="ts">
/**
 * Sint-Lukas Homepage — faithful port of original.
 * Background-grid hero with animated SVG banner,
 * News + Aanbod split with divider, About section, Calendar section.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const locale = computed(() => String(route.params.locale))

const { data: ateliers } = await useFetch('/api/public/ateliers')
const { data: categories } = await useFetch('/api/public/categories')
const { data: news } = await useFetch('/api/public/news')

function t(item: any, field: string): string {
  const translations = item?.translations as Record<string, Record<string, any>> | undefined
  const localeVal = translations?.[locale.value]?.[field]
  if (localeVal) return String(localeVal)
  return String(item?.[field] || '')
}

// Sort categories by order
const sortedCategories = computed(() =>
  [...(categories.value || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
)

// Latest news (first 3)
const latestNews = computed(() => {
  const items = news.value || []
  return [...items]
    .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 3)
})

useHead({
  title: 'Sint-Lukas Academie — Beeldende kunsten in Brussel'
})
</script>

<template>
  <div>
    <!-- BLOCK: BANNER with grid background -->
    <div class="w-full background-grid md:mt-8 mb-8 md:mb-12 !pl-0">
      <div class="mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <div class="grid grid-rows-2 grid-cols-1 md:grid-cols-2 md:grid-rows-1 w-full gap-8 items-center md:justify-center">
          <span class="md:w-full text-4xl md:text-4xl leading-tight">
            Dé academie voor beeldende kunsten in hartje Brussel
          </span>
          <client-only>
            <SvgAnimatedBanner />
          </client-only>
        </div>
      </div>
    </div>

    <!-- Main content grid: News + Aanbod -->
    <div class="mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
      <div class="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-16">
        <div class="col-span-full grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-8">

          <!-- BLOCK: NEWS -->
          <div v-if="latestNews.length" class="flex flex-col gap-4 col-span-1">
            <span class="uppercase font-bold tracking-wider">Nieuws</span>
            <div class="flex flex-col gap-4 border-b pb-4 md:pb-6">
              <div v-for="article in latestNews" :key="article.id" class="grid grid-cols-8 gap-4 w-full">
                <div class="col-span-2 min-w-20 w-full h-full bg-sintlukas-100 rounded-none" />
                <div class="col-span-6 inline-flex flex-col md:gap-2 justify-center">
                  <div class="text-xs text-gray-500">{{ article.date }}</div>
                  <span class="text-xl">{{ t(article, 'title') }}</span>
                  <div class="text-sm text-gray-600">{{ t(article, 'text') }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Vertical divider -->
          <div class="h-full bg-black w-full" style="max-width: 1px;" />

          <!-- BLOCK: AANBOD (categories) -->
          <div class="flex flex-col gap-4 col-span-1">
            <span class="uppercase font-bold tracking-wider">Aanbod</span>
            <div class="text-2xl">Vind jouw atelier</div>
            <div class="flex flex-col gap-2 mt-8 sticky top-28">
              <NuxtLink
                v-for="cat in sortedCategories"
                :key="cat.id"
                :to="`/${locale}/aanbod`"
                class="text-4xl uppercase font-bold px-2 inline-block"
                :style="{ backgroundColor: cat.color || '#3e8b6f' }"
              >
                {{ t(cat, 'title') }}
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- BLOCK: ABOUT -->
        <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="col-span-1">
            <div class="sticky top-28 flex flex-col gap-2">
              <span class="uppercase font-bold tracking-wider">Academie</span>
              <span class="text-2xl">Sint-Lukas is een bruisende plek in het hart van Brussel, al sinds 1880.</span>
              <span class="prose">Dé academie voor beeldende kunsten: voor kinderen, jongeren en volwassenen.</span>
              <UButton
                :to="`/${locale}/academie`"
                color="neutral"
                variant="outline"
                class="rounded-none w-fit mt-4 font-bold"
              >
                Meer over de academie
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Background grid separator -->
    <div class="mt-8">
      <div class="background-grid" style="width: 300vw; position: absolute; left: -100vw; height: 99999px;" />
    </div>

    <!-- BLOCK: CALENDAR -->
    <div class="mx-auto px-0 md:px-6 lg:px-8 max-w-7xl relative z-[1]">
      <div class="grid grid-cols-2 mt-16 col-span-2">
        <div class="col-span-full md:col-span-1 bg-white p-4 md:p-4 grid gap-4">
          <span class="uppercase font-bold tracking-wider">Kalender</span>
          <div>Bekijk onze jaarkalender voor alle belangrijke data.</div>
          <UButton
            :to="`/${locale}/contact`"
            color="neutral"
            class="w-fit rounded-none font-bold bg-sintlukas-200 hover:bg-sintlukas-400 text-black"
          >
            Bekijk kalender
          </UButton>
        </div>
      </div>
      <div class="h-8" />
    </div>
  </div>
</template>
