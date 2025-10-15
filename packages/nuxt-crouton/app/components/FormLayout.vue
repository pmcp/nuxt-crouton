<script setup lang="ts">
interface NavigationItem {
  label: string
  value: string
  icon?: string
}

interface Props {
  tabs?: boolean
  navigationItems?: NavigationItem[]
}

const props = withDefaults(defineProps<Props>(), {
  tabs: false,
  navigationItems: () => []
})


const activeSection = ref(props.navigationItems?.[0]?.value || '')

// Detect if sidebar slot is being used
const slots = useSlots()
const hasSidebar = computed(() => !!slots.sidebar)

// Prepare accordion items for mobile sidebar
const sidebarAccordionItems = [{
  label: 'Meta settings',
  defaultOpen: false
}]
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header Slot -->
    <div v-if="$slots.header" class="mb-6">
      <slot name="header" />
    </div>
    <!-- Main Container with responsive max-width -->
    <div
      class="flex flex-col gap-6 w-full mx-auto flex-grow"
      :class="hasSidebar ? 'lg:max-w-5xl' : 'lg:max-w-2xl'"
    >
      <!-- Grid Container (only when sidebar exists) -->
      <div :class="hasSidebar ? '@container grid grid-cols-1 @lg:grid-cols-3 gap-6' : ''">
        <!-- Main Area -->
        <div :class="hasSidebar ? '@lg:col-span-2 space-y-6' : 'space-y-6'">
          <!-- Tab Navigation (optional) -->

            <UTabs
                v-if="tabs && navigationItems.length"
                v-model="activeSection"
                :items="navigationItems"
                :content="false"
                class="w-full"
            />
            <!-- Main Content Slot -->
            <slot class="p" name="main" :active-section="activeSection" />

            <!-- Mobile / Small area: Accordion at top -->
            <div class="@lg:hidden mb-6" :ui="{body: 'sm:p-4 '}">
              <UAccordion :items="sidebarAccordionItems">
                <template #content="{ item }">
                  <div class="">
                    <slot name="sidebar" />
                  </div>
                </template>
              </UAccordion>
            </div>

        </div>

        <!-- Sidebar Area (responsive: column on desktop, accordion on mobile) -->
        <div v-if="hasSidebar" class="@lg:col-span-1">
          <!-- Desktop: Regular sidebar column -->
          <div class="hidden @lg:block space-y-6">
            <slot name="sidebar" />
          </div>
        </div>
      </div>


    </div>
    <!-- Footer Slot -->
    <div v-if="$slots.footer">
      <slot name="footer" />
    </div>
  </div>
</template>
