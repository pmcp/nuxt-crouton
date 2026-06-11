<template>
  <div class="h-full flex flex-col">
    <SalesClientOfflineBanner />

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
    </div>

    <template v-else>
      <!-- Category tabs -->
      <div class="p-2 border-b border-default shrink-0 flex items-center gap-2">
        <div class="flex-1 min-w-0">
          <SalesClientCategoryTabs
            v-model="selectedCategory"
            :categories="categories || []"
            :counts="cartCountsByCategory"
            :show-all="false"
            :editable="editable"
            @edit="openEditCategory"
          />
        </div>
        <UButton
          v-if="editable"
          icon="i-lucide-plus"
          size="sm"
          color="neutral"
          variant="soft"
          :aria-label="t('sales.workspace.add')"
          @click="openCreateCategory"
        />
      </div>

      <!-- Main content area -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Products grid -->
        <div class="flex-1 overflow-y-auto p-2">
          <SalesClientProductList
            :products="filteredProducts"
            :editable="editable"
            @select="handleProductSelect"
            @edit="openEditProduct"
            @reorder="handleReorder"
          />
          <UButton
            v-if="editable"
            block
            color="neutral"
            variant="outline"
            icon="i-lucide-plus"
            class="mt-2 border-dashed"
            :label="t('sales.workspace.addProduct')"
            @click="openCreateProduct"
          />
        </div>

        <!-- Cart sidebar (desktop only) -->
        <div class="hidden md:flex w-80 border-l border-default flex-col">
          <div v-if="props.requiresClient" class="p-3 border-b border-default">
            <SalesClientSelector
              :clients="props.clients || []"
              :use-reusable-clients="true"
              :highlight="!hasClient && cartItems.length > 0"
              :client-id="selectedClientId"
              :client-name="selectedClientName || undefined"
              :event-id="props.eventId"
              @update:client-id="selectedClientId = $event"
              @update:client-name="selectedClientName = $event"
            />
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto">
            <SalesClientCart
              :items="cartItems"
              :categories="categories || []"
              :locations="locations || []"
              :location-remarks="locationRemarks"
              :total="cartTotal"
              :disabled="!isOnline"
              :client-required="props.requiresClient"
              :has-client="hasClient"
              @update-quantity="updateQuantity"
              @remove="removeFromCart"
              @checkout="handleCheckout"
              @clear="clearCart"
              @update-location-remark="setLocationRemark"
            />
          </div>
        </div>
      </div>

      <!-- Mobile cart button -->
      <div class="md:hidden border-t border-default p-2">
        <UDrawer v-model:open="mobileCartOpen" direction="bottom">
          <UButton
            block
            size="lg"
            :label="cartItems.length > 0 ? `${t('sales.cart.title')} (${cartItems.length}) - ${formatPrice(cartTotal)}` : t('sales.cart.empty')"
            :icon="cartItems.length > 0 ? 'i-lucide-shopping-cart' : 'i-lucide-shopping-cart'"
            :color="cartItems.length > 0 ? 'primary' : 'neutral'"
            :variant="cartItems.length > 0 ? 'solid' : 'soft'"
          />

          <template #content>
            <div class="h-[70vh] flex flex-col">
              <div v-if="props.requiresClient" class="p-3 border-b border-default shrink-0">
                <SalesClientSelector
                  :clients="props.clients || []"
                  :use-reusable-clients="true"
                  :highlight="!hasClient && cartItems.length > 0"
                  :client-id="selectedClientId"
                  :client-name="selectedClientName || undefined"
                  :event-id="props.eventId"
                  @update:client-id="selectedClientId = $event"
                  @update:client-name="selectedClientName = $event"
                />
              </div>
              <div class="flex-1 min-h-0 overflow-y-auto">
                <SalesClientCart
                  :items="cartItems"
                  :categories="categories || []"
                  :locations="locations || []"
                  :location-remarks="locationRemarks"
                  :total="cartTotal"
                  :disabled="!isOnline"
                  :client-required="props.requiresClient"
                  :has-client="hasClient"
                  @update-quantity="updateQuantity"
                  @remove="removeFromCart"
                  @checkout="handleCheckout"
                  @clear="clearCart"
                  @update-location-remark="setLocationRemark"
                />
              </div>
            </div>
          </template>
        </UDrawer>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SalesProduct, SalesCategory, SalesClient, SalesLocation } from '../../types'

