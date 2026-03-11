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
const { getTeamId, teamSlug } = useTeamContext()
const { hideTeamInUrl } = useDomainContext()
const teamId = getTeamId()

// Resolve translated fields
function getField(field: string): string | null {
  const direct = props.item[field]
  if (direct) return String(direct)
  const t = props.item.translations as Record<string, Record<string, string>> | undefined
  return t?.[locale.value]?.[field] || t?.en?.[field] || null
}

const title = computed(() => getField('title') || 'Untitled')
const age = computed(() => getField('age'))
const mainContent = computed(() => getField('content'))
const sidebarContent = computed(() => getField('sidebarContent'))

// Back path
const backPath = computed(() => {
  const loc = locale.value || 'nl'
  if (hideTeamInUrl.value) return `/${loc}/${props.page.slug}`
  return `/${teamSlug?.value}/${loc}/${props.page.slug}`
})

// Fetch person references
const personIds = computed<string[]>(() => {
  const p = props.item.persons
  if (Array.isArray(p)) return p
  return []
})

const { data: personsData } = await useFetch<any>(() => {
  if (!teamId || personIds.value.length === 0) return null as any
  return `/api/teams/${teamId}/content-persons?ids=${personIds.value.join(',')}`
}, {
  watch: [personIds]
})

const persons = computed<Record<string, any>[]>(() => {
  const res = personsData.value
  if (!res) return []
  const items = res?.items || res
  return Array.isArray(items) ? items : []
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
    <div v-if="item.mainImage" class="mb-8 rounded-2xl overflow-hidden aspect-[21/9] bg-neutral-100">
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
        <CroutonPagesRegularContent
          v-if="mainContent"
          :content="mainContent"
          class="prose prose-neutral max-w-none"
        />

        <!-- Teacher cards -->
        <div v-if="persons.length > 0" class="mt-10">
          <h3 class="text-lg font-semibold mb-4">Leerkrachten</h3>
          <div class="flex flex-wrap gap-4">
            <div
              v-for="person in persons"
              :key="person.id"
              class="flex items-center gap-3 bg-neutral-50 rounded-xl px-4 py-3"
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
      <aside v-if="sidebarContent" class="lg:col-span-1">
        <div class="sticky top-24 bg-neutral-50 rounded-2xl p-6">
          <CroutonPagesRegularContent
            :content="sidebarContent"
            class="prose prose-sm prose-neutral max-w-none"
          />
        </div>
      </aside>
    </div>
  </div>
</template>
