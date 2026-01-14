<script setup lang="ts">
/**
 * Page Renderer Component
 *
 * Renders a page based on its page type. For regular pages, renders
 * the editor content. For app pages, renders the registered component.
 */

interface PageRecord {
  id: string
  teamId: string
  title: string
  slug: string
  pageType: string
  content?: string | null
  config?: Record<string, unknown> | null
  status: string
  visibility: string
  showInNavigation: boolean
  parentId?: string | null
  order: number
}

interface Props {
  /** The page record to render */
  page: PageRecord
}

const props = defineProps<Props>()

const { getPageType } = usePageTypes()

/**
 * Resolved page type information
 */
const pageType = computed(() => {
  if (!props.page.pageType || props.page.pageType === 'regular') {
    return getPageType('core:regular')
  }
  return getPageType(props.page.pageType)
})

/**
 * Component to render based on page type
 */
const componentName = computed(() => {
  return pageType.value?.component || 'CroutonPagesRegularContent'
})

/**
 * Props to pass to the component
 */
const componentProps = computed(() => {
  const defaultProps = pageType.value?.defaultProps || {}
  const pageConfig = props.page.config || {}

  return {
    ...defaultProps,
    ...pageConfig,
    page: props.page
  }
})

/**
 * Check if this is a regular content page
 */
const isRegularPage = computed(() => {
  return !props.page.pageType || props.page.pageType === 'regular' || props.page.pageType === 'core:regular'
})
</script>

<template>
  <div class="page-renderer">
    <!-- Regular page: render editor content -->
    <template v-if="isRegularPage">
      <CroutonPagesRegularContent :page="page" />
    </template>

    <!-- App page type: render the registered component -->
    <template v-else-if="pageType">
      <component
        :is="componentName"
        v-bind="componentProps"
      />
    </template>

    <!-- Unknown page type: show error -->
    <template v-else>
      <div class="p-8 text-center">
        <UIcon name="i-lucide-alert-triangle" class="size-12 text-warning mb-4" />
        <h2 class="text-lg font-semibold mb-2">Unknown Page Type</h2>
        <p class="text-muted">
          The page type "{{ page.pageType }}" is not registered.
          The app providing this page type may not be installed.
        </p>
      </div>
    </template>
  </div>
</template>
