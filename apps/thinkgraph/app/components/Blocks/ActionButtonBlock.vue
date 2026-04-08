<script setup lang="ts">
/**
 * ActionButtonBlock — Vue NodeView for `actionButton` TipTap nodes.
 *
 * PR 2 of the notion-slideover series. Pi appends action buttons into the
 * per-node Yjs fragment via `pi.appendActionButton`; this component is what
 * the TipTap extension renders for each one. The button is inert until a
 * human clicks it; on click it looks up the action `kind` in the registry
 * provided by the enclosing NodeBlockEditor and runs the handler.
 *
 * Note: explicit imports because VueNodeViewRenderer mounts this component
 * via TipTap and bypasses Nuxt auto-imports.
 */
import { computed, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useNodeActionHandlers } from '../../composables/useNodeActionHandlers'

interface ActionButtonAttrs {
  label: string
  icon: string
  kind: string
  /** null = no payload — handlers see {} via the `payloadObject` computed below */
  payload: Record<string, unknown> | null
  consumed: boolean
  result: Record<string, unknown> | null
}

const props = defineProps<{
  node: { attrs: ActionButtonAttrs }
  selected: boolean
  updateAttributes: (attrs: Partial<ActionButtonAttrs>) => void
  deleteNode: () => void
  getPos: () => number
  editor: unknown
}>()

const attrs = computed(() => props.node.attrs)
const registry = useNodeActionHandlers()

const running = ref(false)

const isReady = computed(() => {
  if (attrs.value.consumed) return false
  if (running.value) return false
  if (!registry) return false
  return Boolean(registry.handlers[attrs.value.kind])
})

const iconName = computed(() => {
  if (attrs.value.consumed) return 'i-lucide-check-circle-2'
  return attrs.value.icon || 'i-lucide-plus'
})

const buttonLabel = computed(() => {
  if (running.value) return 'Working…'
  if (attrs.value.consumed) {
    const result = attrs.value.result
    if (result && typeof result === 'object' && 'createdTitle' in result) {
      const title = (result as Record<string, unknown>).createdTitle
      if (typeof title === 'string') return `Created: ${title}`
    }
    return 'Done'
  }
  return attrs.value.label || 'Action'
})

const consumedNodeId = computed(() => {
  const result = attrs.value.result
  if (result && typeof result === 'object' && 'createdNodeId' in result) {
    const id = (result as Record<string, unknown>).createdNodeId
    if (typeof id === 'string') return id
  }
  return null
})

async function handleClick() {
  if (!registry) {
    console.warn('[ActionButtonBlock] Clicked outside a slideover registry — no handlers available')
    return
  }
  if (attrs.value.consumed || running.value) return

  const handler = registry.handlers[attrs.value.kind]
  if (!handler) {
    console.warn(`[ActionButtonBlock] Unknown action kind: ${attrs.value.kind}`)
    return
  }

  running.value = true
  try {
    // Coerce null/missing payload to {} so handlers can index into it freely.
    const payload = (attrs.value.payload && typeof attrs.value.payload === 'object')
      ? attrs.value.payload
      : {}
    await handler(
      registry.ctx,
      payload,
      {
        markConsumed: (extra) => {
          props.updateAttributes({
            consumed: true,
            result: extra ?? null,
          })
        },
      },
    )
  } finally {
    running.value = false
  }
}
</script>

<template>
  <NodeViewWrapper
    class="block-wrapper my-2"
    data-type="action-button"
    :class="{ 'ring-1 ring-primary/40 rounded-lg': selected }"
  >
    <!--
      Stable single <button> root — no v-if element swaps inside the
      NodeView. Switching between element types (button↔span) inside a
      TipTap NodeView while a Yjs update is in flight can put Vue's
      patcher in an inconsistent state, so consumed and active states
      both render via the same <button>, with `disabled` and label text
      driven by computed values.
    -->
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-lg border border-default bg-elevated px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed"
      :class="{
        'opacity-70 text-muted': attrs.consumed,
        'text-default hover:border-primary hover:text-primary': !attrs.consumed,
      }"
      :disabled="!isReady"
      @click="handleClick"
    >
      <UIcon
        :name="iconName"
        class="size-4 shrink-0"
        :class="attrs.consumed ? 'text-success' : 'text-primary'"
      />
      <span>{{ buttonLabel }}</span>
      <span v-if="consumedNodeId" class="text-xs text-muted/80">· {{ consumedNodeId.slice(0, 8) }}</span>
    </button>
  </NodeViewWrapper>
</template>
