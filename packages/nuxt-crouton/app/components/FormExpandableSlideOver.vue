<template>
  <USlideover
    v-model:open="isOpen"
    side="right"
    :ui="slideoverUi"
    :transition="transition"
    :overlay="true"
    :dismissible="dismissible"
    :portal="portal"
    @update:open="handleOpenChange"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <!-- Title section -->
        <div class="flex items-center gap-2">
          <UIcon v-if="icon" :name="icon" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h2 class="text-lg font-semibold">
            {{ title }}
          </h2>
          <UBadge v-if="badge" size="sm" :color="badgeColor" :variant="badgeVariant">
            {{ badge }}
          </UBadge>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-1">
          <!-- Custom actions slot -->
          <slot name="actions" :expanded="expanded" />

          <!-- Expand/Collapse button -->
          <UTooltip :text="expanded ? 'Collapse to sidebar' : 'Expand to fullscreen'">
            <UButton
              :icon="expanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
              variant="ghost"
              color="gray"
              size="sm"
              @click="toggleExpand"
            />
          </UTooltip>

          <!-- Close button -->
          <UTooltip text="Close">
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="gray"
              size="sm"
              @click="close"
            />
          </UTooltip>
        </div>
      </div>
    </template>

    <template #body>
      <div
        :class="[
          'w-full h-full',
          expanded ? 'p-6 max-w-7xl mx-auto' : 'p-4',
          contentClass
        ]"
      >
        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center h-64">
          <USkeleton class="w-full h-full" />
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="space-y-4">
          <UAlert
            color="red"
            icon="i-lucide-triangle-alert"
            :title="error.title || 'An error occurred'"
            :description="error.description"
          />
          <div v-if="error.retry" class="flex gap-2">
            <UButton color="primary" @click="error.retry">
              Try Again
            </UButton>
            <UButton color="gray" variant="outline" @click="close">
              Cancel
            </UButton>
          </div>
        </div>

        <!-- Main content -->
        <div v-else class="h-full">
          <slot :expanded="expanded" :toggle-expand="toggleExpand" />
        </div>
      </div>
    </template>

    <!-- Footer slot (optional) -->
    <template v-if="$slots.footer" #footer>
      <div
        :class="[
          'border-t border-gray-200 dark:border-gray-700',
          expanded ? 'px-6 py-4 max-w-7xl mx-auto' : 'px-4 py-3',
          footerClass
        ]"
      >
        <slot name="footer" :expanded="expanded" :toggle-expand="toggleExpand" />
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  // v-model bindings
  open?: boolean
  expanded?: boolean

  // Content
  title: string
  icon?: string
  badge?: string
  badgeColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray'
  badgeVariant?: 'solid' | 'outline' | 'soft' | 'subtle'

  // States
  loading?: boolean
  error?: {
    title?: string
    description: string
    retry?: () => void
  }

  // Behavior
  dismissible?: boolean
  portal?: boolean | string | HTMLElement
  transition?: boolean
  closeOnExpand?: boolean

  // Styling
  contentClass?: string
  footerClass?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  expanded: false,
  dismissible: true,
  portal: true,
  transition: true,
  closeOnExpand: false,
  badgeColor: 'primary',
  badgeVariant: 'soft',
  maxWidth: 'xl'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:expanded': [value: boolean]
  'expand': []
  'collapse': []
  'toggle': []
}>()

// Two-way binding for open state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// Handle open/close
const handleOpenChange = (value: boolean) => {
  isOpen.value = value
  // Reset expanded state when closing
  if (!value && props.expanded) {
    emit('update:expanded', false)
  }
}

// Close slideover
const close = () => {
  isOpen.value = false
}

// Toggle expand/collapse
const toggleExpand = () => {
  const newExpandedState = !props.expanded
  emit('update:expanded', newExpandedState)
  emit('toggle')

  if (newExpandedState) {
    emit('expand')
    // Optionally close on expand for immersive experience
    if (props.closeOnExpand) {
      // Small delay to show animation
      setTimeout(() => close(), 300)
    }
  } else {
    emit('collapse')
  }
}

// Compute UI configuration based on expanded state
const slideoverUi = computed(() => {
  // Always use the same positioning system for smooth animation
  const basePosition = 'fixed inset-y-0 right-0'

  // Smooth transition for all properties
  const transitionClasses = 'transition-all duration-500 ease-in-out'

  // Get width based on state
  const getWidth = () => {
    if (props.expanded) {
      return 'w-screen' // Full width when expanded
    }
    // Sidebar widths
    switch (props.maxWidth) {
      case 'sm': return 'w-full max-w-sm'
      case 'md': return 'w-full max-w-md'
      case 'lg': return 'w-full max-w-lg'
      case 'xl': return 'w-full max-w-xl'
      case '2xl': return 'w-full max-w-2xl'
      case '4xl': return 'w-full max-w-4xl'
      case '7xl': return 'w-full max-w-7xl'
      case 'full': return 'w-full'
      default: return 'w-full max-w-xl'
    }
  }

  // Transform for slide effect
  const transformClass = props.expanded
    ? 'translate-x-0'
    : 'translate-x-0'

  return {
    overlay: 'fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm transition-opacity duration-500',
    content: `${basePosition} ${getWidth()} ${transformClass} ${transitionClasses}`,
    wrapper: `w-full h-full ${transitionClasses}`,
    body: `flex-1 overflow-y-auto ${transitionClasses}`,
    header: 'flex items-center gap-1.5 p-4 sm:px-6 min-h-16 border-b border-gray-200 dark:border-gray-700',
    // Add transform origin for smooth scaling
    container: `h-full ${transitionClasses} transform-gpu`
  }
})
</script>

<style scoped>
/* Smooth width animation */
:deep(.slideover-content) {
  will-change: width, transform;
}

/* Override Nuxt UI's default transitions for smoother animation */
:deep([data-state="open"]),
:deep([data-state="closed"]) {
  animation: none !important;
}

/* Custom animation for expand/collapse */
@keyframes slideExpand {
  from {
    transform: translateX(0) scale(0.98);
    opacity: 0.95;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

@keyframes slideCollapse {
  from {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
  to {
    transform: translateX(0) scale(0.98);
    opacity: 0.95;
  }
}

/* Apply smooth transitions to the content wrapper */
:deep(.slideover-wrapper) {
  transition: all 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Ensure the body content transitions smoothly */
:deep(.slideover-body) {
  transition: padding 500ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hardware acceleration for smoother animations */
:deep([data-headlessui-state]) {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
</style>
