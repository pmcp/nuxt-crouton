<script setup lang="ts">
import type { SchemaField } from '../../types/schema'

const props = defineProps<{
  field: SchemaField
  index: number
  isNew?: boolean
}>()

const { getFieldIcon } = useFieldTypes()
const { selectField, removeField, updateField } = useSchemaDesigner()

// Animation state for AI-added fields
const showNewAnimation = ref(props.isNew || false)

// Check if field is locked (from package)
const isLocked = computed(() => props.field.locked === true)
const fromPackage = computed(() => props.field.fromPackage)

// Clear animation after delay
watch(() => props.isNew, (isNew) => {
  if (isNew) {
    showNewAnimation.value = true
    setTimeout(() => {
      showNewAnimation.value = false
    }, 2500)
  }
}, { immediate: true })

const isEditing = ref(false)
const editName = ref('')

function startEdit() {
  // Don't allow editing locked field names
  if (isLocked.value) return

  editName.value = props.field.name
  isEditing.value = true
  nextTick(() => {
    const input = document.querySelector(`#field-name-${props.field.id}`) as HTMLInputElement
    input?.focus()
    input?.select()
  })
}

function saveEdit() {
  if (editName.value.trim()) {
    updateField(props.field.id, { name: editName.value.trim() })
  }
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    saveEdit()
  } else if (e.key === 'Escape') {
    cancelEdit()
  }
}

function handleDelete() {
  if (isLocked.value) return
  removeField(props.field.id)
}
</script>

<template>
  <div
    class="group flex items-center gap-3 px-4 py-3 bg-[var(--ui-bg)] border
           rounded-lg hover:border-[var(--ui-primary)] cursor-pointer transition-all duration-300"
    :class="[
      showNewAnimation
        ? 'border-[var(--ui-primary)] ring-2 ring-[var(--ui-primary)]/30 animate-pulse'
        : isLocked
          ? 'border-[var(--ui-border)] bg-[var(--ui-bg-muted)]/30'
          : 'border-[var(--ui-border)]'
    ]"
    @click="selectField(field.id)"
  >
    <!-- Drag Handle (hidden for locked fields) -->
    <div
      v-if="!isLocked"
      class="cursor-grab active:cursor-grabbing text-[var(--ui-text-muted)]"
    >
      <UIcon name="i-lucide-grip-vertical" />
    </div>
    <!-- Lock Icon (shown for locked fields) -->
    <div
      v-else
      class="text-[var(--ui-text-muted)]"
      title="This field is required by the package"
    >
      <UIcon name="i-lucide-lock" />
    </div>

    <!-- Field Type Icon -->
    <div class="relative">
      <UIcon
        :name="getFieldIcon(field.type)"
        class="text-lg text-[var(--ui-text-muted)]"
      />
      <UIcon
        v-if="showNewAnimation"
        name="i-lucide-sparkles"
        class="absolute -top-1 -right-1 text-xs text-[var(--ui-primary)] animate-bounce"
      />
    </div>

    <!-- Field Name -->
    <div class="flex-1 min-w-0">
      <div v-if="!isEditing" class="flex items-center gap-2">
        <span
          class="font-medium"
          :class="[
            !field.name ? 'text-[var(--ui-text-muted)] italic' : '',
            isLocked ? 'cursor-default' : 'cursor-text'
          ]"
          @click.stop="startEdit"
        >
          {{ field.name || 'unnamed' }}
        </span>
        <UBadge
          v-if="field.meta.required"
          color="primary"
          variant="subtle"
          size="xs"
        >
          required
        </UBadge>
        <UBadge
          v-if="isLocked"
          color="neutral"
          variant="subtle"
          size="xs"
        >
          <UIcon name="i-lucide-package" class="mr-1 text-[10px]" />
          package
        </UBadge>
      </div>
      <input
        v-else
        :id="`field-name-${field.id}`"
        v-model="editName"
        type="text"
        class="w-full bg-transparent border-none outline-none font-medium"
        placeholder="Field name"
        @blur="saveEdit"
        @keydown="handleKeydown"
        @click.stop
      />
    </div>

    <!-- Field Type Badge -->
    <UBadge color="neutral" variant="outline" size="xs">
      {{ field.type }}
    </UBadge>

    <!-- Actions -->
    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <UButton
        variant="ghost"
        color="neutral"
        size="xs"
        icon="i-lucide-settings-2"
        @click.stop="selectField(field.id)"
      />
      <UButton
        v-if="!isLocked"
        variant="ghost"
        color="error"
        size="xs"
        icon="i-lucide-trash-2"
        @click.stop="handleDelete"
      />
    </div>
  </div>
</template>
