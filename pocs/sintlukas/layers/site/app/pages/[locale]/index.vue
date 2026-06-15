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

// Pick showcase images from ateliers for the academie section
const academieImages = computed(() => {
  const items = ateliers.value || []
  const images: string[] = []
  for (const atelier of items) {
    const gallery = Array.isArray((atelier as any).images) ? (atelier as any).images : []
    for (const img of gallery) {
      if (images.length < 3 && img) images.push(img)
      if (images.length >= 3) break
    }
    if (images.length >= 3) break
  }
  return images
})

// Map category title to SVG banner filename
function categoryBannerUrl(title: string): string {
  // Capitalize first letter to match filenames like "Kinderen", "Jongeren", etc.
  const name = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()
  return `/assets/aanbod/Banner aanbod 600x60px_${name}.svg`
}

// Format date to Dutch locale (e.g. "29 januari 2026")
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// Clean and truncate text (remove YAML artifacts like `|-`, trim, and cap at 120 chars)
function truncateText(text: string, maxLength = 120): string {
  const cleaned = text.replace(/^\|-?\s*/, '').trim()
  if (!cleaned) return ''
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength).trimEnd() + '…'
}

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
                <div class="col-span-2 min-w-20 w-full h-full bg-sintlukas-100 rounded-none overflow-hidden">
                  <img v-if="article.image" :src="article.image" :alt="t(article, 'title')" class="w-full h-full object-cover">
                </div>
                <div class="col-span-6 inline-flex flex-col md:gap-2 justify-center">
                  <div class="text-xs text-gray-500">{{ formatDate(article.date) }}</div>
                  <span class="text-xl">{{ t(article, 'title') }}</span>
                  <div class="text-sm text-gray-600">{{ truncateText(t(article, 'text')) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Vertical divider -->
          <div class="h-full bg-black w-full" style="max-width: 1px;" />

          <!-- BLOCK: AANBOD (categories) -->
          <div class="flex flex-col gap-4 col-span-1">
            <span class="uppercase font-bold tracking-wider">Aanbod</span>
            <div class="text-2xl">Ontmoetingsplaats tussen disciplines, artistieke processen, leeftijden en culturen.</div>
            <div class="flex flex-col gap-2 mt-8 sticky top-28">
              <NuxtLink
                v-for="cat in sortedCategories"
                :key="cat.id"
                :to="`/${locale}/aanbod`"
                class="block"
              >
                <span
                  class="text-4xl uppercase font-bold px-2 inline-block"
                  :style="{
                    backgroundColor: cat.color || '#3e8b6f',
                    backgroundImage: `url('${categoryBannerUrl(t(cat, 'title'))}')`,
                    backgroundSize: 'contain',
                  }"
                >
                  {{ t(cat, 'title') }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- BLOCK: ABOUT -->
        <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Row 1: Two images side by side (full width) -->
          <div v-if="academieImages.length >= 2" class="grid grid-cols-2 col-span-1 md:col-span-2 gap-2 md:gap-8">
            <div class="overflow-hidden">
              <img :src="academieImages[0]" alt="" class="w-full h-full object-cover object-center">
            </div>
            <div class="overflow-hidden">
              <img :src="academieImages[1]" alt="" class="w-full h-full object-cover object-center">
            </div>
          </div>
          <!-- Row 2 left: Text -->
          <div class="col-span-1">
            <div class="sticky top-28 flex flex-col gap-2">
              <span class="uppercase font-bold tracking-wider">Academie</span>
              <span class="text-2xl">Deeltijds kunstonderwijs voor volwassenen, jongeren en kinderen</span>
              <span class="prose">De Sint-Lukas academie is een instelling van het deeltijds kunstonderwijs (DKO). We richten ons op kinderen (6 tot 12 jaar), jongeren (12 tot 18 jaar) en volwassenen (18+) die in hun vrije tijd de mogelijkheden van de beeldende kunsten willen verkennen. Wij bieden u, geheel naar onze unieke pedagogie, kwalitatief onderwijs op maat in creatieve opleidingen.</span>
            </div>
          </div>
          <!-- Row 2 right: Image -->
          <div v-if="academieImages.length >= 3" class="col-span-1 h-fit overflow-hidden">
            <img :src="academieImages[2]" alt="" class="w-full h-full object-cover object-center">
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
          <div>Blijf op de hoogte van al onze evenementen, toonmomenten, uitstappen en sluitingsdagen.</div>
          <UButton
            to="https://timetreeapp.com/public_calendars/sintlukasacademie"
            target="_blank"
            color="neutral"
            class="w-fit rounded-none font-bold bg-sintlukas-200 hover:bg-sintlukas-400 text-black"
          >
            Kalender bekijken
          </UButton>
          <iframe
            src="https://timetreeapp.com/public_calendars/sintlukasacademie"
            class="w-full border-0 mt-2"
            style="min-height: 400px;"
            loading="lazy"
            title="Sint-Lukas Academie kalender"
          />
        </div>
        <div class="self-stretch hidden md:block">
          <SvgCalendarIllustration class="col-span-1 h-full p-20 relative -left-40 lg:left-0" />
        </div>
      </div>
      <div class="h-8" />
    </div>
  </div>
</template>
