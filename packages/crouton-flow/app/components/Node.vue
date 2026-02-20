<script setup lang="ts">
import { computed, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'

/**
 * CroutonFlowNode - Default node component for Vue Flow
 *
 * This is the fallback node used when no custom [Collection]Node.vue exists.
 * It displays the item's title, name, or label in a styled card.
 *
 * To customize, create your own node component:
 * app/components/[Collection]Node.vue
 */

interface Props {
  /** The data item from the collection */
  data: Record<string, unknown>
  /** Whether this node is selected */
  selected?: boolean
  /** Whether this node is being dragged */
  dragging?: boolean
  /** Label to display (fallback to title/name/id) */
  label?: string
  /** Collection name for CRUD operations */
  collection?: string
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  dragging: false,
  label: '',
  collection: ''
})

// Crouton integration for edit/delete
const { open } = useCrouton()
const isHovered = ref(false)

const nodeId = computed(() => String(props.data?.id || ''))

function handleEdit(event: Event) {
  event.stopPropagation()
  if (props.collection && nodeId.value) {
    open('update', props.collection, [nodeId.value])
  }
}

function handleDelete(event: Event) {
  event.stopPropagation()
  if (props.collection && nodeId.value) {
    open('delete', props.collection, [nodeId.value])
  }
}

// Determine the display label
const displayLabel = computed(() => {
  if (props.label) return props.label
  if (props.data?.title) return String(props.data.title)
  if (props.data?.name) return String(props.data.name)
  if (props.data?.content) {
    // Truncate long content
    const content = String(props.data.content)
    return content.length > 50 ? content.slice(0, 47) + '...' : content
  }
  if (props.data?.id) return String(props.data.id)
  return 'Node'
})

// Optional subtitle (type, status, etc.)
const subtitle = computed(() => {
  if (props.data?.type) return String(props.data.type)
  if (props.data?.status) return String(props.data.status)
  return null
})
</script>

<template>
  <div
    class="crouton-flow-node"
    :class="{
      'crouton-flow-node--selected': selected,
      'crouton-flow-node--dragging': dragging
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Input handle (top) -->
    <Handle
      type="target"
      :position="Position.Top"
      class="crouton-flow-handle"
    />

    <!-- Action buttons (show on hover) -->
    <div
      v-if="collection && isHovered"
      class="crouton-flow-node__actions"
    >
      <button
        class="crouton-flow-node__action crouton-flow-node__action--edit"
        title="Edit"
        @click="handleEdit"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
      <button
        class="crouton-flow-node__action crouton-flow-node__action--delete"
        title="Delete"
        @click="handleDelete"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line
            x1="10"
            x2="10"
            y1="11"
            y2="17"
          />
          <line
            x1="14"
            x2="14"
            y1="11"
            y2="17"
          />
        </svg>
      </button>
    </div>

    <!-- Node content -->
    <div class="crouton-flow-node__content">
      <span class="crouton-flow-node__label">{{ displayLabel }}</span>
      <span
        v-if="subtitle"
        class="crouton-flow-node__subtitle"
      >
        {{ subtitle }}
      </span>
    </div>

    <!-- Output handle (bottom) -->
    <Handle
      type="source"
      :position="Position.Bottom"
      class="crouton-flow-handle"
    />
  </div>
</template>

<style scoped>
.crouton-flow-node {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e5e5;
  background-color: #fff;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 120px;
  max-width: 200px;
  position: relative;
}

:global(.dark) .crouton-flow-node {
  background-color: #171717;
  border-color: #404040;
}

.crouton-flow-node--selected {
  outline: 2px solid color-mix(in srgb, var(--color-primary-500) 20%, transparent);
  outline-offset: 0;
  border-color: var(--color-primary-500);
}

.crouton-flow-node--dragging {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  transform: scale(1.05);
  cursor: grabbing;
}

.crouton-flow-node__actions {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  display: flex;
  gap: 0.25rem;
  z-index: 10;
}

.crouton-flow-node__action {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border: 1px solid #e5e5e5;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

:global(.dark) .crouton-flow-node__action {
  background-color: #262626;
  border-color: #525252;
}

.crouton-flow-node__action:hover {
  transform: scale(1.1);
}

.crouton-flow-node__action--edit {
  color: #2563eb;
}

:global(.dark) .crouton-flow-node__action--edit {
  color: #60a5fa;
}

.crouton-flow-node__action--edit:hover {
  background-color: #eff6ff;
}

:global(.dark) .crouton-flow-node__action--edit:hover {
  background-color: rgb(30 58 138 / 0.3);
}

.crouton-flow-node__action--delete {
  color: #dc2626;
}

:global(.dark) .crouton-flow-node__action--delete {
  color: #f87171;
}

.crouton-flow-node__action--delete:hover {
  background-color: #fef2f2;
}

:global(.dark) .crouton-flow-node__action--delete:hover {
  background-color: rgb(127 29 29 / 0.3);
}

.crouton-flow-node__content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.crouton-flow-node__label {
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  color: #171717;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.dark) .crouton-flow-node__label {
  color: #f5f5f5;
}

.crouton-flow-node__subtitle {
  font-size: 0.75rem;
  line-height: 1rem;
  color: #737373;
  text-transform: capitalize;
}

:global(.dark) .crouton-flow-node__subtitle {
  color: #a3a3a3;
}

.crouton-flow-handle {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: #a3a3a3;
  border: 1px solid #fff;
  transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

:global(.dark) .crouton-flow-handle {
  background-color: #737373;
  border-color: #262626;
}

.crouton-flow-handle:hover {
  background-color: var(--color-primary-500);
}
</style>
