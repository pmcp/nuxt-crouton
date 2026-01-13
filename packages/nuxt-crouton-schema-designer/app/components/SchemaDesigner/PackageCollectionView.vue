<script setup lang="ts">
import type { PackageCollection, ExtensionPoint, PackageSchemaField } from '../../types/package-manifest'
import type { SchemaField } from '../../types/schema'

interface Props {
  collection: PackageCollection
  extensionPoint?: ExtensionPoint
  extensionFields?: SchemaField[]
}

const props = withDefaults(defineProps<Props>(), {
  extensionFields: () => []
})

const emit = defineEmits<{
  'add-extension': []
  'remove-extension-field': [fieldId: string]
}>()

// Track expanded fields for showing details
const expandedFields = ref<Set<string>>(new Set())

function toggleFieldExpanded(fieldName: string) {
  if (expandedFields.value.has(fieldName)) {
    expandedFields.value.delete(fieldName)
  } else {
    expandedFields.value.add(fieldName)
  }
}

function isFieldExpanded(fieldName: string): boolean {
  return expandedFields.value.has(fieldName)
}

// Get field type icon
function getFieldIcon(type: string): string {
  const iconMap: Record<string, string> = {
    string: 'i-lucide-text',
    text: 'i-lucide-file-text',
    number: 'i-lucide-hash',
    integer: 'i-lucide-hash',
    decimal: 'i-lucide-percent',
    boolean: 'i-lucide-toggle-left',
    date: 'i-lucide-calendar',
    datetime: 'i-lucide-calendar-clock',
    uuid: 'i-lucide-key',
    json: 'i-lucide-braces',
    array: 'i-lucide-list',
    reference: 'i-lucide-link'
  }
  return iconMap[type] || 'i-lucide-circle'
}

// Format meta display
function formatMeta(meta: Record<string, unknown>): string[] {
  const items: string[] = []
  if (meta.required) items.push('Required')
  if (meta.unique) items.push('Unique')
  if (meta.maxLength) items.push(`Max: ${meta.maxLength}`)
  if (meta.translatable) items.push('Translatable')
  return items
}

// Convert schema to array of fields for display
const schemaFields = computed(() => {
  return Object.entries(props.collection.schema).map(([name, field]) => ({
    name,
    type: field.type,
    meta: field.meta,
    refTarget: field.refTarget
  }))
})

// Check if extension is allowed
const canExtend = computed(() => {
  return !!props.extensionPoint && props.extensionPoint.allowedFields.length > 0
})
</script>

