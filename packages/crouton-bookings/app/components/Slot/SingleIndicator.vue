<script setup lang="ts">
interface Props {
  totalSlots: number
  position: number // 0-indexed
  color?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string // Slot label to show in popover
}

const props = withDefaults(defineProps<Props>(), {
  color: '#3b82f6',
  size: 'md',
  label: ''
})

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
}
</script>

<template>
  <div class="flex gap-1 items-center justify-center">
    <template v-for="i in totalSlots" :key="i">
      <!-- Empty slot (not booked) -->
      <div
        v-if="i - 1 !== position"
        class="rounded-full bg-elevated"
        :class="sizeClasses[size]"
      />
      <!-- Booked slot with popover -->
      <UPopover v-else mode="hover" :open-delay="200" :close-delay="100">
        <div
          class="rounded-full border border-transparent cursor-pointer"
          :class="sizeClasses[size]"
          :style="{ backgroundColor: color }"
        />
        <template #content>
          <div class="px-2 py-1 text-xs font-medium">
            {{ label || 'Booked' }}
          </div>
        </template>
      </UPopover>
    </template>
  </div>
</template>
