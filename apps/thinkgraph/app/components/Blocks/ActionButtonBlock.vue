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
  payload: Record<string, unknown>
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

const consumedLabel = computed(() => {
  const result = attrs.value.result
  if (result && typeof result === 'object' && 'createdTitle' in result) {
    const title = (result as Record<string, unknown>).createdTitle
    if (typeof title === 'string') return `Created: ${title}`
  }
  return 'Done'
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
    await handler(
      registry.ctx,
      attrs.value.payload ?? {},
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
    <div
      class="inline-flex items-center gap-2 rounded-lg border border-default bg-elevated px-3 py-2 transition-colors"
      :class="{
        'opacity-70': attrs.consumed,
      }"
    >
      <UIcon
        :name="attrs.consumed ? 'i-lucide-check-circle-2' : (attrs.icon || 'i-lucide-plus')"
        class="size-4"
        :class="attrs.consumed ? 'text-success' : 'text-primary'"
      />

      <button
        v-if="!attrs.consumed"
        type="button"
        class="text-sm font-medium text-default hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!isReady"
        @click="handleClick"
      >
        <span v-if="running">Working…</span>
        <span v-else>{{ attrs.label || 'Action' }}</span>
      </button>

      <span v-else class="text-sm font-medium text-muted">
        {{ consumedLabel }}
        <span v-if="consumedNodeId" class="text-xs text-muted/80"> · {{ consumedNodeId.slice(0, 8) }}</span>
      </span>
    </div>
  </NodeViewWrapper>
</template>
