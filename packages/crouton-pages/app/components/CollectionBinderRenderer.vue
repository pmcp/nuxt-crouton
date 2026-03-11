<script setup lang="ts">
/**
 * Collection Binder Renderer
 *
 * Renders a collection binder page. Two modes:
 *
 * 1. **List mode** (no binderItemId in config): Shows all collection items
 *    as a grid of cards with links to the item detail route.
 *
 * 2. **Item detail mode** (binderItemId present): Shows the detail view for
 *    a single item, using the collection's Detail component or CroutonDetail.
 *
 * The binderItemId is injected into page.config by the slug API when a
 * multi-segment URL like /locations/abc123 is resolved.
 */

interface PageRecord {
  id: string
  teamId: string
  title: string
  slug: string
  pageType: string
  config?: Record<string, unknown> | null
  status: string
  visibility: string
  showInNavigation: boolean
  parentId?: string | null
  order: number
}

interface Props {
  page: PageRecord
}

const props = defineProps<Props>()

const route = useRoute()
const { locale } = useI18n()
const collections = useCollections()
const { getTeamId, teamSlug } = useTeamContext()
const { hideTeamInUrl } = useDomainContext()

// Which collection is bound
const collectionName = computed(() => props.page.config?.collection as string | undefined)

// When set, we're in item-detail mode (injected by the slug API for /binder/itemId routes)
const binderItemId = computed(() => props.page.config?.binderItemId as string | undefined)
const isItemView = computed(() => !!binderItemId.value)

// Get collection config
const colConfig = computed(() => {
  if (!collectionName.value) return null
  return collections.getConfig(collectionName.value)
})

const apiPath = computed(() => colConfig.value?.apiPath || null)
const titleField = computed(() => colConfig.value?.display?.title || 'title')
const subtitleField = computed(() => colConfig.value?.display?.subtitle || null)
const imageField = computed(() => colConfig.value?.display?.image || null)
const badgeField = computed(() => colConfig.value?.display?.badge || null)
const teamId = getTeamId()

// Build base path for item links (e.g. /acme/en/locations)
const binderBasePath = computed(() => {
  const team = teamSlug?.value
  const loc = locale.value || 'en'
  if (hideTeamInUrl.value) return `/${loc}/${props.page.slug}`
  return `/${team}/${loc}/${props.page.slug}`
})

// ── LIST MODE ──────────────────────────────────────────────────────────────

const sortField = computed(() => props.page.config?.sortField as string || null)
const sortOrder = computed(() => props.page.config?.sortOrder as string || 'asc')
const groupByField = computed(() => props.page.config?.groupBy as string || null)

const { data: listResponse, status: listStatus } = await useFetch<any>(() => {
  if (isItemView.value || !teamId || !apiPath.value) return null as any
  const params: Record<string, string> = {}
  if (sortField.value) params.sort = sortField.value
  if (sortOrder.value) params.order = sortOrder.value
  return `/api/teams/${teamId}/${apiPath.value}`
}, {
  params: computed(() => {
    const p: Record<string, string> = {}
    if (sortField.value) p.sort = sortField.value
    if (sortOrder.value) p.order = sortOrder.value
    return p
  }),
  watch: [isItemView, apiPath]
})

const listItems = computed<Record<string, any>[]>(() => {
  const res = listResponse.value
  if (!res) return []
  const items = res?.items || res
  return Array.isArray(items) ? items : []
})

// Get a display value from an item, with translation fallback
function getItemValue(item: Record<string, any>, field: string): string | null {
  const direct = item[field]
  if (direct) return String(direct)
  // Translation fallback
  const translations = item.translations as Record<string, Record<string, string>> | undefined
  if (!translations) return null
  const localeVal = translations[locale.value]?.[field]
  if (localeVal) return String(localeVal)
  const enVal = translations.en?.[field]
  if (enVal) return String(enVal)
  return null
}

// ── GROUPBY SUPPORT ──────────────────────────────────────────────────────

// Resolve the referenced collection for groupBy (e.g. "category" → collection config for categories)
const groupByRefCollection = computed(() => {
  if (!groupByField.value || !collectionName.value) return null
  const config = colConfig.value
  if (!config?.references) return null
  return config.references[groupByField.value] || null
})

