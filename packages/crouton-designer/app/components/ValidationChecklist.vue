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
      <h3 class="text-base font-semibold">Validation</h3>
      <UBadge
        v-if="allPassed"
        color="success"
        variant="subtle"
        size="xs"
        label="All checks passed"
      />
      <UBadge
        v-else-if="hasErrors"
        color="error"
        variant="subtle"
        size="xs"
        :label="`${errors.length} error${errors.length !== 1 ? 's' : ''}`"
      />
      <UBadge
        v-if="warnings.length > 0"
        color="warning"
        variant="subtle"
        size="xs"
        :label="`${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`"
      />
    </div>

    <!-- All passed state -->
    <div v-if="allPassed" class="flex items-center gap-2 text-sm text-[var(--ui-color-success-500)] bg-[var(--ui-color-success-50)] rounded-lg px-4 py-3">
      <UIcon name="i-lucide-check-circle" class="size-5 shrink-0" />
      <span>Schema is valid and ready for generation.</span>
    </div>

    <!-- Global issues (e.g. circular references) -->
    <div v-if="globalIssues.length > 0" class="space-y-1.5">
      <div
        v-for="issue in globalIssues"
        :key="issue.code + issue.message"
        class="flex items-center gap-2 text-sm px-3 py-2 rounded-md"
        :class="issue.type === 'error'
          ? 'bg-[var(--ui-color-error-50)] text-[var(--ui-color-error-500)]'
          : 'bg-[var(--ui-color-warning-50)] text-[var(--ui-color-warning-500)]'"
      >
        <UIcon
          :name="issue.type === 'error' ? 'i-lucide-x-circle' : 'i-lucide-alert-triangle'"
          class="size-4 shrink-0"
        />
        <span>{{ issue.message }}</span>
      </div>
    </div>

    <!-- Per-collection issues -->
    <div v-for="group in collectionGroups" :key="group.collectionId" class="space-y-1.5">
      <button
        class="text-xs font-medium text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
        @click="emit('navigate-to', group.collectionId)"
      >
        {{ collectionName(group.collectionId) }}
      </button>
      <div
        v-for="issue in group.issues"
        :key="issue.code + (issue.fieldId || '') + issue.message"
        class="flex items-center gap-2 text-sm px-3 py-2 rounded-md"
        :class="issue.type === 'error'
          ? 'bg-[var(--ui-color-error-50)] text-[var(--ui-color-error-500)]'
          : 'bg-[var(--ui-color-warning-50)] text-[var(--ui-color-warning-500)]'"
      >
        <UIcon
          :name="issue.type === 'error' ? 'i-lucide-x-circle' : 'i-lucide-alert-triangle'"
          class="size-4 shrink-0"
        />
        <span>{{ issue.message }}</span>
      </div>
    </div>
  </div>
</template>
