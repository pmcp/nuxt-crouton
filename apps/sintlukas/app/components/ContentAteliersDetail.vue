<script setup lang="ts">
/**
 * Atelier detail view for the collection binder.
 *
 * Renders a two-column layout with:
 * - Main content (TipTap rich text) on the left
 * - Sidebar with schedule/materials info on the right
 * - Teacher cards, image gallery
 *
 * Component name matches convention: {CollectionName}Detail
 * The binder renderer resolves "ContentAteliersDetail" automatically.
 */

const props = defineProps<{
  item: Record<string, any>
  collection: string
  page: Record<string, any>
}>()

const { locale } = useI18n()
const { teamSlug } = useTeamContext()
const { hideTeamInUrl } = useDomainContext()

// Resolve translated fields — returns raw value (string or object for TipTap JSON)
function getField(field: string): any | null {
  const direct = props.item[field]
  if (direct) return direct
  const t = props.item.translations as Record<string, Record<string, any>> | undefined
  return t?.[locale.value]?.[field] || t?.en?.[field] || null
}

const title = computed(() => {
  const v = getField('title')
  return v ? String(v) : 'Untitled'
})
const age = computed(() => {
  const v = getField('age')
  return v ? String(v) : null
})

// Pre-rendered HTML from the public API endpoint (server-side renderTipTapToHtml)
const mainContentHtml = computed(() => props.item.contentHtml || '')
const sidebarContentHtml = computed(() => props.item.sidebarContentHtml || '')

// Back path
const backPath = computed(() => {
  const loc = locale.value || 'nl'
  if (hideTeamInUrl.value) return `/${loc}/${props.page.slug}`
  return `/${teamSlug?.value}/${loc}/${props.page.slug}`
})

// Persons — use pre-resolved personsData from the public API endpoint
const persons = computed<Record<string, any>[]>(() => {
  const data = props.item.personsData
  return Array.isArray(data) ? data : []
})

// Gallery images
const images = computed<string[]>(() => {
  const imgs = props.item.images
  if (Array.isArray(imgs)) return imgs
  return []
})
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Back link -->
    <UButton :to="backPath" variant="ghost" size="sm" class="mb-6 -ml-2">
      <UIcon name="i-lucide-arrow-left" class="mr-1" />
      Terug
    </UButton>

    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold text-neutral-900">{{ title }}</h1>
      <p v-if="age" class="text-lg text-neutral-500 mt-2">{{ age }}</p>
    </div>

    <!-- Main image -->
    <div v-if="item.mainImage" class="mb-8 rounded-2xl overflow-hidden aspect-[21/9] bg-sintlukas-50">
      <img
        :src="`/images/${item.mainImage}`"
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
                <img :src="person.image" :alt="`${person.firstName} ${person.lastName}`" class="size-full object-cover">
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
          <h3 class="text-lg font-semibold mb-4">Galerij</h3>
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
