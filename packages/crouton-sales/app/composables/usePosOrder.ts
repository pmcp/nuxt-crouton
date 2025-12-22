/**
 * @crouton-package crouton-sales
 * @description POS order management - cart, checkout, and price calculations
 * @requires Generated sales layer with products, orders, orderItems collections
 */

// Product option structure (stored in product.options JSON field)
export interface ProductOption {
  id: string
  label: string
  priceModifier: number
}

// Product with typed options array
export interface SalesProduct {
  id: string
  title: string
  price: number | string
  eventId: string
  categoryId?: string
  locationId?: string
  description?: string
  isActive?: boolean
  requiresRemark?: boolean
  remarkPrompt?: string
  hasOptions?: boolean
  multipleOptionsAllowed?: boolean
  options?: ProductOption[]
  sortOrder?: number
}

export interface CartItem {
  product: SalesProduct
  quantity: number
  remarks?: string
  selectedOptions?: string | string[]
}

interface OrderItem {
  productId: string
  quantity: number
  price: number
  productName?: string
  remarks?: string
  selectedOptions?: string | string[]
}

interface CreateOrderResponse {
  order: {
    id: string
    eventOrderNumber: string
    status: string
  }
  items: unknown[]
  eventOrderNumber: string
}

export interface UsePosOrderOptions {
  /** API base path for orders, defaults to '/api/sales/events' */
  apiBasePath?: string
  /** Whether to trigger print queue after checkout (if printing enabled) */
  enablePrinting?: boolean
}

/**
 * Calculate item price including option modifiers
 */
function calculateItemPrice(item: CartItem): number {
  let price = Number(item.product.price)
  if (item.selectedOptions && item.product.options) {
    const optionIds = Array.isArray(item.selectedOptions)
      ? item.selectedOptions
      : [item.selectedOptions]
    for (const id of optionIds) {
      const option = item.product.options.find(o => o.id === id)
      if (option?.priceModifier) {
        price += option.priceModifier
      }
    }
  }
  return price
}

/**
 * POS Order composable for cart management and checkout
 *
 * @example
 * ```ts
 * const { cartItems, addToCart, checkout } = usePosOrder()
 *
 * // Add product to cart
 * addToCart(product, 'Extra sauce', ['option-1'])
 *
 * // Checkout
 * selectedEventId.value = 'event-123'
 * const order = await checkout()
 * ```
 */
export function usePosOrder(options: UsePosOrderOptions = {}) {
  const {
    apiBasePath = '/api/sales/events',
    enablePrinting = false
  } = options

  const cartItems = ref<CartItem[]>([])
  const selectedEventId = ref<string | null>(null)
  const selectedClientId = ref<string | null>(null)
  const selectedClientName = ref<string | null>(null)
  const overallRemarks = ref<string | null>(null)
  const isPersonnel = ref(false)
  const isCheckingOut = ref(false)

  const cartTotal = computed(() =>
    cartItems.value.reduce((sum, item) => sum + (calculateItemPrice(item) * item.quantity), 0)
  )

  const cartItemCount = computed(() =>
    cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  const isEmpty = computed(() => cartItems.value.length === 0)

  /**
   * Add a product to the cart
   * Products with remarks or options are always added as new items
   */
  function addToCart(
    product: SalesProduct,
    remarks?: string,
    selectedOptions?: string | string[]
  ) {
    // If product has remarks or options, always add as new item
    if (remarks || selectedOptions) {
      cartItems.value.push({ product, quantity: 1, remarks, selectedOptions })
      return
    }

    const existing = cartItems.value.find(i =>
      i.product.id === product.id && !i.remarks && !i.selectedOptions
    )
    if (existing) {
      existing.quantity++
    }
    else {
      cartItems.value.push({ product, quantity: 1 })
    }
  }

  /**
   * Remove an item from the cart by index
   */
  function removeFromCart(index: number) {
    if (index >= 0 && index < cartItems.value.length) {
      cartItems.value.splice(index, 1)
    }
  }

  /**
   * Update the quantity of a cart item
   * If quantity is 0 or less, the item is removed
   */
  function updateQuantity(index: number, quantity: number) {
    if (index >= 0 && index < cartItems.value.length) {
      if (quantity <= 0) {
        removeFromCart(index)
      }
      else {
        const item = cartItems.value[index]
        if (item) {
          item.quantity = quantity
        }
      }
    }
  }

  /**
   * Clear the entire cart
   */
  function clearCart() {
    cartItems.value = []
    overallRemarks.value = null
    isPersonnel.value = false
  }

  /**
   * Get the price for a specific cart item (including option modifiers)
   */
  function getItemPrice(item: CartItem): number {
    return calculateItemPrice(item)
  }

  /**
   * Get the line total for a cart item (price * quantity)
   */
  function getItemTotal(item: CartItem): number {
    return calculateItemPrice(item) * item.quantity
  }

  /**
   * Checkout and create an order
   * @throws Error if no event selected or cart is empty
   */
  async function checkout(): Promise<CreateOrderResponse> {
    if (!selectedEventId.value) {
      throw new Error('No event selected')
    }

    if (cartItems.value.length === 0) {
      throw new Error('Cart is empty')
    }

    isCheckingOut.value = true

    try {
      // Build order items with adjusted prices for options
      const items: OrderItem[] = cartItems.value.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: calculateItemPrice(item),
        productName: item.product.title,
        remarks: item.remarks,
        selectedOptions: item.selectedOptions
      }))

      // Create order via API
      const response = await $fetch<CreateOrderResponse>(
        `${apiBasePath}/${selectedEventId.value}/orders`,
        {
          method: 'POST',
          body: {
            items,
            total: cartTotal.value,
            clientId: selectedClientId.value,
            clientName: selectedClientName.value,
            overallRemarks: overallRemarks.value,
            isPersonnel: isPersonnel.value
          }
        }
      )

      // Trigger print queue generation if enabled
      if (enablePrinting) {
        try {
          await $fetch(
            `${apiBasePath}/${selectedEventId.value}/orders/${response.order.id}/print`,
            { method: 'POST' }
          )
        }
        catch (printError) {
          // Log but don't fail checkout if printing fails
          console.error('Failed to trigger print queue:', printError)
        }
      }

      // Clear cart after successful checkout
      clearCart()
      selectedClientId.value = null
      selectedClientName.value = null

      return response
    }
    finally {
      isCheckingOut.value = false
    }
  }

  return {
    // State
    cartItems: readonly(cartItems),
    selectedEventId,
    selectedClientId,
    selectedClientName,
    overallRemarks,
    isPersonnel,
    isCheckingOut: readonly(isCheckingOut),

    // Computed
    cartTotal,
    cartItemCount,
    isEmpty,

    // Methods
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getItemPrice,
    getItemTotal,
    checkout
  }
}

export default usePosOrder
