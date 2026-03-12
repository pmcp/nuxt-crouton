<script setup lang="ts">
/**
 * Aanbod / Courses overview page.
 * Grid of atelier cards grouped by category.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const locale = computed(() => String(route.params.locale))

const { data: ateliers } = await useFetch('/api/public/ateliers')
const { data: categories } = await useFetch('/api/public/categories')

// Helper: get translated field
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

// Group ateliers by category
const groupedAteliers = computed(() => {
  const cats = categories.value || []
  const items = ateliers.value || []

  return cats
    .map((cat: any) => ({
      ...cat,
      title: t(cat, 'title'),
      ateliers: items.filter((a: any) => a.category === cat.id)
    }))
    .filter((group: any) => group.ateliers.length > 0)
})

useHead({
  title: 'Aanbod — Sint-Lukas Academie'
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">
      Vind jouw atelier.
    </h1>
    <p class="text-lg text-neutral-500 mb-12">
      Ontdek onze extra muros projecten.
    </p>

    <div v-for="group in groupedAteliers" :key="group.id" class="mb-14">
      <h2
        class="text-xl font-bold uppercase tracking-wider mb-6"
        :style="{ color: group.color || '#0d9488' }"
      >
        {{ group.title }}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <SiteAtelierCard
          v-for="atelier in group.ateliers"
          :key="atelier.id"
          :title="t(atelier, 'title')"
          :age="t(atelier, 'age') || null"
          :card-image="atelier.cardImage || atelier.mainImage"
          :category-color="group.color"
          :slug="slugify(t(atelier, 'title'))"
          :locale="locale"
        />
      </div>
    </div>

    <p v-if="!groupedAteliers.length" class="text-neutral-400">
      Geen ateliers gevonden.
    </p>
  </div>
</template>
