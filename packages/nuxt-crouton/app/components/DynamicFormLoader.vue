<template>
  <component
    :is="currentComponent"
    v-if="currentComponent"
    v-bind="componentProps"
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
  if (!props.collection || !componentMap[props.collection]) return null
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
