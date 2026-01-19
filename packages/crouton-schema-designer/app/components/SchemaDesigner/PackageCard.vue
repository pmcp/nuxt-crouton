<script setup lang="ts">
import type { PackageSummary } from '../../types/package-manifest'

interface Props {
  package: PackageSummary
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false
})

const emit = defineEmits<{
  toggle: [packageId: string]
}>()

function handleToggle() {
  emit('toggle', props.package.id)
}
</script>

<template>
  <div
    class="group relative flex flex-col p-4 rounded-lg border transition-all duration-200"
    :class="[
      selected
        ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/5 ring-1 ring-[var(--ui-primary)]/20'
        : 'border-[var(--ui-border)] hover:border-[var(--ui-border-hover)] bg-[var(--ui-bg)]'
    ]"
  >
    <!-- Header -->
    <div class="flex items-start gap-3 mb-3">
      <div
        class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg"
        :class="[
          selected
            ? 'bg-[var(--ui-primary)]/10'
            : 'bg-[var(--ui-bg-elevated)]'
        ]"
      >
        <UIcon
          :name="package.icon"
          class="text-xl"
          :class="[
            selected
              ? 'text-[var(--ui-primary)]'
              : 'text-[var(--ui-text-muted)]'
          ]"
        />
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-sm truncate">
          {{ package.name }}
        </h3>
        <p class="text-xs text-[var(--ui-text-muted)]">
          v{{ package.version }}
        </p>
      </div>
    </div>

    <!-- Description -->
    <p class="text-sm text-[var(--ui-text-muted)] line-clamp-2 mb-3 flex-1">
      {{ package.description }}
    </p>

    <!-- Footer -->
    <div class="flex items-center justify-between mt-auto pt-3 border-t border-[var(--ui-border)]">
      <div class="flex items-center gap-2">
        <UBadge
          color="neutral"
          variant="subtle"
          size="xs"
        >
          <UIcon name="i-lucide-database" class="mr-1" />
          {{ package.collectionCount }} collection{{ package.collectionCount !== 1 ? 's' : '' }}
        </UBadge>
        <UBadge
          v-if="!package.layer.editable"
          color="warning"
          variant="subtle"
          size="xs"
          :title="package.layer.reason || 'Layer name is fixed'"
        >
          <UIcon name="i-lucide-lock" class="mr-1" />
          {{ package.layer.name }}
        </UBadge>
      </div>

      <UButton
        :color="selected ? 'error' : 'primary'"
        :variant="selected ? 'soft' : 'solid'"
        size="xs"
        @click="handleToggle"
      >
        <template #leading>
          <UIcon :name="selected ? 'i-lucide-minus' : 'i-lucide-plus'" />
        </template>
        {{ selected ? 'Remove' : 'Add' }}
      </UButton>
    </div>

    <!-- Selected indicator -->
    <div
      v-if="selected"
      class="absolute -top-1 -right-1"
    >
      <div class="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ui-primary)] text-white">
        <UIcon name="i-lucide-check" class="text-xs" />
      </div>
    </div>
  </div>
</template>
