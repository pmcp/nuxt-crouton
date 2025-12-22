import { h, type Component } from 'vue'

/**
 * Composable that compiles user's Card.vue template code at runtime
 * and provides a component that can be used in CroutonCollection preview
 */
export function useCompiledCard() {
  const { state } = useSchemaDesigner()

  // Track compilation errors
  const compilationError = ref<string | null>(null)

  // Debounce template changes to avoid rapid recompilation
  const debouncedTemplate = refDebounced(
    computed(() => state.value.cardTemplate),
    300
  )

  // Compiled component - recreated when template changes
  const compiledComponent = computed<Component | null>(() => {
    const template = debouncedTemplate.value

    if (!template || !template.trim()) {
      compilationError.value = null
      return createFallbackComponent()
    }

    try {
      // Wrap template in a root element if it has multiple roots
      // Vue 3 supports fragments but for safety we wrap
      const wrappedTemplate = template.includes('<template')
        ? template
        : `<div>${template}</div>`

      // Create component with runtime-compiled template
      const component = defineComponent({
        name: 'CompiledPreviewCard',
        props: {
          item: { type: Object as () => Record<string, any>, required: true },
          layout: { type: String as () => 'list' | 'grid' | 'cards', required: true },
          collection: { type: String, required: true }
        },
        template: wrappedTemplate
      })

      compilationError.value = null
      return markRaw(component)
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Template compilation failed'
      compilationError.value = error
      console.warn('Template compilation error:', error)
      return createFallbackComponent()
    }
  })

  // Fallback component when no template or compilation error
  function createFallbackComponent(): Component {
    return markRaw(
      defineComponent({
        name: 'FallbackPreviewCard',
        props: {
          item: { type: Object as () => Record<string, any>, required: true },
          layout: { type: String as () => 'list' | 'grid' | 'cards', required: true },
          collection: { type: String, required: true }
        },
        setup(props) {
          return () => {
            const item = props.item
            const displayValue = item.title || item.name || item.label || 'Item'

            if (props.layout === 'list') {
              return h('div', { class: 'flex items-center gap-3 px-2' }, [
                h('span', { class: 'font-medium' }, String(displayValue))
              ])
            }

            return h('div', {
              class: 'bg-[var(--ui-bg)] border border-[var(--ui-border)] rounded-lg p-4 h-full'
            }, [
              h('h3', { class: 'font-semibold truncate' }, String(displayValue)),
              item.description
                ? h('p', { class: 'text-sm text-[var(--ui-text-muted)] mt-2 line-clamp-2' }, String(item.description))
                : null
            ])
          }
        }
      })
    )
  }

  return {
    compiledComponent,
    compilationError: readonly(compilationError)
  }
}
