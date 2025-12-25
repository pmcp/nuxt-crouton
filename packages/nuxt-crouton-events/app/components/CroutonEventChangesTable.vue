<script setup lang="ts">
interface EventChange {
  fieldName: string
  oldValue: string | null
  newValue: string | null
}

const props = defineProps<{
  changes: EventChange[]
  operation?: 'create' | 'update' | 'delete'
}>()

// Parse JSON value for display
function parseValue(value: string | null): unknown {
  if (value === null) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

// Format value for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  return String(value)
}

// Check if value is complex (object/array)
function isComplex(value: unknown): boolean {
  return typeof value === 'object' && value !== null
}

// Get display info for a change
function getChangeDisplay(change: EventChange) {
  const oldVal = parseValue(change.oldValue)
  const newVal = parseValue(change.newValue)

  return {
    field: change.fieldName,
    oldValue: formatValue(oldVal),
    newValue: formatValue(newVal),
    isOldComplex: isComplex(oldVal),
    isNewComplex: isComplex(newVal),
    hasOld: change.oldValue !== null,
    hasNew: change.newValue !== null
  }
}
</script>

<template>
  <div class="crouton-event-changes-table">
    <!-- Empty state -->
    <div
      v-if="!changes?.length"
      class="text-center py-4 text-muted text-sm"
    >
      No changes recorded
    </div>

    <!-- Changes table -->
    <div
      v-else
      class="border rounded-lg overflow-hidden"
    >
      <table class="w-full text-sm">
        <thead class="bg-muted/30">
          <tr>
            <th class="text-left px-3 py-2 font-medium text-muted w-1/4">
              Field
            </th>
            <th
              v-if="operation !== 'create'"
              class="text-left px-3 py-2 font-medium text-muted w-[37.5%]"
            >
              Previous Value
            </th>
            <th
              v-if="operation !== 'delete'"
              class="text-left px-3 py-2 font-medium text-muted"
              :class="operation === 'create' ? 'w-3/4' : 'w-[37.5%]'"
            >
              {{ operation === 'create' ? 'Value' : 'New Value' }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr
            v-for="change in changes"
            :key="change.fieldName"
            class="hover:bg-muted/20"
          >
            <td class="px-3 py-2 font-mono text-xs align-top">
              {{ change.fieldName }}
            </td>

            <!-- Old value (for update/delete) -->
            <td
              v-if="operation !== 'create'"
              class="px-3 py-2 align-top"
            >
              <div
                v-if="getChangeDisplay(change).hasOld"
                class="text-red-600 dark:text-red-400"
              >
                <pre
                  v-if="getChangeDisplay(change).isOldComplex"
                  class="text-xs whitespace-pre-wrap bg-red-50 dark:bg-red-950/30 rounded p-2 overflow-x-auto max-h-32"
                >{{ getChangeDisplay(change).oldValue }}</pre>
                <span
                  v-else
                  class="text-xs"
                  :class="{ 'line-through': operation === 'update' }"
                >
                  {{ getChangeDisplay(change).oldValue }}
                </span>
              </div>
              <span
                v-else
                class="text-muted text-xs"
              >—</span>
            </td>

            <!-- New value (for create/update) -->
            <td
              v-if="operation !== 'delete'"
              class="px-3 py-2 align-top"
            >
              <div
                v-if="getChangeDisplay(change).hasNew"
                class="text-green-600 dark:text-green-400"
              >
                <pre
                  v-if="getChangeDisplay(change).isNewComplex"
                  class="text-xs whitespace-pre-wrap bg-green-50 dark:bg-green-950/30 rounded p-2 overflow-x-auto max-h-32"
                >{{ getChangeDisplay(change).newValue }}</pre>
                <span
                  v-else
                  class="text-xs"
                >
                  {{ getChangeDisplay(change).newValue }}
                </span>
              </div>
              <span
                v-else
                class="text-muted text-xs"
              >—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
