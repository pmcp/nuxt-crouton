interface StatusMessage {
  id: string
  text: string
  icon: string
  type: 'success' | 'warning' | 'error'
  timestamp: number
  collection?: string
  operation?: string
}

const EXPIRE_MS = 4000

// Module-scoped flag — not useState, which leaks SSR→client and skips client registration
let hookRegistered = false

/**
 * Derive a human-readable singular noun from a collection key.
 * e.g. "pagesPages" → "page", "bookingsLocations" → "location", "shopProducts" → "product"
 */
function collectionLabel(key: string): string {
  // Strip common layer prefixes (the part before the last uppercase segment)
  // e.g. "pagesPages" → "Pages", "bookingsLocations" → "Locations"
  const match = key.match(/[A-Z][a-z]+$/)
  const raw = match ? match[0] : key
  // Singularize: strip trailing "s" (simple heuristic, good enough for labels)
  const singular = raw.endsWith('s') && raw.length > 2 ? raw.slice(0, -1) : raw
  return singular.toLowerCase()
}

/**
 * Extract an item's display name from mutation data using display config or common field heuristics.
 */
function extractItemName(
  collection: string,
  data?: Record<string, unknown>,
  result?: unknown,
): string | undefined {
  const record = (result && typeof result === 'object' ? result : data) as Record<string, unknown> | undefined
  if (!record) return undefined

  // Try display config title field first
  try {
    const display = useDisplayConfig(collection)
    if (display.title && record[display.title]) {
      return String(record[display.title])
    }
  } catch {
    // Collection may not have config — fall through to heuristics
  }

  // Heuristic: common name fields
  for (const field of ['title', 'name', 'label', 'subject', 'displayName']) {
    if (record[field] && typeof record[field] === 'string') {
      return record[field] as string
    }
  }
  return undefined
}

/**
 * Get current user's first name for status messages.
 */
function getUserFirstName(): string | undefined {
  try {
    const user = useState<{ name?: string } | null>('crouton-auth-user')
    const fullName = user.value?.name
    if (!fullName) return undefined
    return fullName.split(' ')[0]
  } catch {
    return undefined
  }
}

export function useAdminStatusBar() {
  const { t } = useT()
  const messages = useState<StatusMessage[]>('crouton-status-bar-messages', () => [])
  const lastMessage = useState<StatusMessage | null>('crouton-status-bar-last', () => null)

  const currentMessage = computed<StatusMessage | undefined>(() => messages.value[0])

  const addMessage = (msg: Omit<StatusMessage, 'id' | 'timestamp'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const full = { ...msg, id, timestamp: Date.now() }
    messages.value = [full, ...messages.value]
    lastMessage.value = full

    setTimeout(() => {
      messages.value = messages.value.filter((m: StatusMessage) => m.id !== id)
    }, EXPIRE_MS)
  }

  // Register listener once per JS runtime (SSR and client each get their own)
  if (!hookRegistered) {
    hookRegistered = true

    const nuxtApp = useNuxtApp()
    nuxtApp.hook('crouton:mutation', (event: { operation: string; collection: string; itemIds?: string[]; data?: Record<string, unknown>; result?: unknown }) => {
      const { operation, collection, itemIds, data, result } = event
      const userName = getUserFirstName()
      const itemName = extractItemName(collection, data, result)
      const label = collectionLabel(collection)

      let text = ''
      let icon = 'i-lucide-check'

      // Truncate long item names
      const shortName = itemName && itemName.length > 30 ? `${itemName.slice(0, 30)}…` : itemName

      const user = userName || t('statusBar.defaultUser')

      if (operation === 'create') {
        text = shortName
          ? t('statusBar.createdNamed', { user, label, name: shortName })
          : t('statusBar.created', { user, label })
        icon = 'i-lucide-plus'
      } else if (operation === 'update') {
        text = shortName
          ? t('statusBar.savedNamed', { user, name: shortName })
          : t('statusBar.saved', { user, label })
        icon = 'i-lucide-check'
      } else if (operation === 'delete') {
        const count = Array.isArray(itemIds) ? itemIds.length : 1
        text = count > 1
          ? t('statusBar.deletedMultiple', { user, count, label })
          : t('statusBar.deleted', { user, label })
        icon = 'i-lucide-trash-2'
      } else if (operation === 'move' || operation === 'reorder') {
        text = t('statusBar.reordered', { user, label })
        icon = 'i-lucide-arrow-up-down'
      } else {
        text = t('statusBar.done')
      }

      addMessage({ text, icon, type: 'success', collection, operation })
    })
  }

  return { messages, currentMessage, lastMessage, addMessage }
}
