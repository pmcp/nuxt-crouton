<script setup lang="ts">
interface FieldMeta {
  name: string
  type: string
  label: string
  area?: 'main' | 'sidebar' | 'meta'
  displayAs?: string
}

interface Props {
  item: Record<string, any>
  collection: string
  /** Override: pass fields directly instead of reading from config */
  fields?: FieldMeta[]
  /** Fields to hide */
  exclude?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  fields: undefined,
  exclude: () => []
})

const { getConfig } = useCollections()
const display = useDisplayConfig(props.collection)
const config = getConfig(props.collection)

// Resolve fields: prop override > config > empty
const allFields = computed(() => {
  return props.fields ?? config?.fields ?? []
})

// System fields to always exclude from detail rendering
const systemFields = new Set(['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'teamId'])

// Fields used in the header (title, subtitle, badge) — don't repeat in body
const headerFields = computed(() => {
  const set = new Set<string>()
  if (display.title) set.add(display.title)
  if (display.subtitle) set.add(display.subtitle)
  if (display.badge) set.add(display.badge)
  if (display.image) set.add(display.image)
  return set
})

// Filter and group fields by area
const visibleFields = computed(() => {
  return allFields.value.filter(f =>
    !systemFields.has(f.name)
    && !headerFields.value.has(f.name)
    && !props.exclude.includes(f.name)
  )
})

const mainFields = computed(() =>
  visibleFields.value.filter(f => !f.area || f.area === 'main')
)

const sidebarFields = computed(() =>
  visibleFields.value.filter(f => f.area === 'sidebar' || f.area === 'meta')
)

// Title from display config
const title = computed(() => {
  if (!display.title) return props.item.name || props.item.title || props.item.label || 'Details'
  return props.item[display.title] || 'Details'
})

const subtitle = computed(() => {
  if (!display.subtitle) return undefined
  return props.item[display.subtitle]
})

// Image from display config
const imageUrl = computed(() => {
  if (!display.image) return null
  return props.item[display.image]
})

// Badge from display config
const badgeValue = computed(() => {
  if (!display.badge) return null
  return props.item[display.badge]
})

// References map for rendering reference fields
const references = computed(() => config?.references ?? {})

// Check if a value is empty/null
function isEmpty(value: any): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

// Edit via crouton
const crouton = useCrouton()
function handleEdit() {
  crouton?.open('update', props.collection, [props.item.id])
}
</script>

<template>
  <CroutonDetailLayout
    :item="item"
    :title="title"
    :subtitle="subtitle"
    @edit="handleEdit"
  >
    <template #header-actions>
      <!-- Badge next to edit button -->
      <UBadge
        v-if="badgeValue"
        color="neutral"
        variant="subtle"
        size="lg"
      >
        {{ badgeValue }}
      </UBadge>
      <UButton
        icon="i-lucide-pencil"
        color="primary"
        variant="soft"
        @click="handleEdit"
      >
        Edit
      </UButton>
    </template>

    <template #content>
      <!-- Hero image -->
      <div
        v-if="imageUrl"
        class="rounded-lg overflow-hidden mb-6"
      >
        <img
          :src="imageUrl"
          :alt="title"
          class="w-full max-h-80 object-cover"
        >
      </div>

      <div class="@container">
        <div :class="sidebarFields.length ? 'grid grid-cols-1 @lg:grid-cols-3 gap-6' : ''">
          <!-- Main fields -->
          <div :class="sidebarFields.length ? '@lg:col-span-2' : ''">
            <div class="space-y-5">
              <div
                v-for="field in mainFields"
                :key="field.name"
              >
                <dt class="text-sm font-medium text-muted mb-1">
                  {{ field.label }}
                </dt>
                <dd>
                  <!-- Boolean -->
                  <div
                    v-if="field.type === 'boolean'"
                    class="flex items-center gap-2"
                  >
                    <CroutonBoolean :value="item[field.name]" />
                    <span class="text-sm text-default">
                      {{ item[field.name] ? 'Yes' : 'No' }}
                    </span>
                  </div>

                  <!-- Date -->
                  <CroutonDate
                    v-else-if="field.type === 'date'"
                    :date="item[field.name]"
                  />

                  <!-- Image / Asset -->
                  <div
                    v-else-if="(field.type === 'image' || field.type === 'asset') && item[field.name]"
                    class="rounded-lg overflow-hidden inline-block"
                  >
                    <img
                      :src="item[field.name]"
                      :alt="field.label"
                      class="max-h-48 object-cover rounded-lg"
                    >
                  </div>

                  <!-- Reference -->
                  <CroutonItemCardMini
                    v-else-if="field.type === 'reference' && item[field.name] && references[field.name]"
                    :id="String(item[field.name])"
                    :collection="references[field.name]"
                  />

                  <!-- Multi-reference -->
                  <div
                    v-else-if="field.type === 'multi-reference' && Array.isArray(item[field.name]) && references[field.name]"
                    class="flex flex-wrap gap-2"
                  >
                    <CroutonItemCardMini
                      v-for="refId in item[field.name]"
                      :key="refId"
                      :id="String(refId)"
                      :collection="references[field.name]"
                    />
                  </div>

                  <!-- Options / badge display -->
                  <UBadge
                    v-else-if="(field.type === 'options' || field.displayAs === 'badge') && item[field.name]"
                    color="neutral"
                    variant="subtle"
                  >
                    {{ item[field.name] }}
                  </UBadge>

                  <!-- Number / Decimal -->
                  <span
                    v-else-if="(field.type === 'number' || field.type === 'decimal') && !isEmpty(item[field.name])"
                    class="text-default tabular-nums"
                  >
                    {{ field.type === 'decimal' ? Number(item[field.name]).toLocaleString(undefined, { minimumFractionDigits: 2 }) : Number(item[field.name]).toLocaleString() }}
                  </span>

                  <!-- Text (longer string content) -->
                  <p
                    v-else-if="field.type === 'text' && item[field.name]"
                    class="text-default whitespace-pre-wrap"
                  >
                    {{ item[field.name] }}
                  </p>

                  <!-- String (default) -->
                  <span
                    v-else-if="!isEmpty(item[field.name])"
                    class="text-default"
                  >
                    {{ item[field.name] }}
                  </span>

                  <!-- Empty state -->
                  <span
                    v-else
                    class="text-muted"
                  >
                    &mdash;
                  </span>
                </dd>
              </div>
            </div>
          </div>

          <!-- Sidebar fields -->
          <div
            v-if="sidebarFields.length"
            class="@lg:col-span-1"
          >
            <div class="space-y-4 @lg:border-l @lg:border-gray-200 @lg:dark:border-gray-800 @lg:pl-6">
              <div
                v-for="field in sidebarFields"
                :key="field.name"
              >
                <dt class="text-sm font-medium text-muted mb-1">
                  {{ field.label }}
                </dt>
                <dd>
                  <!-- Boolean -->
                  <div
                    v-if="field.type === 'boolean'"
                    class="flex items-center gap-2"
                  >
                    <CroutonBoolean :value="item[field.name]" />
                    <span class="text-sm text-default">
                      {{ item[field.name] ? 'Yes' : 'No' }}
                    </span>
                  </div>

                  <!-- Date -->
                  <CroutonDate
                    v-else-if="field.type === 'date'"
                    :date="item[field.name]"
                  />

                  <!-- Image / Asset -->
                  <div
                    v-else-if="(field.type === 'image' || field.type === 'asset') && item[field.name]"
                    class="rounded-lg overflow-hidden inline-block"
                  >
                    <img
                      :src="item[field.name]"
                      :alt="field.label"
                      class="max-h-32 object-cover rounded-lg"
                    >
                  </div>

                  <!-- Reference -->
                  <CroutonItemCardMini
                    v-else-if="field.type === 'reference' && item[field.name] && references[field.name]"
                    :id="String(item[field.name])"
                    :collection="references[field.name]"
                  />

                  <!-- Options / badge display -->
                  <UBadge
                    v-else-if="(field.type === 'options' || field.displayAs === 'badge') && item[field.name]"
                    color="neutral"
                    variant="subtle"
                  >
                    {{ item[field.name] }}
                  </UBadge>

                  <!-- Number / Decimal -->
                  <span
                    v-else-if="(field.type === 'number' || field.type === 'decimal') && !isEmpty(item[field.name])"
                    class="text-default tabular-nums"
                  >
                    {{ field.type === 'decimal' ? Number(item[field.name]).toLocaleString(undefined, { minimumFractionDigits: 2 }) : Number(item[field.name]).toLocaleString() }}
                  </span>

                  <!-- String / Text -->
                  <span
                    v-else-if="!isEmpty(item[field.name])"
                    class="text-default text-sm"
                  >
                    {{ item[field.name] }}
                  </span>

                  <!-- Empty state -->
                  <span
                    v-else
                    class="text-muted"
                  >
                    &mdash;
                  </span>
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Timestamps footer -->
      <div
        v-if="item.createdAt || item.updatedAt"
        class="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800"
      >
        <div class="flex flex-wrap gap-6 text-sm text-muted">
          <div v-if="item.createdAt">
            <span class="font-medium">Created</span>
            <CroutonDate :date="item.createdAt" />
          </div>
          <div v-if="item.updatedAt">
            <span class="font-medium">Updated</span>
            <CroutonDate :date="item.updatedAt" />
          </div>
        </div>
      </div>
    </template>
  </CroutonDetailLayout>
</template>
