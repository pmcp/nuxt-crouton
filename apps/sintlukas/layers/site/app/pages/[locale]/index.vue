<script setup lang="ts">
/**
 * Sint-Lukas Homepage
 * Hero section, ateliers preview, category links, academie section.
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

// Slugify for links
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Featured ateliers (first 3)
const featuredAteliers = computed(() => (ateliers.value || []).slice(0, 3))

// Sidebar vs main categories
const mainCategories = computed(() =>
  (categories.value || []).filter((c: any) => !c.isSidebar)
)
const sidebarCategories = computed(() =>
  (categories.value || []).filter((c: any) => c.isSidebar)
)

useHead({
  title: 'Sint-Lukas Academie — Beeldende kunsten in Brussel'
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative bg-sintlukas-50 py-16 sm:py-24 overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-sintlukas-900 max-w-3xl leading-tight">
          Dé academie voor beeldende kunsten in hartje Brussel
        </h1>
      </div>
    </section>

    <!-- Ateliers Preview -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-8">Ateliers</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div
          v-for="atelier in featuredAteliers"
          :key="atelier.id"
          class="aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100"
        >
          <NuxtLink :to="`/${locale}/aanbod/${slugify(t(atelier, 'title'))}`" class="block size-full">
            <img
              v-if="atelier.cardImage || atelier.mainImage"
              :src="`/images/${atelier.cardImage || atelier.mainImage}`"
              :alt="t(atelier, 'title')"
              class="size-full object-cover hover:scale-105 transition-transform duration-300"
            >
          </NuxtLink>
        </div>
      </div>

      <!-- Category links -->
      <div class="space-y-1">
        <NuxtLink
          v-for="cat in mainCategories"
          :key="cat.id"
          :to="`/${locale}/aanbod`"
          class="block text-2xl sm:text-3xl font-bold hover:opacity-70 transition-opacity"
          :style="{ color: cat.color || '#0d9488' }"
        >
          {{ t(cat, 'title') }}
        </NuxtLink>
      </div>
      <div v-if="sidebarCategories.length" class="flex gap-6 mt-4">
        <NuxtLink
          v-for="cat in sidebarCategories"
          :key="cat.id"
          :to="`/${locale}/aanbod`"
          class="text-lg font-bold hover:opacity-70 transition-opacity"
          :style="{ color: cat.color || '#0d9488' }"
        >
          {{ t(cat, 'title') }}
        </NuxtLink>
      </div>
    </section>

    <!-- Academie section -->
    <section class="bg-white py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-8">Academie</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <p class="text-lg text-neutral-700 leading-relaxed">
              Dé<span class="lowercase">stabiel</span> kunstonderwijs voor kinderen, jongeren en volwassenen.
              Sint-Lukas is een bruisende plek in het hart van Brussel, al sinds 1880.
            </p>
            <UButton :to="`/${locale}/academie`" variant="outline" class="mt-6">
              Meer over de academie
            </UButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
