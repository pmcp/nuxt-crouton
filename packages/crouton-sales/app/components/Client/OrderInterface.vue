<template>
  <div class="h-full flex flex-col">
    <SalesClientOfflineBanner />

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
    </div>

    <template v-else>
      <!-- Category tabs -->
      <div class="p-2 border-b shrink-0">
        <SalesClientCategoryTabs
          v-model="selectedCategory"
          :categories="categories || []"
          :product-counts="productCounts"
        />
      </div>

      <!-- Main content area -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Products grid -->
        <div class="flex-1 overflow-y-auto p-2">
          <SalesClientProductList
            :products="filteredProducts"
            @select="handleProductSelect"
          />
        </div>

        <!-- Cart sidebar (desktop only) -->
        <div class="hidden md:flex w-80 border-l flex-col">
          <div v-if="props.requiresClient" class="p-3 border-b">
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
              :total="cartTotal"
              :disabled="!isOnline"
              :client-required="props.requiresClient"
              :has-client="hasClient"
              @update-quantity="updateQuantity"
              @remove="removeFromCart"
              @checkout="handleCheckout"
              @clear="clearCart"
            />
          </div>
        </div>
      </div>

      <!-- Product Options Modal -->
      <UModal v-model:open="showOptionsModal" :title="pendingProduct?.title" :ui="{ footer: 'justify-end' }">
        <template #body>
          <SalesClientProductOptionsSelect
            v-model="selectedOptions"
            :options="productOptionsForPending"
            :multiple-allowed="pendingProduct?.multipleOptionsAllowed"
          />
        </template>

        <template #footer>
          <UButton label="Cancel" color="neutral" variant="ghost" @click="showOptionsModal = false" />
          <UButton
            label="Add to Cart"
            :disabled="!selectedOptions || (Array.isArray(selectedOptions) && selectedOptions.length === 0)"
            @click="confirmProductWithOptions"
          />
        </template>
      </UModal>

      <!-- Mobile cart button -->
      <div class="md:hidden border-t p-2">
        <UDrawer direction="bottom">
          <UButton
            block
            size="lg"
            :label="cartItems.length > 0 ? `Cart (${cartItems.length}) - $${cartTotal.toFixed(2)}` : t('sales.cart.empty')"
            :icon="cartItems.length > 0 ? 'i-lucide-shopping-cart' : 'i-lucide-shopping-cart'"
            :color="cartItems.length > 0 ? 'primary' : 'neutral'"
            :variant="cartItems.length > 0 ? 'solid' : 'soft'"
          />

          <template #content>
            <div class="h-[70vh] flex flex-col">
              <div v-if="props.requiresClient" class="p-3 border-b shrink-0">
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
                  :total="cartTotal"
                  :disabled="!isOnline"
                  :client-required="props.requiresClient"
                  :has-client="hasClient"
                  @update-quantity="updateQuantity"
                  @remove="removeFromCart"
                  @checkout="handleCheckout"
                  @clear="clearCart"
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
import type { SalesProduct, SalesCategory, ProductOption, SalesClient } from '../../types'

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
  /** Whether this event requires orders to be linked to a client. */
  requiresClient?: boolean
  /** Whether to use reusable clients (dropdown) vs free-text input. */
  useReusableClients?: boolean
  /** Collection name for products query (defaults to 'salesProducts'). Ignored when `products` is provided. */
  productsCollection?: string
  /** Collection name for categories query (defaults to 'salesCategories'). Ignored when `categories` is provided. */
  categoriesCollection?: string
}>()

const isOnline = useOnline()
const notify = useNotify()
const { t } = useT()

const {
  cartItems,
  cartTotal,
  selectedEventId,
  selectedClientId,
  selectedClientName,
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
let categoriesLoading: Ref<boolean>
let productsLoading: Ref<boolean>

if (usePropsData) {
  categories = computed(() => props.categories ?? [])
  products = computed(() => props.products ?? [])
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
  categories = catsQuery.items as Ref<SalesCategory[]>
  products = prodsQuery.items as Ref<SalesProduct[]>
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

// Product options modal state
const showOptionsModal = ref(false)
const pendingProduct = ref<SalesProduct | null>(null)
const selectedOptions = ref<string | string[] | null>(null)

// Get inline options from the pending product
const productOptionsForPending = computed<ProductOption[]>(() => {
  if (!pendingProduct.value?.options) return []
  const options = pendingProduct.value.options as ProductOption[]
  return Array.isArray(options) ? options : []
})

// Handle product selection - show modal if product has options
function handleProductSelect(product: SalesProduct, preSelectedOptions?: string | string[]) {
  const options = (product.options as ProductOption[]) || []

  // If options were already selected (from ProductList inline selection)
  if (preSelectedOptions !== undefined) {
    addToCart(product, undefined, preSelectedOptions)
    return
  }

  if (product.hasOptions && Array.isArray(options) && options.length > 0) {
    pendingProduct.value = product
    selectedOptions.value = product.multipleOptionsAllowed ? [] : null
    showOptionsModal.value = true
  }
  else {
    addToCart(product)
  }
}

// Confirm product with selected options
function confirmProductWithOptions() {
  if (!pendingProduct.value || !selectedOptions.value) return

  addToCart(pendingProduct.value, undefined, selectedOptions.value)

  // Reset modal state
  showOptionsModal.value = false
  pendingProduct.value = null
  selectedOptions.value = null
}

// Category selection
const selectedCategory = ref<string | null>(null)

// Product counts per category
const productCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const product of (products.value || []) as SalesProduct[]) {
    if (product.categoryId) {
      counts[product.categoryId] = (counts[product.categoryId] || 0) + 1
    }
  }
  return counts
})

// Filtered products based on selected category
const filteredProducts = computed(() => {
  const allProducts = (products.value || []) as SalesProduct[]
  if (selectedCategory.value === null) {
    return allProducts.filter(p => p.isActive !== false)
  }
  return allProducts.filter(p => p.categoryId === selectedCategory.value && p.isActive !== false)
})

async function handleCheckout() {
  try {
    await checkout()
    notify.success(t('sales.orders.orderCreated'), { description: t('sales.orders.submittedSuccessfully') })
  }
  catch (error) {
    notify.error(t('sales.orders.error'), { description: error instanceof Error ? error.message : t('sales.orders.failedToCreate') })
  }
}
</script>
