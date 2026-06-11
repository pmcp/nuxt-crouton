<template>
  <UCard class="flex flex-col h-full" :ui="{ root: 'rounded-none', body: 'flex-1 overflow-y-auto', footer: 'space-y-4' }">
    <!-- Cart items -->
    <div v-if="items.length === 0" class="h-full flex flex-col items-center justify-center gap-3 text-muted">
      <UIcon name="i-lucide-shopping-cart" class="size-10 opacity-40" />
      <p class="text-sm">{{ t('sales.cart.empty') }}</p>
    </div>

    <div v-else class="space-y-4">
      <div v-for="group in groupedItems" :key="group.key" class="space-y-2">
        <p
          v-if="group.title"
          class="text-xs font-medium text-muted uppercase tracking-wide px-1"
        >
          {{ group.title }}
        </p>
        <!-- Subtle divider between products — same treatment as the expanded
             order's item list in the workspace. -->
        <div class="divide-y divide-default/60">
          <SalesClientOrderLineItem
            v-for="entry in group.entries"
            :key="`${entry.item.product.id}-${entry.index}`"
            :title="entry.item.product.title"
            :price="calculateItemPrice(entry.item) * entry.item.quantity"
            :options="getSelectedOptionLabels(entry.item)"
            :remark="entry.item.remarks"
          >
            <template #actions>
              <UButton
                icon="i-lucide-minus"
                size="xs"
                color="neutral"
                variant="soft"
                square
                @click="$emit('updateQuantity', entry.index, entry.item.quantity - 1)"
              />
              <span :key="entry.item.quantity" class="w-6 text-center text-sm animate-pop">{{ entry.item.quantity }}</span>
              <UButton
                icon="i-lucide-plus"
                size="xs"
                color="neutral"
                variant="soft"
                square
                @click="$emit('updateQuantity', entry.index, entry.item.quantity + 1)"
              />
            </template>
          </SalesClientOrderLineItem>
        </div>
      </div>
    </div>

    <template #footer>
      <SalesClientCartTotal :count="itemCount" :total="total" />

      <!-- Remarks: one button that slides open an accordion of the locations
           with items in the cart, each with its own note. A location remark
           prints as REMARK: on that location's ticket only. Never counted
           in sales. -->
      <!-- Toggle + accordion share one elevated block so they read as a unit. -->
      <UCollapsible
        v-if="remarkLocations.length > 0"
        v-model:open="remarksOpen"
        class="rounded-lg bg-elevated/60"
      >
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-lucide-message-square-text"
          :trailing-icon="remarksOpen ? 'i-lucide-minus' : 'i-lucide-plus'"
          :label="remarkCount > 0 ? `${t('sales.cart.remark')} (${remarkCount})` : t('sales.cart.remark')"
          block
          :ui="{ trailingIcon: 'ms-auto' }"
        />

        <template #content>
          <div class="px-2 pb-1">
            <UAccordion type="multiple" :items="remarkAccordionItems">
              <template #default="{ item }">
                <span class="flex items-center gap-2 text-sm">
                  {{ item.label }}
                  <span
                    v-if="locationRemark(item.value).trim()"
                    class="size-1.5 rounded-full bg-primary"
                  />
                </span>
              </template>
              <template #body="{ item }">
                <UTextarea
                  :model-value="locationRemark(item.value)"
                  :placeholder="t('sales.cart.remarkPlaceholder')"
                  :rows="2"
                  autoresize
                  class="w-full"
                  @update:model-value="emitLocationRemark(item.value, String($event))"
                />
              </template>
            </UAccordion>
          </div>
        </template>
      </UCollapsible>

      <!-- Staff order: prints the staff banner on tickets (receipt settings) -->
      <div v-if="items.length > 0" class="flex items-center justify-between gap-2">
        <span class="text-sm" :class="isPersonnel ? 'text-warning font-medium' : 'text-muted'">
          {{ t('sales.cart.staffOrder') }}
        </span>
        <USwitch
          :model-value="isPersonnel ?? false"
          color="warning"
          @update:model-value="$emit('update:isPersonnel', $event)"
        />
      </div>

      <div v-if="clientRequired && !hasClient && items.length > 0" class="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning">
        <UIcon name="i-lucide-alert-triangle" class="text-warning shrink-0" />
        <span class="text-sm text-warning font-medium">{{ clientWarning || t('sales.cart.selectClient') }}</span>
      </div>

      <UButton
        :label="t('sales.cart.pay')"
        size="lg"
        block
        :disabled="disabled || items.length === 0 || (clientRequired && !hasClient)"
        @click="$emit('checkout')"
      />
    </template>
  </UCard>
</template>

