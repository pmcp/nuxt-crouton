<script setup lang="ts">
import type { CollectionSchema } from '../../types/schema'

interface Props {
  collection: CollectionSchema
  isNew?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isNew: false
})

const emit = defineEmits<{
  click: [collectionId: string]
}>()

const fieldCount = computed(() => props.collection.fields.length)
const hasRefFields = computed(() => props.collection.fields.some(f => f.refTarget))
const isFromPackage = computed(() => Boolean(props.collection.fromPackage))
const lockedFieldCount = computed(() => props.collection.fields.filter(f => f.locked).length)
</script>

<template>
  <div
    class="group flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all duration-200"
    :class="[
      isNew
        ? 'border-[var(--ui-primary)]/30 bg-[var(--ui-primary)]/5 animate-slide-in'
        : 'border-[var(--ui-border)] hover:border-[var(--ui-border-hover)] bg-[var(--ui-bg)]'
    ]"
    @click="emit('click', collection.id)"
  >
    <!-- Icon -->
    <div
      class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
      :class="[
        isNew
          ? 'bg-[var(--ui-primary)]/10'
          : isFromPackage
            ? 'bg-amber-500/10'
            : 'bg-[var(--ui-bg-elevated)] group-hover:bg-[var(--ui-primary)]/10'
      ]"
    >
      <UIcon
        :name="isFromPackage ? 'i-lucide-package' : 'i-lucide-database'"
        class="text-lg transition-colors"
        :class="[
          isNew
            ? 'text-[var(--ui-primary)]'
            : isFromPackage
              ? 'text-amber-600'
              : 'text-[var(--ui-text-muted)] group-hover:text-[var(--ui-primary)]'
        ]"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h4 class="font-medium text-sm truncate">
          {{ collection.collectionName || 'Unnamed collection' }}
        </h4>
        <UBadge v-if="isNew" color="primary" variant="subtle" size="xs">
          New
        </UBadge>
        <UBadge v-if="isFromPackage" color="warning" variant="subtle" size="xs">
          <UIcon name="i-lucide-package" class="mr-0.5 text-[10px]" />
          {{ collection.fromPackage }}
        </UBadge>
      </div>
      <div class="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]">
        <span>{{ fieldCount }} field{{ fieldCount !== 1 ? 's' : '' }}</span>
        <span v-if="lockedFieldCount > 0" class="flex items-center gap-1">
          <UIcon name="i-lucide-lock" class="text-[10px]" />
          {{ lockedFieldCount }} locked
        </span>
        <span v-if="hasRefFields" class="flex items-center gap-1">
          <UIcon name="i-lucide-link" class="text-[10px]" />
          Has refs
        </span>
      </div>
    </div>

    <!-- Arrow -->
    <UIcon
      name="i-lucide-chevron-right"
      class="text-[var(--ui-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
    />
  </div>
</template>

<style scoped>
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
</style>
