<script setup lang="ts">
import type { SchemaField } from '~/types/schema'

const props = defineProps<{
  field: SchemaField
  index: number
}>()

const { getFieldIcon } = useFieldTypes()
const { selectField, removeField, updateField } = useSchemaDesigner()

const isEditing = ref(false)
const editName = ref('')

function startEdit() {
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
</script>

<template>
  <div
    class="group flex items-center gap-3 px-4 py-3 bg-[var(--ui-bg)] border border-[var(--ui-border)]
           rounded-lg hover:border-[var(--ui-primary)] cursor-pointer transition-colors"
    @click="selectField(field.id)"
  >
    <!-- Drag Handle -->
    <div class="cursor-grab active:cursor-grabbing text-[var(--ui-text-muted)]">
      <UIcon name="i-lucide-grip-vertical" />
    </div>

    <!-- Field Type Icon -->
    <UIcon
      :name="getFieldIcon(field.type)"
      class="text-lg text-[var(--ui-text-muted)]"
    />

    <!-- Field Name -->
    <div class="flex-1 min-w-0">
      <div v-if="!isEditing" class="flex items-center gap-2">
        <span
          class="font-medium cursor-text"
          :class="{ 'text-[var(--ui-text-muted)] italic': !field.name }"
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
        variant="ghost"
        color="error"
        size="xs"
        icon="i-lucide-trash-2"
        @click.stop="removeField(field.id)"
      />
    </div>
  </div>
</template>
