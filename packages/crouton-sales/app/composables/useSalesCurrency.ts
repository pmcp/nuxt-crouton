/**
 * Per-event currency formatting.
 *
 * Product prices are stored as plain numbers; the currency is purely a display
 * concern set on the event (`salesEvents.currency`, 'EUR' | 'USD', default
 * 'EUR'). This composable centralises the symbol + `Intl.NumberFormat` so every
 * price across the admin workspace and the customer POS renders consistently.
 *
 * Two ways to get the active currency:
 *  - **provide/inject** — a container that has the event (OrderInterface, the
 *    workspace tabs) calls `provideSalesCurrency(() => event.currency)`, then any
 *    descendant (cart total, product list, line items) calls `useSalesCurrency()`
 *    with no argument and inherits it.
 *  - **explicit** — pass the currency directly: `useSalesCurrency(() => event.currency)`.
 *    Use this in a component that both knows the currency and renders prices
 *    itself (it can't inject its own provided value).
 */
import type { MaybeRefOrGetter } from 'vue'

export type SalesCurrencyCode = 'EUR' | 'USD'

const CURRENCY_CONFIG: Record<SalesCurrencyCode, { locale: string, symbol: string }> = {
  EUR: { locale: 'nl-BE', symbol: '€' },
  USD: { locale: 'en-US', symbol: '$' }
}

const DEFAULT_CURRENCY: SalesCurrencyCode = 'EUR'

const SALES_CURRENCY_KEY = Symbol('salesCurrency') as InjectionKey<ComputedRef<SalesCurrencyCode>>

function normalize(value: unknown): SalesCurrencyCode {
  return value === 'USD' ? 'USD' : DEFAULT_CURRENCY
}

/**
 * Provide the active currency to descendants. Call from a container that owns
 * the event (e.g. the POS OrderInterface or a workspace tab).
 */
export function provideSalesCurrency(source: MaybeRefOrGetter<string | null | undefined>) {
  provide(SALES_CURRENCY_KEY, computed(() => normalize(toValue(source))))
}

/**
 * Read the active currency and a `format()` helper. Pass `override` when the
 * calling component knows the currency directly; otherwise it falls back to the
 * provided value, then the EUR default.
 */
export function useSalesCurrency(override?: MaybeRefOrGetter<string | null | undefined>) {
  const injected = inject(SALES_CURRENCY_KEY, null)

  const code = computed<SalesCurrencyCode>(() => {
    const raw = override !== undefined ? toValue(override) : undefined
    return normalize(raw ?? injected?.value)
  })

  const symbol = computed(() => CURRENCY_CONFIG[code.value].symbol)

  const format = (amount: number | string | null | undefined) => {
    const config = CURRENCY_CONFIG[code.value]
    return new Intl.NumberFormat(config.locale, { style: 'currency', currency: code.value })
      .format(Number(amount) || 0)
  }

  return { code, symbol, format }
}

export const SALES_CURRENCY_OPTIONS: { label: string, value: SalesCurrencyCode }[] = [
  { label: 'Euro (€)', value: 'EUR' },
  { label: 'Dollar ($)', value: 'USD' }
]