<script setup lang="ts">
import type { CartItem, ProductOption, SalesCategory, SalesLocation } from '../../types'
import { calculateItemPrice } from '../../composables/usePosOrder'
const { t } = useT()

const props = defineProps<{
  items: CartItem[]
  total: number
  disabled: boolean
  clientRequired?: boolean
  hasClient?: boolean
  /** Warning shown when the client indication is missing — the parent picks
   * the wording (select a client vs enter a name). */
  clientWarning?: string
  /** Categories used to group + order cart items. Optional — without it items render ungrouped. */
  categories?: SalesCategory[]
  /** Event locations, used to label per-location remark inputs. */
  locations?: SalesLocation[]
  /** Current per-location remark text, keyed by locationId. */
  locationRemarks?: Record<string, string>
  /** Staff order flag — prints the staff banner (receipt settings) on tickets. */
  isPersonnel?: boolean
}>()

// Locations represented by at least one cart item — a remark only prints if its
// location already has an item on this order (items-required).
const remarkLocations = computed<SalesLocation[]>(() => {
  const idsInCart = new Set(
    props.items
      .map(item => item.product.locationId)
      .filter((id): id is string => Boolean(id))
  )
  const byId = new Map((props.locations || []).map(loc => [loc.id, loc]))
  return [...idsInCart]
    .map(id => byId.get(id))
    .filter((loc): loc is SalesLocation => Boolean(loc))
})

const itemCount = computed(() => {
  return props.items.reduce((count, item) => count + item.quantity, 0)
})

interface CartEntry {
  item: CartItem
  /** Original index in props.items — must be used for quantity emits. */
  index: number
}

interface CartGroup {
  key: string
  title: string
  entries: CartEntry[]
}

// Order map for categories so groups follow the admin-defined display order.
const categoryOrder = computed(() => {
  const map = new Map<string, { title: string, order: number }>()
  ;(props.categories || []).forEach((category, idx) => {
    map.set(category.id, {
      title: category.title,
      order: category.displayOrder ?? idx,
    })
  })
  return map
})

// Group cart items by category, then cluster identical products within each group.
// Original indices are preserved on each entry so quantity controls stay correct.
const groupedItems = computed<CartGroup[]>(() => {
  const groups = new Map<string, CartGroup & { order: number }>()

  props.items.forEach((item, index) => {
    const categoryId = item.product.categoryId
    const meta = categoryId ? categoryOrder.value.get(categoryId) : undefined
    const key = categoryId || '__uncategorized__'

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: meta?.title ?? '',
        // Known categories sort by their order; unknown/uncategorized go last.
        order: meta ? meta.order : Number.MAX_SAFE_INTEGER,
        entries: [],
      })
    }
    groups.get(key)!.entries.push({ item, index })
  })

  const result = Array.from(groups.values())
  result.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))

  // Cluster identical products (same title) next to each other within a group,
  // preserving relative insertion order for ties.
  for (const group of result) {
    group.entries.sort((a, b) =>
      a.item.product.title.localeCompare(b.item.product.title) || a.index - b.index
    )
  }

  return result
})

const emit = defineEmits<{
  updateQuantity: [index: number, quantity: number]
  remove: [index: number]
  checkout: []
  clear: []
  updateLocationRemark: [locationId: string, value: string]
  'update:isPersonnel': [value: boolean]
}>()

// Remarks panel: an accordion item per location that already has an item in
// the cart (items-required, same rule the print pipeline applies). Each item
// carries its own textarea; a filled one shows a dot next to its label.
const remarksOpen = ref(false)

const remarkAccordionItems = computed(() =>
  remarkLocations.value.map(loc => ({ label: loc.title, value: loc.id }))
)

function locationRemark(locationId?: string): string {
  return locationId ? (props.locationRemarks?.[locationId] ?? '') : ''
}

function emitLocationRemark(locationId: string | undefined, value: string) {
  if (locationId) emit('updateLocationRemark', locationId, value)
}

// Locations that currently carry text — shown as a count on the collapsed button.
const remarkCount = computed(() =>
  remarkLocations.value.filter(loc => props.locationRemarks?.[loc.id]?.trim()).length
)

// Get selected option labels as array
function getSelectedOptionLabels(item: CartItem): string[] {
  if (!item.selectedOptions || !item.product.options) return []
  const optionIds = Array.isArray(item.selectedOptions)
    ? item.selectedOptions
    : [item.selectedOptions]
  return optionIds
    .map(id => item.product.options?.find((o: ProductOption) => o.id === id)?.label)
    .filter((label): label is string => Boolean(label))
}


</script>

<style scoped>
.animate-pop {
  animation: pop 0.15s ease-out;
}

@keyframes pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
