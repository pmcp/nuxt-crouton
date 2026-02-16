<script setup lang="ts">
import type { ProjectConfig, FieldType } from '../types/schema'
import type { CollectionWithFields } from '../composables/useCollectionEditor'

const props = defineProps<{
  config: ProjectConfig
  collections: CollectionWithFields[]
}>()

const { getFieldIcon } = useFieldTypes()
const { t } = useT()

const totalFields = computed(() =>
  props.collections.reduce((sum, col) => sum + col.fields.length, 0)
)

// Expandable collections
const expandedCollections = ref<Set<string>>(new Set())

function toggleCollection(id: string) {
  if (expandedCollections.value.has(id)) {
    expandedCollections.value.delete(id)
  }
  else {
    expandedCollections.value.add(id)
  }
  // Trigger reactivity
  expandedCollections.value = new Set(expandedCollections.value)
}

const displayRoleLabels = computed<Record<string, { label: string, icon: string }>>(() => ({
  title: { label: t('designer.displayRoles.title'), icon: 'i-lucide-heading' },
  subtitle: { label: t('designer.displayRoles.subtitle'), icon: 'i-lucide-text' },
  image: { label: t('designer.displayRoles.image'), icon: 'i-lucide-image' },
  badge: { label: t('designer.displayRoles.badge'), icon: 'i-lucide-tag' },
  description: { label: t('designer.displayRoles.description'), icon: 'i-lucide-align-left' }
}))

const appTypeLabels = computed<Record<string, string>>(() => ({
  'saas': t('designer.appTypes.saas'),
  'cms': t('designer.appTypes.cms'),
  'internal-tool': t('designer.appTypes.internal-tool'),
  'marketplace': t('designer.appTypes.marketplace'),
  'social': t('designer.appTypes.social'),
  'ecommerce': t('designer.appTypes.ecommerce'),
  'other': t('designer.appTypes.other')
}))
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-base font-semibold">{{ t('designer.summary.title') }}</h3>

    <!-- Stats grid -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-lg border border-[var(--ui-border)] px-4 py-3">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('designer.summary.appName') }}</p>
        <p class="text-sm font-medium mt-0.5 truncate">{{ config.name || '—' }}</p>
      </div>
      <div class="rounded-lg border border-[var(--ui-border)] px-4 py-3">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('designer.summary.appType') }}</p>
        <p class="text-sm font-medium mt-0.5">{{ appTypeLabels[config.appType || ''] || config.appType || '—' }}</p>
      </div>
      <div class="rounded-lg border border-[var(--ui-border)] px-4 py-3">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('designer.summary.collections') }}</p>
        <p class="text-sm font-medium mt-0.5">{{ collections.length }}</p>
      </div>
      <div class="rounded-lg border border-[var(--ui-border)] px-4 py-3">
        <p class="text-xs text-[var(--ui-text-muted)]">{{ t('designer.summary.totalFields') }}</p>
        <p class="text-sm font-medium mt-0.5">{{ totalFields }}</p>
      </div>
    </div>

    <!-- Packages -->
    <div v-if="config.packages && config.packages.length > 0">
      <p class="text-xs text-[var(--ui-text-muted)] mb-2">{{ t('designer.summary.packages') }}</p>
      <div class="flex flex-wrap gap-1.5">
        <UBadge
          v-for="pkg in config.packages"
          :key="pkg"
          variant="subtle"
          color="neutral"
          size="xs"
          :label="pkg"
        />
      </div>
    </div>

    <!-- Collections list -->
    <div>
      <p class="text-xs text-[var(--ui-text-muted)] mb-2">{{ t('designer.summary.collections') }}</p>
      <div class="space-y-1">
        <div
          v-for="col in collections"
          :key="col.id"
          class="rounded-lg border border-[var(--ui-border)] overflow-hidden"
        >
          <!-- Collection header -->
          <button
            class="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--ui-bg-elevated)] transition-colors cursor-pointer"
            @click="toggleCollection(col.id)"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-database" class="size-4 text-[var(--ui-text-muted)]" />
              <span class="text-sm font-medium">{{ col.name }}</span>
              <UBadge variant="subtle" color="neutral" size="xs" :label="t('designer.summary.fieldCount', { params: { count: col.fields.length } })" />
            </div>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-[var(--ui-text-muted)] transition-transform duration-200"
              :class="{ 'rotate-180': expandedCollections.has(col.id) }"
            />
          </button>

          <!-- Expanded fields -->
          <div v-if="expandedCollections.has(col.id)" class="border-t border-[var(--ui-border)] px-4 py-2 space-y-1">
            <p v-if="col.description" class="text-xs text-[var(--ui-text-muted)] mb-2">{{ col.description }}</p>

            <!-- Display config -->
            <div v-if="col.display && Object.values(col.display).some(Boolean)" class="flex flex-wrap gap-1.5 mb-2">
              <template v-for="(fieldName, role) in col.display" :key="role">
                <UBadge
                  v-if="fieldName"
                  variant="subtle"
                  color="primary"
                  size="xs"
                >
                  <UIcon :name="displayRoleLabels[role]?.icon || 'i-lucide-tag'" class="size-3 mr-1" />
                  {{ displayRoleLabels[role]?.label || role }}: {{ fieldName }}
                </UBadge>
              </template>
            </div>

            <div
              v-for="field in col.fields"
              :key="field.id"
              class="flex items-center gap-2 text-sm py-1"
            >
              <UIcon :name="getFieldIcon(field.type as FieldType)" class="size-3.5 text-[var(--ui-text-muted)]" />
              <span>{{ field.name }}</span>
              <span class="text-xs text-[var(--ui-text-muted)]">{{ field.type }}</span>
              <UBadge v-if="field.meta?.required" color="warning" variant="subtle" size="xs" :label="t('designer.summary.requiredBadge')" />
              <span v-if="field.refTarget" class="text-xs text-[var(--ui-text-muted)]">
                &rarr; {{ field.refTarget }}
              </span>
            </div>
            <p v-if="col.fields.length === 0" class="text-xs text-[var(--ui-text-muted)] italic">
              {{ t('designer.summary.noFields') }}
            </p>
          </div>
        </div>

        <p v-if="collections.length === 0" class="text-sm text-[var(--ui-text-muted)] italic px-1">
          {{ t('designer.summary.noCollections') }}
        </p>
      </div>
    </div>
  </div>
</template>