// Fetch group reference records when groupBy is active
const groupByRefApiPath = computed(() => {
  if (!groupByRefCollection.value) return null
  const refConfig = collections.getConfig(groupByRefCollection.value)
  return refConfig?.apiPath || null
})

const { data: groupRefData } = await useFetch<any>(() => {
  if (!groupByRefApiPath.value || !teamId) return null as any
  return `/api/teams/${teamId}/${groupByRefApiPath.value}`
}, {
  watch: [groupByRefApiPath]
})

// Build a map of reference ID → display label
const groupLabels = computed<Map<string, { label: string; order: number }>>(
  () => {
    const map = new Map<string, { label: string; order: number }>()
    if (!groupRefData.value) return map
    const items = groupRefData.value?.items || groupRefData.value
    if (!Array.isArray(items)) return map
    for (const item of items) {
      const label = getItemValue(item, 'title') || getItemValue(item, 'name') || item.id
      map.set(item.id, { label, order: item.order ?? 0 })
    }
    return map
  }
)

// Group items by the groupBy field value
interface GroupedSection {
  key: string
  label: string
  order: number
  items: Record<string, any>[]
}

const groupedItems = computed<GroupedSection[]>(() => {
  if (!groupByField.value || listItems.value.length === 0) return []

  const groups = new Map<string, GroupedSection>()

  for (const item of listItems.value) {
    const groupKey = item[groupByField.value] as string || '_ungrouped'
    if (!groups.has(groupKey)) {
      const ref = groupLabels.value.get(groupKey)
      groups.set(groupKey, {
        key: groupKey,
        label: ref?.label || groupKey,
        order: ref?.order ?? 999,
        items: []
      })
    }
    groups.get(groupKey)!.items.push(item)
  }

  return Array.from(groups.values()).sort((a, b) => a.order - b.order)
})

const hasGroups = computed(() => groupByField.value && groupedItems.value.length > 0)

// ── ITEM DETAIL MODE ───────────────────────────────────────────────────────

const { data: detailItem, status: detailStatus } = await useFetch<Record<string, any> | null>(() => {
  if (!isItemView.value || !teamId || !apiPath.value || !binderItemId.value) return null as any
  return `/api/teams/${teamId}/${apiPath.value}?ids=${binderItemId.value}`
}, {
  transform: (response: any) => {
    const items = response?.items || response
    if (Array.isArray(items)) return items[0] || null
    return items
  },
  watch: [isItemView, binderItemId, apiPath]
})

// Resolve detail component: {CollectionName}Detail → CroutonDetail
const detailComponent = computed(() => {
  if (!collectionName.value) return null
  const config = colConfig.value
  if (!config?.componentName) return null

  const detailName = config.componentName.replace(/Form$/, 'Detail')
  try {
    const component = resolveComponent(detailName)
    if (typeof component !== 'string') return component
  } catch {
    // Not found
  }

  try {
    const generic = resolveComponent('CroutonDetail')
    if (typeof generic !== 'string') return generic
  } catch {
    // Not available
  }

  return null
})

const isLoading = computed(() => {
  if (isItemView.value) return detailStatus.value === 'pending'
  return listStatus.value === 'pending'
})

const isOrphaned = computed(() =>
  isItemView.value && detailStatus.value === 'success' && !detailItem.value
)
const { t } = useT()
</script>

