<script setup lang="ts">
/**
 * Atelier detail page.
 * Two-column layout: main content + sidebar with practical info.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const locale = computed(() => String(route.params.locale))
const slug = route.params.slug as string

const { data: atelier, error } = await useFetch(`/api/public/ateliers/${slug}`)

if (error.value) {
  throw createError({ status: 404, statusText: 'Atelier niet gevonden' })
}

// Helper: get translated field
function t(field: string): string {
  const item = atelier.value
  if (!item) return ''
  const translations = item.translations as Record<string, Record<string, any>> | undefined
  const localeVal = translations?.[locale.value]?.[field]
  if (localeVal) return String(localeVal)
  return String(item[field] || '')
}

const title = computed(() => t('title') || 'Untitled')
const age = computed(() => t('age'))

// Pre-rendered HTML
const mainContentHtml = computed(() => {
  // Check for locale-specific content HTML first
  const item = atelier.value as any
  if (!item) return ''
  // Server renders default content; for translations we'd need locale-specific rendering
  return item.contentHtml || ''
})
const sidebarContentHtml = computed(() => (atelier.value as any)?.sidebarContentHtml || '')

const persons = computed<any[]>(() => {
  const data = (atelier.value as any)?.personsData
  return Array.isArray(data) ? data : []
})

const images = computed<string[]>(() => {
  const imgs = (atelier.value as any)?.images
  return Array.isArray(imgs) ? imgs : []
})

const categoryData = computed(() => (atelier.value as any)?.categoryData)

useHead({
  title: computed(() => `${title.value} — Sint-Lukas Academie`)
})
</script>

<template>
  <div v-if="atelier" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Back link -->
    <UButton :to="`/${locale}/aanbod`" variant="ghost" size="sm" class="mb-6 -ml-2">
      <UIcon name="i-lucide-arrow-left" class="mr-1" />
      Terug
    </UButton>

    <!-- Breadcrumb -->
    <div v-if="categoryData" class="text-sm text-neutral-500 mb-2">
      <NuxtLink :to="`/${locale}/aanbod`" class="hover:text-sintlukas-600">Aanbod</NuxtLink>
      <span class="mx-1">›</span>
      <span :style="{ color: categoryData.color }">{{ categoryData.title }}</span>
    </div>

    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold text-neutral-900">{{ title }}</h1>
      <p v-if="age" class="text-lg text-neutral-500 mt-2">{{ age }}</p>
    </div>

    <!-- Main image -->
    <div v-if="atelier.mainImage" class="mb-8 rounded-2xl overflow-hidden aspect-[21/9] bg-sintlukas-50">
      <img
        :src="`/images/${atelier.mainImage}`"
        :alt="title"
        class="w-full h-full object-cover"
      >
    </div>

    <!-- Two-column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Main content -->
      <div class="lg:col-span-2">
        <div
          v-if="mainContentHtml"
          class="prose prose-neutral max-w-none"
          v-html="mainContentHtml"
        />

        <!-- Teacher cards -->
        <div v-if="persons.length > 0" class="mt-10">
          <h3 class="text-lg font-semibold mb-4">Leerkrachten</h3>
          <div class="flex flex-wrap gap-4">
            <div
              v-for="person in persons"
              :key="person.id"
              class="flex items-center gap-3 bg-sintlukas-50 rounded-xl px-4 py-3"
            >
              <div v-if="person.image" class="size-12 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                <img :src="`/images/${person.image}`" :alt="`${person.firstName} ${person.lastName}`" class="size-full object-cover">
              </div>
              <UAvatar v-else :text="`${(person.firstName || '')[0]}${(person.lastName || '')[0]}`" size="lg" />
              <div>
                <p class="font-medium text-sm">{{ person.firstName }} {{ person.lastName }}</p>
                <p v-if="person.role" class="text-xs text-neutral-500">{{ person.role }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Image gallery -->
        <div v-if="images.length > 0" class="mt-10">
          <h3 class="text-lg font-semibold mb-4">In beeld</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              v-for="(imgId, idx) in images"
              :key="idx"
              class="aspect-square rounded-xl overflow-hidden bg-neutral-100"
            >
              <img
                :src="`/images/${imgId}`"
                alt=""
                class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <aside v-if="sidebarContentHtml" class="lg:col-span-1">
        <div class="sticky top-24 bg-sintlukas-50 rounded-2xl p-6">
          <div
            class="prose prose-sm prose-neutral max-w-none"
            v-html="sidebarContentHtml"
          />
        </div>
      </aside>
    </div>
  </div>
</template>
