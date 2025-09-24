import { ref, computed, type Ref } from 'vue'

export interface UseExpandableSlideoverOptions {
  defaultExpanded?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl' | 'full'
  closeOnExpand?: boolean
}

export function useExpandableSlideover(options: UseExpandableSlideoverOptions = {}) {
  const {
    defaultExpanded = false,
    maxWidth = 'xl',
    closeOnExpand = false
  } = options

  const isOpen = ref(false)
  const isExpanded = ref(defaultExpanded)

  // Toggle expand/collapse
  const toggleExpand = () => {
    isExpanded.value = !isExpanded.value

    // Optionally close on expand for immersive experience
    if (closeOnExpand && isExpanded.value) {
      setTimeout(() => {
        isOpen.value = false
      }, 300)
    }
  }

  // Expand to fullscreen
  const expand = () => {
    isExpanded.value = true
  }

  // Collapse to sidebar
  const collapse = () => {
    isExpanded.value = false
  }

  // Open slideover
  const open = (expanded = false) => {
    isOpen.value = true
    isExpanded.value = expanded
  }

  // Close slideover
  const close = () => {
    isOpen.value = false
    // Reset expanded state when closing
    setTimeout(() => {
      isExpanded.value = defaultExpanded
    }, 300)
  }

  // Get content class for sidebar mode
  const getContentClass = () => {
    switch (maxWidth) {
      case 'sm': return 'right-0 inset-y-0 w-full max-w-sm'
      case 'md': return 'right-0 inset-y-0 w-full max-w-md'
      case 'lg': return 'right-0 inset-y-0 w-full max-w-lg'
      case 'xl': return 'right-0 inset-y-0 w-full max-w-xl'
      case '2xl': return 'right-0 inset-y-0 w-full max-w-2xl'
      case '4xl': return 'right-0 inset-y-0 w-full max-w-4xl'
      case '7xl': return 'right-0 inset-y-0 w-full max-w-7xl'
      case 'full': return 'right-0 inset-y-0 w-full'
      default: return 'right-0 inset-y-0 w-full max-w-xl'
    }
  }

  // Compute UI configuration based on expanded state
  const slideoverUi = computed(() => {
    // Base transition classes for smooth width animation
    const transitionClasses = 'transition-[max-width,width] duration-300 ease-in-out'
    const wrapperTransition = 'transition-all duration-300 ease-in-out'

    if (isExpanded.value) {
      // Fullscreen mode - override to full width with transitions
      return {
        overlay: 'fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity duration-300',
        content: `right-0 inset-y-0 w-full max-w-none ${transitionClasses}`,
        wrapper: `w-full h-full ${wrapperTransition}`,
        body: `flex-1 overflow-y-auto p-6 ${wrapperTransition}`,
        header: 'flex items-center gap-1.5 p-4 sm:px-6 min-h-16 border-b border-gray-200 dark:border-gray-700'
      }
    }

    // Sidebar mode with configurable width and transitions
    return {
      overlay: 'transition-opacity duration-300',
      content: `${getContentClass()} ${transitionClasses}`,
      wrapper: wrapperTransition,
      body: wrapperTransition
    }
  })

  // Side prop for USlideover (always right now)
  const side = computed(() => 'right')

  // Icon for expand/collapse button
  const expandIcon = computed(() =>
    isExpanded.value
      ? 'i-lucide-minimize-2'
      : 'i-lucide-maximize-2'
  )

  // Tooltip text for expand button
  const expandTooltip = computed(() =>
    isExpanded.value
      ? 'Collapse to sidebar'
      : 'Expand to fullscreen'
  )

  return {
    isOpen,
    isExpanded,
    toggleExpand,
    expand,
    collapse,
    open,
    close,
    slideoverUi,
    side, // Always 'right' now
    expandIcon,
    expandTooltip
  }
}