<template>
  <div class="collection-binder-renderer">
    <!-- No collection configured -->
    <div v-if="!collectionName" class="p-8 text-center">
      <UIcon name="i-lucide-layers" class="size-12 text-muted mb-4 mx-auto block" />
      <h2 class="text-lg font-semibold mb-2">No Collection Bound</h2>
      <p class="text-muted text-sm">
        This page is a collection binder but no collection has been selected yet.
        Edit the page in the admin to bind a collection.
      </p>
    </div>

    <!-- Loading -->
    <div v-else-if="isLoading" class="flex items-center justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
    </div>

    <!-- ── ITEM DETAIL MODE ── -->
    <template v-else-if="isItemView">
      <!-- Orphaned reference -->
      <div v-if="isOrphaned" class="p-8 text-center">
        <UIcon name="i-lucide-unlink" class="size-12 text-warning mb-4 mx-auto block" />
        <h2 class="text-lg font-semibold mb-2">{{ t('pages.collection.itemUnavailable') }}</h2>
        <p class="text-muted text-sm">
          This item may have been deleted or is no longer accessible.
        </p>
        <UButton :to="binderBasePath" variant="soft" class="mt-4">
          <UIcon name="i-lucide-arrow-left" class="mr-2" />
          Back to list
        </UButton>
      </div>

      <!-- Render item with its detail component -->
      <component
        v-else-if="detailItem && detailComponent"
        :is="detailComponent"
        :item="detailItem"
        :collection="collectionName"
        :page="page"
      />

      <!-- No detail component — generic fallback -->
      <div v-else-if="detailItem" class="max-w-2xl mx-auto py-8 px-4">
        <!-- Back link -->
        <UButton :to="binderBasePath" variant="ghost" size="sm" class="mb-6">
          <UIcon name="i-lucide-arrow-left" class="mr-1" />
          Back
        </UButton>

        <h1 class="text-2xl font-bold mb-4">
          {{ getItemValue(detailItem, titleField) || 'Untitled' }}
        </h1>

        <p v-if="subtitleField" class="text-muted mb-4">
          {{ getItemValue(detailItem, subtitleField) }}
        </p>

        <div v-if="imageField && detailItem[imageField]" class="mb-6 rounded-xl overflow-hidden">
          <img :src="detailItem[imageField]" class="w-full" alt="" />
        </div>

        <pre class="text-xs text-muted bg-muted/30 rounded p-4 overflow-auto">{{ JSON.stringify(detailItem, null, 2) }}</pre>
      </div>
    </template>

    <!-- ── LIST MODE ── -->
    <template v-else>
      <div class="max-w-6xl mx-auto py-8 px-4">
        <h1 class="text-3xl font-bold mb-8">{{ page.title }}</h1>

        <!-- Empty state -->
        <div v-if="listItems.length === 0" class="text-center py-16">
          <UIcon name="i-lucide-inbox" class="size-12 text-muted mb-4 mx-auto block" />
          <p class="text-muted">No items found in this collection.</p>
        </div>

        <!-- Grouped item grid -->
        <template v-else-if="hasGroups">
          <div v-for="group in groupedItems" :key="group.key" class="mb-10 last:mb-0">
            <h2 class="text-2xl font-bold mb-5">{{ group.label }}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <NuxtLink
                v-for="item in group.items"
                :key="item.id"
                :to="`${binderBasePath}/${item.id}`"
                class="group block rounded-xl border border-default bg-background hover:bg-elevated transition-colors overflow-hidden"
              >
                <div
                  v-if="imageField && item[imageField]"
                  class="aspect-[16/9] overflow-hidden bg-muted"
                >
                  <img
                    :src="item[imageField]"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt=""
                  />
                </div>
                <div class="p-4">
                  <UBadge v-if="badgeField && item[badgeField]" variant="subtle" size="xs" class="mb-2">
                    {{ item[badgeField] }}
                  </UBadge>
                  <h3 class="font-semibold text-default group-hover:text-primary transition-colors">
                    {{ getItemValue(item, titleField) || 'Untitled' }}
                  </h3>
                  <p v-if="subtitleField" class="text-sm text-muted mt-1 line-clamp-2">
                    {{ getItemValue(item, subtitleField) }}
                  </p>
                </div>
              </NuxtLink>
            </div>
          </div>
        </template>

        <!-- Ungrouped item grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="item in listItems"
            :key="item.id"
            :to="`${binderBasePath}/${item.id}`"
            class="group block rounded-xl border border-default bg-background hover:bg-elevated transition-colors overflow-hidden"
          >
            <!-- Image -->
            <div
              v-if="imageField && item[imageField]"
              class="aspect-[16/9] overflow-hidden bg-muted"
            >
              <img
                :src="item[imageField]"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                alt=""
              />
            </div>

            <div class="p-4">
              <!-- Badge -->
              <UBadge
                v-if="badgeField && item[badgeField]"
                variant="subtle"
                size="xs"
                class="mb-2"
              >
                {{ item[badgeField] }}
              </UBadge>

              <!-- Title -->
              <h2 class="font-semibold text-default group-hover:text-primary transition-colors">
                {{ getItemValue(item, titleField) || 'Untitled' }}
              </h2>

              <!-- Subtitle -->
              <p v-if="subtitleField" class="text-sm text-muted mt-1 line-clamp-2">
                {{ getItemValue(item, subtitleField) }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>
