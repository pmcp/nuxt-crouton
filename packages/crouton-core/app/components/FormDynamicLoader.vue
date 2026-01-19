<template>
  <!-- For delete action, show delete confirmation -->
  <CroutonFormDeleteConfirm
    v-if="action === 'delete'"
    :collection="collection"
    :items="items"
    class="w-full h-full"
  />
  <!-- For other actions, load the form component -->
  <component
    :is="currentComponent"
    v-else-if="currentComponent"
    v-bind="componentProps"
    class="w-full h-full"
  />
  <div v-else>
    Component not found for collection: {{ collection }}
  </div>
</template>

<script setup>
// import useCollections from '~/layers/test/all/composables/useCollections'

const props = defineProps({
  collection: String,
  loading: String,
  action: String,
  items: {
    type: Array,
    default: () => []
  },
  activeItem: {
    type: Object,
    default: () => ({})
  }
})

// Get component mapping from test composable
const { componentMap } = useCollections()

const currentComponent = computed(() => {
  if (!props.collection) return null

  // If action is 'view', try to resolve a Detail component by convention
  if (props.action === 'view') {
    const formComponentName = componentMap[props.collection]
    if (formComponentName) {
      // Convention: Replace 'Form' with 'Detail' in component name
      // e.g., 'DiscubotJobsForm' -> 'DiscubotJobsDetail'
      const detailComponentName = formComponentName.replace(/Form$/, 'Detail')

      try {
        // Try to resolve the Detail component
        const detailComponent = resolveComponent(detailComponentName)
        // If it exists (not a string), use it
        if (typeof detailComponent !== 'string') {
          return detailComponent
        }
      } catch {
        // Detail component doesn't exist, will fall through to Form
      }
    }
  }

  // Fall back to standard form component (for view, create, update, delete)
  if (!componentMap[props.collection]) return null
  return resolveComponent(componentMap[props.collection])
})

// Determine mode based on route context
const route = useRoute()
const mode = computed(() => {
  // Only set mode for translationsUi collection
  if (props.collection === 'translationsUi') {
    return route.path.includes('/super-admin/') ? 'system' : 'team'
  }
  return undefined
})

// Combine all props to pass through to the dynamic component
const componentProps = computed(() => {
  const baseProps = {
    collection: props.collection,
    loading: props.loading,
    action: props.action,
    items: props.items,
    activeItem: props.activeItem,
    ...useAttrs() // Also include any additional attrs that might be passed
  }

  // Add mode prop for translationsUi collection
  if (mode.value !== undefined) {
    baseProps.mode = mode.value
  }

  return baseProps
})
</script>
