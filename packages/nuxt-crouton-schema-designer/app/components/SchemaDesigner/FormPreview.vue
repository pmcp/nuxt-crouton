<script setup lang="ts">
import type { SchemaField } from '../../types/schema'

interface Props {
  fields: SchemaField[]
  mode?: 'create' | 'edit'
}

const props = withDefaults(defineProps<Props>(), {
  fields: () => [],
  mode: 'create'
})

const { generateValue } = useMockData()

// Generate form state based on mode
const formState = computed(() => {
  const state: Record<string, any> = {}

  for (const field of props.fields) {
    if (!field.name) continue

    if (props.mode === 'edit') {
      // Pre-fill with mock data
      state[field.name] = generateValue(field)
    } else {
      // Create mode: use defaults or empty values
      state[field.name] = field.meta.default ?? getDefaultValue(field)
    }
  }

  return state
})

// Get default value based on field type (matches generator logic)
function getDefaultValue(field: SchemaField): any {
  switch (field.type) {
    case 'boolean':
      return false
    case 'number':
    case 'decimal':
    case 'integer':
      return 0
    case 'date':
    case 'datetime':
      return null
    case 'repeater':
    case 'array':
      return []
    case 'json':
      return {}
    default:
      return ''
  }
}

// Separate fields by area (matches generator logic)
const mainFields = computed(() =>
  props.fields.filter(f => f.name && (!f.meta?.area || f.meta.area === 'main'))
)

const sidebarFields = computed(() =>
  props.fields.filter(f => f.name && f.meta?.area === 'sidebar')
)

const hasSidebar = computed(() => sidebarFields.value.length > 0)

// Format field label (capitalize first letter)
function getFieldLabel(field: SchemaField): string {
  if (field.meta.label) return field.meta.label
  return field.name.charAt(0).toUpperCase() + field.name.slice(1)
}

// Format value for display in JSON/array fields
function formatJsonValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function formatArrayValue(value: any): string {
  if (!Array.isArray(value)) return ''
  return value.join('\n')
}
</script>

<template>
  <div class="p-4">
    <!-- Empty state -->
    <div
      v-if="fields.length === 0 || !fields.some(f => f.name)"
      class="text-center text-[var(--ui-text-muted)] py-8"
    >
      <UIcon name="i-lucide-form-input" class="text-3xl mb-2" />
      <p class="text-sm">Add fields to see form preview</p>
    </div>

    <!-- Form preview using CroutonFormLayout (matches generated forms) -->
    <UForm v-else :state="formState">
      <CroutonFormLayout>
        <template #main>
          <div class="flex flex-col gap-4 p-1">
            <template v-for="field in mainFields" :key="field.id">
              <!-- Boolean → UCheckbox (matches generator) -->
              <UFormField
                v-if="field.type === 'boolean'"
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <UCheckbox v-model="formState[field.name]" disabled />
              </UFormField>

              <!-- Text → UTextarea -->
              <UFormField
                v-else-if="field.type === 'text'"
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <UTextarea
                  v-model="formState[field.name]"
                  class="w-full"
                  size="xl"
                  disabled
                />
              </UFormField>

              <!-- Number/Decimal/Integer → UInputNumber -->
              <UFormField
                v-else-if="['number', 'decimal', 'integer'].includes(field.type)"
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <UInputNumber
                  v-model="formState[field.name]"
                  class="w-full"
                  disabled
                />
              </UFormField>

              <!-- Date → CroutonCalendar (matches generator) -->
              <UFormField
                v-else-if="field.type === 'date'"
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <UInput
                  :model-value="formState[field.name] ? new Date(formState[field.name]).toLocaleDateString() : ''"
                  class="w-full"
                  size="xl"
                  disabled
                  placeholder="Select date..."
                />
              </UFormField>

              <!-- Datetime -->
              <UFormField
                v-else-if="field.type === 'datetime'"
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <UInput
                  :model-value="formState[field.name] ? new Date(formState[field.name]).toLocaleString() : ''"
                  class="w-full"
                  size="xl"
                  disabled
                  placeholder="Select datetime..."
                />
              </UFormField>

              <!-- Reference field → CroutonFormReferenceSelect (matches generator) -->
              <UFormField
                v-else-if="field.refTarget"
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <UInput
                  :model-value="formState[field.name] || ''"
                  class="w-full"
                  size="xl"
                  disabled
                  :placeholder="`Select ${field.refTarget}...`"
                />
                <template #hint>
                  <span class="text-xs text-[var(--ui-text-muted)]">
                    References: {{ field.refTarget }}
                  </span>
                </template>
              </UFormField>

              <!-- JSON → UTextarea with JSON formatting -->
              <UFormField
                v-else-if="field.type === 'json'"
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <UTextarea
                  :model-value="formatJsonValue(formState[field.name])"
                  class="w-full font-mono text-sm"
                  :rows="8"
                  disabled
                  placeholder="Enter JSON object"
                />
              </UFormField>

              <!-- Repeater → CroutonFormRepeater placeholder -->
              <UFormField
                v-else-if="field.type === 'repeater'"
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <div class="border border-dashed border-[var(--ui-border)] rounded-lg p-4 text-center text-[var(--ui-text-muted)]">
                  <UIcon name="i-lucide-plus" class="text-lg mb-1" />
                  <p class="text-sm">Repeater field: {{ field.name }}</p>
                  <p class="text-xs">Will use CroutonFormRepeater</p>
                </div>
              </UFormField>

              <!-- Array → UTextarea with line-separated values -->
              <UFormField
                v-else-if="field.type === 'array' && !field.refTarget"
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <UTextarea
                  :model-value="formatArrayValue(formState[field.name])"
                  class="w-full"
                  :rows="6"
                  disabled
                  placeholder="Enter one value per line"
                />
                <template #hint>
                  <span class="text-xs text-[var(--ui-text-muted)]">
                    Enter one value per line
                  </span>
                </template>
              </UFormField>

              <!-- Default: String → UInput -->
              <UFormField
                v-else
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <UInput
                  v-model="formState[field.name]"
                  class="w-full"
                  size="xl"
                  disabled
                />
              </UFormField>
            </template>
          </div>
        </template>

        <!-- Sidebar area (matches generator area: 'sidebar') -->
        <template v-if="hasSidebar" #sidebar>
          <div class="flex flex-col gap-4 p-1">
            <template v-for="field in sidebarFields" :key="field.id">
              <!-- Simplified sidebar rendering -->
              <UFormField
                :label="getFieldLabel(field)"
                :name="field.name"
                class="not-last:pb-4"
              >
                <UInput
                  v-model="formState[field.name]"
                  class="w-full"
                  size="xl"
                  disabled
                />
              </UFormField>
            </template>
          </div>
        </template>

        <!-- Footer with action button (matches generator) -->
        <template #footer>
          <CroutonFormActionButton
            :action="mode === 'create' ? 'create' : 'update'"
            collection="preview"
            :items="[]"
            loading="notLoading"
            disabled
          />
        </template>
      </CroutonFormLayout>
    </UForm>
  </div>
</template>