const props = defineProps<{
  eventId: string
  /**
   * Pre-fetched products. When provided, OrderInterface won't call useCollectionQuery.
   * Use this for customer/helper-auth flows where the caller fetches via a
   * helper-token-protected endpoint (e.g., /api/crouton-sales/events/[id]/order-data).
   * When omitted (admin/team-member flows), defaults to fetching via useCollectionQuery.
   */
  products?: SalesProduct[]
  /** Pre-fetched categories. Same semantics as `products`. */
  categories?: SalesCategory[]
  /** Pre-fetched clients for this event's team. */
  clients?: SalesClient[]
  /** Pre-fetched locations for this event, used to label per-location remark inputs. */
  locations?: SalesLocation[]
  /** Whether this event requires orders to be linked to a client. */
  requiresClient?: boolean
  /** Whether to use reusable clients (dropdown) vs free-text input. */
  useReusableClients?: boolean
  /** Collection name for products query (defaults to 'salesProducts'). Ignored when `products` is provided. */
  productsCollection?: string
  /** Collection name for categories query (defaults to 'salesCategories'). Ignored when `categories` is provided. */
  categoriesCollection?: string
  /** Currency for this event ('EUR' | 'USD', default EUR). Provided to all price displays. */
  currency?: string
  /**
   * Show admin editing affordances (add category / add product, via the
   * crouton create forms). Only enable for team-member sessions — the forms
   * post to team-scoped CRUD endpoints that helper tokens can't reach.
   */
  editable?: boolean
}>()

const isOnline = useOnline()
const notify = useNotify()
const { t } = useT()

// Share the event currency with every descendant price display (cart, line
// items, option modifiers).
provideSalesCurrency(() => props.currency)
const { format: formatPrice } = useSalesCurrency(() => props.currency)

const {
  cartItems,
  cartTotal,
  selectedEventId,
  selectedClientId,
  selectedClientName,
  locationRemarks,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  checkout,
} = usePosOrder()

// Set the event ID
selectedEventId.value = props.eventId

// When pre-fetched data is provided (helper-auth flow), skip the auto-fetch.
const usePropsData = props.products !== undefined && props.categories !== undefined

let categories: Ref<SalesCategory[]> | ComputedRef<SalesCategory[]>
let products: Ref<SalesProduct[]> | ComputedRef<SalesProduct[]>
let locations: Ref<SalesLocation[]> | ComputedRef<SalesLocation[]>
let categoriesLoading: Ref<boolean>
let productsLoading: Ref<boolean>

if (usePropsData) {
  categories = computed(() => props.categories ?? [])
  products = computed(() => props.products ?? [])
  locations = computed(() => props.locations ?? [])
  categoriesLoading = ref(false)
  productsLoading = ref(false)
}
else {
  const catsQuery = await useCollectionQuery(
    props.categoriesCollection || 'salesCategories',
    { query: computed(() => ({ eventId: props.eventId })) }
  )
  const prodsQuery = await useCollectionQuery(
    props.productsCollection || 'salesProducts',
    { query: computed(() => ({ eventId: props.eventId })) }
  )
  const locsQuery = await useCollectionQuery(
    'salesLocations',
    { query: computed(() => ({ eventId: props.eventId })) }
  )
  categories = catsQuery.items as Ref<SalesCategory[]>
  products = prodsQuery.items as Ref<SalesProduct[]>
  locations = locsQuery.items as Ref<SalesLocation[]>
  categoriesLoading = catsQuery.pending
  productsLoading = prodsQuery.pending
}

const loading = computed(() => categoriesLoading.value || productsLoading.value)

