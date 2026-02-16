<script setup lang="ts">
/**
 * Block Property Panel
 *
 * Slideover panel for editing block properties.
 * Renders appropriate inputs based on block schema.
 *
 * Uses LOCAL STATE ISOLATION pattern (inspired by Nuxt Studio):
 * - Form inputs bind to local refs only
 * - Changes are applied on explicit "Done" action
 * - Prevents feedback loops and focus stealing
 */
import type { Node } from '@tiptap/pm/model'
import type { BlockType, BlockPropertySchema } from '../../types/blocks'
import { getBlockDefinition } from '../../utils/block-registry'

interface Props {
  node: Node
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [attrs: Record<string, unknown>]
  delete: []
  close: []
}>()

// Get block definition and schema
const blockType = computed(() => props.node.type.name as BlockType)
const blockDefinition = computed(() => getBlockDefinition(blockType.value))

// Local state for editing (copy of node attrs)
// Changes are ONLY applied when user clicks "Done"
const localAttrs = ref<Record<string, unknown>>({})

// Track which block type we're editing to detect when a different block is selected
const editingBlockType = ref<string | null>(null)

// Initialize local attrs from node only when a NEW block is selected (different type)
watch(() => props.node, (node, oldNode) => {
  // Only reset if this is a different block TYPE (not just attrs changed from external update)
  if (node.type.name !== editingBlockType.value) {
    localAttrs.value = { ...node.attrs }
    editingBlockType.value = node.type.name
  }
}, { immediate: true })

// Handle field change - LOCAL ONLY, no emit
// This is the key to preventing feedback loops
function onFieldChange(fieldName: string, value: unknown) {
  localAttrs.value[fieldName] = value
  // NOTE: We do NOT emit here - changes are batched and applied on "Done"
}

// Apply all changes and close
function onDone() {
  // Emit all local changes at once
  emit('update', { ...localAttrs.value })
  emit('close')
}

// Handle delete
function onDelete() {
  emit('delete')
}
</script>

<template>
  <div class="block-property-panel h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-default">
      <div class="flex items-center gap-2">
        <UIcon
          v-if="blockDefinition?.icon"
          :name="blockDefinition.icon"
          class="size-5 text-primary"
        />
        <h3 class="text-lg font-semibold">
          {{ blockDefinition?.name || 'Block' }} Settings
        </h3>
      </div>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        size="sm"
        @click="emit('close')"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4">
      <div v-if="blockDefinition" class="space-y-4">
        <template v-for="field in blockDefinition.schema" :key="field.name">
          <!-- Text Input -->
          <UFormField
            v-if="field.type === 'text'"
            :label="field.label"
            :name="field.name"
            :description="field.description"
          >
            <UInput
              :model-value="localAttrs[field.name] as string || ''"
              class="w-full"
              @update:model-value="onFieldChange(field.name, $event)"
            />
          </UFormField>

          <!-- Textarea -->
          <UFormField
            v-else-if="field.type === 'textarea'"
            :label="field.label"
            :name="field.name"
            :description="field.description"
          >
            <UTextarea
              :model-value="localAttrs[field.name] as string || ''"
              :rows="3"
              class="w-full"
              @update:model-value="onFieldChange(field.name, $event)"
            />
          </UFormField>

          <!-- Select -->
          <UFormField
            v-else-if="field.type === 'select'"
            :label="field.label"
            :name="field.name"
            :description="field.description"
          >
            <USelect
              :model-value="localAttrs[field.name] as string || field.defaultValue as string"
              :items="field.options || []"
              value-key="value"
              class="w-full"
              @update:model-value="onFieldChange(field.name, $event)"
            />
          </UFormField>

          <!-- Switch -->
          <UFormField
            v-else-if="field.type === 'switch'"
            :label="field.label"
            :name="field.name"
            :description="field.description"
          >
            <USwitch
              :model-value="localAttrs[field.name] as boolean || false"
              @update:model-value="onFieldChange(field.name, $event)"
            />
          </UFormField>

          <!-- Icon Picker -->
          <UFormField
            v-else-if="field.type === 'icon'"
            :label="field.label"
            :name="field.name"
            :description="field.description"
          >
            <UInput
              :model-value="localAttrs[field.name] as string || ''"
              placeholder="i-lucide-star"
              class="w-full"
              @update:model-value="onFieldChange(field.name, $event)"
            >
              <template #leading>
                <UIcon
                  v-if="localAttrs[field.name]"
                  :name="localAttrs[field.name] as string"
                  class="size-4"
                />
              </template>
            </UInput>
          </UFormField>

          <!-- Image Editor -->
          <UFormField
            v-else-if="field.type === 'image'"
            :label="field.label"
            :name="field.name"
            :description="field.description"
          >
            <CroutonPagesBlocksPropertiesImageEditor
              :model-value="(localAttrs[field.name] as string) || ''"
              @update:model-value="onFieldChange(field.name, $event)"
            />
          </UFormField>

          <!-- Links Editor -->
          <UFormField
            v-else-if="field.type === 'links'"
            :label="field.label"
            :name="field.name"
            :description="field.description"
          >
            <CroutonPagesBlocksPropertiesLinksEditor
              :model-value="(localAttrs[field.name] as any[]) || []"
              @update:model-value="onFieldChange(field.name, $event)"
            />
          </UFormField>

          <!-- Features Editor -->
          <UFormField
            v-else-if="field.type === 'features'"
            :label="field.label"
            :name="field.name"
            :description="field.description"
          >
            <CroutonPagesBlocksPropertiesFeaturesEditor
              :model-value="(localAttrs[field.name] as any[]) || []"
              @update:model-value="onFieldChange(field.name, $event)"
            />
          </UFormField>

          <!-- Cards Editor -->
          <UFormField
            v-else-if="field.type === 'cards'"
            :label="field.label"
            :name="field.name"
            :description="field.description"
          >
            <CroutonPagesBlocksPropertiesCardsEditor
              :model-value="(localAttrs[field.name] as any[]) || []"
              @update:model-value="onFieldChange(field.name, $event)"
            />
          </UFormField>

          <!-- Collection Picker -->
          <UFormField
            v-else-if="field.type === 'collection'"
            :label="field.label"
            :name="field.name"
            :description="field.description"
          >
            <CroutonPagesBlocksPropertiesCollectionPicker
              :model-value="localAttrs[field.name] as string || ''"
              @update:model-value="onFieldChange(field.name, $event)"
            />
          </UFormField>
        </template>
      </div>

      <div v-else class="text-center text-muted py-8">
        <UIcon name="i-lucide-alert-circle" class="size-8 mb-2" />
        <p>Unknown block type</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between p-4 border-t border-default">
      <UButton
        color="error"
        variant="ghost"
        icon="i-lucide-trash-2"
        size="sm"
        @click="onDelete"
      >
        Delete Block
      </UButton>
      <UButton
        color="primary"
        size="sm"
        @click="onDone"
      >
        Done
      </UButton>
    </div>
  </div>
</template>
