<script setup lang="ts">
import type { FieldType } from '../../types/schema'
import type { RefTargetOption } from '../../composables/useProjectComposer'

const { FIELD_TYPES } = useFieldTypes()
const { addField, updateField } = useSchemaDesigner()

// Try to use project composer for reference targets (may not be available in standalone mode)
let refTargets: Ref<RefTargetOption[]>
let hasProjectComposer = false

try {
  const composer = useProjectComposer()
  refTargets = computed(() => composer.getRefTargets())
  hasProjectComposer = true
} catch {
  // Project composer not available, use empty ref targets
  refTargets = ref([])
}

const searchQuery = ref('')

const filteredTypes = computed(() => {
  if (!searchQuery.value) return FIELD_TYPES
  const q = searchQuery.value.toLowerCase()
  return FIELD_TYPES.filter(
    ft => ft.label.toLowerCase().includes(q) || ft.type.includes(q) || ft.description.toLowerCase().includes(q)
  )
})

// Group reference targets by source
const packageRefTargets = computed(() =>
  refTargets.value.filter(t => t.group === 'package')
)

const customRefTargets = computed(() =>
  refTargets.value.filter(t => t.group === 'custom')
)

const hasRefTargets = computed(() => refTargets.value.length > 0)

function onDragStart(event: DragEvent, type: FieldType) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('field-type', type)
    event.dataTransfer.effectAllowed = 'copy'
  }
}

function handleClick(type: FieldType) {
  addField(type)
}

function handleRefClick(target: RefTargetOption) {
  // Add a reference field with the target pre-set
  const fieldId = addField('reference')
  if (fieldId) {
    // Set the refTarget and suggest a field name based on the target
    const suggestedName = target.label.split(':').pop()?.trim().toLowerCase() || ''
    updateField(fieldId, {
      refTarget: target.value,
      name: suggestedName ? `${suggestedName}Id` : ''
    })
  }
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div>
      <h2 class="text-sm font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide mb-2">
        Field Types
      </h2>
      <UInput
        v-model="searchQuery"
        placeholder="Search fields..."
        icon="i-lucide-search"
        size="sm"
      />
    </div>

    <div class="space-y-1">
      <button
        v-for="fieldType in filteredTypes"
        :key="fieldType.type"
        draggable="true"
        class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors
               hover:bg-[var(--ui-bg-elevated-hover)] cursor-grab active:cursor-grabbing
               border border-transparent hover:border-[var(--ui-border)]"
        @dragstart="onDragStart($event, fieldType.type)"
        @click="handleClick(fieldType.type)"
      >
        <UIcon
          :name="fieldType.icon"
          class="text-lg text-[var(--ui-text-muted)]"
        />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium">{{ fieldType.label }}</div>
          <div class="text-xs text-[var(--ui-text-muted)] truncate">
            {{ fieldType.description }}
          </div>
        </div>
        <UIcon
          name="i-lucide-plus"
          class="text-[var(--ui-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </button>
    </div>

    <USeparator />

    <div class="text-xs text-[var(--ui-text-muted)]">
      <p>Click or drag a field type to add it to your schema.</p>
    </div>

    <!-- References Section -->
    <template v-if="hasRefTargets">
      <USeparator />

      <div>
        <h2 class="text-sm font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide mb-3">
          References
        </h2>
        <p class="text-xs text-[var(--ui-text-muted)] mb-3">
          Click to add a reference field to another collection.
        </p>

        <!-- Package Collections -->
        <div v-if="packageRefTargets.length > 0" class="mb-4">
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-lucide-package" class="text-[var(--ui-text-muted)]" />
            <span class="text-xs font-medium text-[var(--ui-text-muted)]">Package Collections</span>
          </div>
          <div class="space-y-1">
            <button
              v-for="target in packageRefTargets"
              :key="target.value"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors
                     hover:bg-[var(--ui-bg-elevated-hover)] cursor-pointer
                     border border-transparent hover:border-[var(--ui-border)]"
              @click="handleRefClick(target)"
            >
              <UIcon
                name="i-lucide-link"
                class="text-lg text-blue-500"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{{ target.label }}</div>
                <div class="text-xs text-[var(--ui-text-muted)] truncate font-mono">
                  {{ target.value }}
                </div>
              </div>
              <UBadge color="info" size="xs" variant="subtle">
                package
              </UBadge>
            </button>
          </div>
        </div>

        <!-- Custom Collections -->
        <div v-if="customRefTargets.length > 0">
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-lucide-layers" class="text-[var(--ui-text-muted)]" />
            <span class="text-xs font-medium text-[var(--ui-text-muted)]">Custom Collections</span>
          </div>
          <div class="space-y-1">
            <button
              v-for="target in customRefTargets"
              :key="target.value"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors
                     hover:bg-[var(--ui-bg-elevated-hover)] cursor-pointer
                     border border-transparent hover:border-[var(--ui-border)]"
              @click="handleRefClick(target)"
            >
              <UIcon
                name="i-lucide-link"
                class="text-lg text-emerald-500"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{{ target.label }}</div>
                <div class="text-xs text-[var(--ui-text-muted)] truncate font-mono">
                  {{ target.value }}
                </div>
              </div>
              <UBadge color="success" size="xs" variant="subtle">
                custom
              </UBadge>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
