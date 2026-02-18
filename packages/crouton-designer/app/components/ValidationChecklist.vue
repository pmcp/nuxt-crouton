<script setup lang="ts">
import type { ValidationIssue } from '../composables/useSchemaValidation'
import type { CollectionWithFields } from '../composables/useCollectionEditor'

const props = defineProps<{
  collections: CollectionWithFields[]
  issues: ValidationIssue[]
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  hasErrors: boolean
}>()

const emit = defineEmits<{
  'navigate-to': [collectionId: string]
}>()

const { t } = useT()

// Resolve collection name from ID
function collectionName(id: string): string {
  return props.collections.find(c => c.id === id)?.name || id
}

// Group issues by collection
const groupedIssues = computed(() => {
  const groups = new Map<string | undefined, ValidationIssue[]>()
  for (const issue of props.issues) {
    const key = issue.collectionId
    const existing = groups.get(key) || []
    existing.push(issue)
    groups.set(key, existing)
  }
  return groups
})

// Global issues (no collectionId — e.g. circular references)
const globalIssues = computed(() => groupedIssues.value.get(undefined) || [])

// Per-collection groups
const collectionGroups = computed(() => {
  const result: Array<{ collectionId: string, issues: ValidationIssue[] }> = []
  for (const [key, issues] of groupedIssues.value) {
    if (key) result.push({ collectionId: key, issues })
  }
  return result
})

const allPassed = computed(() => props.issues.length === 0)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <h3 class="text-base font-semibold">{{ t('designer.validation.title') }}</h3>
      <UBadge
        v-if="allPassed"
        color="success"
        variant="subtle"
        size="xs"
        :label="t('designer.validation.allChecksPassed')"
      />
      <UBadge
        v-else-if="hasErrors"
        color="error"
        variant="subtle"
        size="xs"
        :label="`${errors.length} ${errors.length !== 1 ? t('designer.validation.errors') : t('designer.validation.error')}`"
      />
      <UBadge
        v-if="warnings.length > 0"
        color="warning"
        variant="subtle"
        size="xs"
        :label="`${warnings.length} ${warnings.length !== 1 ? t('designer.validation.warnings') : t('designer.validation.warning')}`"
      />
    </div>

    <!-- All passed state -->
    <UAlert
      v-if="allPassed"
      color="success"
      variant="subtle"
      icon="i-lucide-check-circle"
      :description="t('designer.validation.schemaValid')"
    />

    <!-- Global issues (e.g. circular references) -->
    <div v-if="globalIssues.length > 0" class="space-y-1.5">
      <UAlert
        v-for="issue in globalIssues"
        :key="issue.code + issue.message"
        :color="issue.type === 'error' ? 'error' : 'warning'"
        variant="subtle"
        :icon="issue.type === 'error' ? 'i-lucide-x-circle' : 'i-lucide-alert-triangle'"
        :description="issue.message"
      />
    </div>

    <!-- Per-collection issues -->
    <div v-for="group in collectionGroups" :key="group.collectionId" class="space-y-1.5">
      <UButton
        variant="link"
        color="neutral"
        size="xs"
        class="text-xs font-medium"
        @click="emit('navigate-to', group.collectionId)"
      >
        {{ collectionName(group.collectionId) }}
      </UButton>
      <UAlert
        v-for="issue in group.issues"
        :key="issue.code + (issue.fieldId || '') + issue.message"
        :color="issue.type === 'error' ? 'error' : 'warning'"
        variant="subtle"
        :icon="issue.type === 'error' ? 'i-lucide-x-circle' : 'i-lucide-alert-triangle'"
        :description="issue.message"
      />
    </div>
  </div>
</template>
