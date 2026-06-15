<script setup lang="ts">
/**
 * Aanbod / Courses overview — faithful port of original.
 * Banner title, 4-column grid with divider, sidebar courses sticky.
 * Course cards: flat colored bg + centered white text.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const locale = computed(() => String(route.params.locale))

const { data: ateliers } = await useFetch('/api/public/ateliers')
const { data: categories } = await useFetch('/api/public/categories')

function t(item: any, field: string): string {
  const translations = item?.translations as Record<string, Record<string, any>> | undefined
  const localeVal = translations?.[locale.value]?.[field]
  if (localeVal) return String(localeVal)
  return String(item?.[field] || '')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Build flat course list like the original, preserving category info and `first` flag
const courses = computed(() => {
  const cats = [...(categories.value || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  const items = ateliers.value || []
  const result: any[] = []

  for (const cat of cats) {
    const catAteliers = items.filter((a: any) => a.category === cat.id)
    catAteliers.forEach((atelier: any, idx: number) => {
      result.push({
        ...atelier,
        catColor: cat.color,
        catTitle: t(cat, 'title'),
        catSide: cat.isSidebar || false,
        first: idx === 0
      })
    })
  }
  return result
})

const mainCourses = computed(() => courses.value.filter((c: any) => !c.catSide))
const sideCourses = computed(() => courses.value.filter((c: any) => c.catSide))

useHead({
  title: 'Aanbod — Sint-Lukas Academie'
})
</script>

<template>
  <div class="background-grid">
    <!-- Banner -->
    <div class="w-full relative mb-12 md:mb-16 z-0 h-60">
      <div class="absolute z-30 h-full w-full pt-8 sm:pt-16 top-0">
        <div class="text-4xl leading-tight h-auto whitespace-pre-line mx-auto px-6 lg:px-8 max-w-7xl">
          Vind jouw atelier.
Ontdek onze extra muros projecten.
        </div>
      </div>
    </div>

    <!-- Course grid: main courses + divider + sidebar courses -->
    <div class="mx-auto px-6 lg:px-8 max-w-7xl grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-cols-[1fr_1fr_1px_1fr] gap-16">
      <!-- Main courses (2 col) -->
      <div class="w-full col-span-full md:col-span-full lg:col-span-2 grid grid-cols-1 md:grid-cols-2 w-full items-end gap-8 max-w-2xl">
        <SiteAtelierCard
          v-for="c in mainCourses"
          :key="c.id"
          :title="t(c, 'title')"
          :age="t(c, 'age') || null"
          :show-subtitle="c.first"
          :card-image="c.cardImage || c.mainImage"
          :category-color="c.catColor"
          :slug="slugify(t(c, 'title'))"
          :locale="locale"
          :first="c.first"
          :category-name="c.catTitle"
        />
      </div>

      <!-- Vertical divider -->
      <div v-if="sideCourses.length" class="bg-black h-full w-full" style="max-width: 1px;" />

      <!-- Sidebar courses (sticky) -->
      <div v-if="sideCourses.length" class="col-span-full md:col-span-full lg:col-span-1 xl:col-span-1 flex flex-col md:flex-row lg:flex-col w-full gap-8 self-start sticky top-24">
        <SiteAtelierCard
          v-for="c in sideCourses"
          :key="c.id"
          :title="t(c, 'title')"
          :age="t(c, 'age') || null"
          :show-subtitle="c.first"
          :card-image="c.cardImage || c.mainImage"
          :category-color="c.catColor"
          :slug="slugify(t(c, 'title'))"
          :locale="locale"
          :first="c.first"
          :category-name="c.catTitle"
        />
      </div>

      <div class="h-4" />
    </div>
  </div>
</template>