// Client selection state
const hasClient = computed(() => {
  if (!props.requiresClient) return true
  if (props.useReusableClients) {
    return !!selectedClientId.value || !!(selectedClientName.value?.trim())
  }
  return !!(selectedClientName.value?.trim())
})

// Mobile cart drawer open state (closed automatically after checkout)
const mobileCartOpen = ref(false)

// Add a product to the cart. Options and any required per-item remark are
// captured inline in the product card (SalesClientProductList) and arrive here
// ready to add — no modal.
function handleProductSelect(
  product: SalesProduct,
  selectedOption?: string | string[],
  remark?: string
) {
  addToCart(product, remark, selectedOption)
}

// Category selection. The "All" tab is hidden in the POS, so default the
// selection to the first category once they load — otherwise the tabs would
// visually highlight the first category while `selectedCategory` stays null and
// the grid shows every product.
const selectedCategory = ref<string | null>(null)

watch(categories, (cats) => {
  // Also covers the selected category being deleted from the editable POS —
  // fall back to the first remaining tab instead of pointing at a ghost id.
  const selectionGone = selectedCategory.value !== null && !cats.some(c => c.id === selectedCategory.value)
  if ((selectedCategory.value === null || selectionGone) && cats.length) {
    selectedCategory.value = cats[0]!.id
  }
}, { immediate: true })

// Cart quantities per category — drives the count badge on each category tab so
// it's clear how many items were added from that tab (hidden when zero).
const cartCountsByCategory = computed(() => {
  const counts: Record<string, number> = {}
  for (const item of cartItems.value) {
    const catId = item.product.categoryId
    if (catId) counts[catId] = (counts[catId] || 0) + item.quantity
  }
  return counts
})

// Filtered products based on selected category, in the same order the admin
// arranged them (sortOrder, then title — mirrors the workspace ProductsTab).
const filteredProducts = computed(() => {
  const allProducts = ([...(products.value || [])] as SalesProduct[])
    .filter(p => p.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title))
  if (selectedCategory.value === null) return allProducts
  return allProducts.filter(p => p.categoryId === selectedCategory.value)
})

// Set/update the free-text remark for a given location (writes into the
// usePosOrder locationRemarks map, included in the checkout body).
function setLocationRemark(locationId: string, value: string) {
  locationRemarks.value[locationId] = value
}

// Admin editing affordances (editable mode): open the crouton create forms
// with the event (and active category) preset. The caller is responsible for
// refreshing pre-fetched data on crouton:mutation (SalesPosPanel does this).
const { open: openCrouton } = useCrouton()

function openCreateCategory() {
  openCrouton('create', 'salesCategories', [], 'slideover', { eventId: props.eventId })
}

function openCreateProduct() {
  openCrouton('create', 'salesProducts', [], 'slideover', {
    eventId: props.eventId,
    ...(selectedCategory.value ? { categoryId: selectedCategory.value } : {})
  })
}

// Pencil on the active category tab → update form (which carries the
// two-step delete, same as the location form).
function openEditCategory(categoryId: string) {
  openCrouton('update', 'salesCategories', [categoryId])
}

// Pencil on a product card → update form (same two-step delete).
function openEditProduct(productId: string) {
  openCrouton('update', 'salesProducts', [productId])
}

// Drag-reorder persistence: same generated /reorder path as the workspace
// ProductsTab (order = visual index within the visible set). The resulting
// 'reorder' mutation makes SalesPosPanel re-fetch order-data.
const { reorderSiblings, reordering } = useTreeMutation('salesProducts')

async function handleReorder(updates: Array<{ id: string, order: number }>) {
  if (!updates.length || reordering.value) return
  await reorderSiblings(updates)
}

async function handleCheckout() {
  try {
    await checkout()
    // Close the mobile cart drawer once the order is placed (desktop sidebar
    // just empties as checkout() clears the cart).
    mobileCartOpen.value = false
    notify.success(t('sales.orders.orderCreated'), { description: t('sales.orders.submittedSuccessfully') })
  }
  catch (error) {
    notify.error(t('sales.orders.error'), { description: error instanceof Error ? error.message : t('sales.orders.failedToCreate') })
  }
}
</script>