<template>
  <div class="space-y-4">
    <!-- Collection Header -->
    <div class="flex items-start justify-between pb-3 border-b border-[var(--ui-border)]">
      <div>
        <h3 class="text-lg font-semibold">{{ collection.name }}</h3>
        <p class="text-sm text-[var(--ui-text-muted)]">{{ collection.description }}</p>
        <p class="text-xs text-[var(--ui-text-dimmed)] mt-1">
          Table: {{ collection.tableName }}
        </p>
      </div>
      <UBadge color="info" variant="subtle" size="sm">
        <UIcon name="i-lucide-package" class="mr-1" />
        Package Collection
      </UBadge>
    </div>

    <!-- Fields List -->
    <div class="space-y-2">
      <h4 class="text-sm font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide">
        Fields ({{ schemaFields.length }})
      </h4>

      <div class="space-y-1">
        <div
          v-for="field in schemaFields"
          :key="field.name"
          class="rounded-lg border border-[var(--ui-border)] overflow-hidden"
        >
          <!-- Field Header -->
          <button
            class="w-full flex items-center gap-3 p-3 hover:bg-[var(--ui-bg-elevated)] transition-colors text-left"
            @click="toggleFieldExpanded(field.name)"
          >
            <div class="flex items-center justify-center w-8 h-8 rounded bg-[var(--ui-bg-elevated)]">
              <UIcon
                :name="getFieldIcon(field.type)"
                class="text-[var(--ui-text-muted)]"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono text-sm font-medium">{{ field.name }}</span>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ field.type }}
                </UBadge>
                <UBadge
                  v-if="field.refTarget"
                  color="primary"
                  variant="subtle"
                  size="xs"
                >
                  <UIcon name="i-lucide-link" class="mr-1" />
                  {{ field.refTarget }}
                </UBadge>
              </div>
              <div
                v-if="formatMeta(field.meta).length > 0"
                class="flex items-center gap-2 mt-1"
              >
                <span
                  v-for="tag in formatMeta(field.meta)"
                  :key="tag"
                  class="text-xs text-[var(--ui-text-muted)]"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <UIcon
              :name="isFieldExpanded(field.name) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="text-[var(--ui-text-muted)]"
            />
          </button>

          <!-- Field Details (Expanded) -->
          <div
            v-if="isFieldExpanded(field.name)"
            class="px-3 pb-3 border-t border-[var(--ui-border)]"
          >
            <div class="pt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-[var(--ui-text-muted)]">Type:</span>
                <span class="ml-2 font-mono">{{ field.type }}</span>
              </div>
              <div v-if="field.refTarget">
                <span class="text-[var(--ui-text-muted)]">References:</span>
                <span class="ml-2 font-mono">{{ field.refTarget }}</span>
              </div>
              <div v-if="field.meta.label">
                <span class="text-[var(--ui-text-muted)]">Label:</span>
                <span class="ml-2">{{ field.meta.label }}</span>
              </div>
              <div v-if="field.meta.maxLength">
                <span class="text-[var(--ui-text-muted)]">Max Length:</span>
                <span class="ml-2">{{ field.meta.maxLength }}</span>
              </div>
              <div>
                <span class="text-[var(--ui-text-muted)]">Required:</span>
                <span class="ml-2">{{ field.meta.required ? 'Yes' : 'No' }}</span>
              </div>
              <div>
                <span class="text-[var(--ui-text-muted)]">Unique:</span>
                <span class="ml-2">{{ field.meta.unique ? 'Yes' : 'No' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Extension Fields -->
    <div v-if="extensionFields.length > 0" class="space-y-2">
      <h4 class="text-sm font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide flex items-center gap-2">
        <UIcon name="i-lucide-puzzle" />
        Extension Fields ({{ extensionFields.length }})
      </h4>

      <div class="space-y-1">
        <div
          v-for="field in extensionFields"
          :key="field.id"
          class="flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--ui-primary)] bg-[var(--ui-primary)]/5"
        >
          <div class="flex items-center justify-center w-8 h-8 rounded bg-[var(--ui-primary)]/10">
            <UIcon
              :name="getFieldIcon(field.type)"
              class="text-[var(--ui-primary)]"
            />
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-medium">{{ field.name }}</span>
              <UBadge color="primary" variant="subtle" size="xs">
                {{ field.type }}
              </UBadge>
              <UBadge color="success" variant="subtle" size="xs">
                Extension
              </UBadge>
            </div>
          </div>
          <UButton
            color="error"
            variant="ghost"
            size="xs"
            @click="emit('remove-extension-field', field.id)"
          >
            <UIcon name="i-lucide-trash-2" />
          </UButton>
        </div>
      </div>
    </div>

    <!-- Extension Point -->
    <div
      v-if="canExtend"
      class="p-4 rounded-lg border border-dashed border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]"
    >
      <div class="flex items-start gap-3">
        <UIcon
          name="i-lucide-puzzle"
          class="text-xl text-[var(--ui-primary)]"
        />
        <div class="flex-1">
          <p class="text-sm font-medium">Extension Point</p>
          <p class="text-xs text-[var(--ui-text-muted)] mt-1">
            {{ extensionPoint?.description }}
          </p>
          <div class="flex flex-wrap gap-1 mt-2">
            <UBadge
              v-for="fieldName in extensionPoint?.allowedFields"
              :key="fieldName"
              color="neutral"
              variant="subtle"
              size="xs"
            >
              {{ fieldName }}
            </UBadge>
          </div>
        </div>
        <UButton
          color="primary"
          variant="soft"
          size="sm"
          @click="emit('add-extension')"
        >
          <template #leading>
            <UIcon name="i-lucide-plus" />
          </template>
          Add Field
        </UButton>
      </div>
    </div>

    <!-- Read-only notice -->
    <div class="flex items-center gap-2 text-xs text-[var(--ui-text-muted)] pt-2 border-t border-[var(--ui-border)]">
      <UIcon name="i-lucide-info" />
      <span>Package collection schemas are read-only. Use extension points to add custom fields.</span>
    </div>
  </div>
</template>
