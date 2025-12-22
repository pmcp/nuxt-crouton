/**
 * Component registry for theme canvas
 * Component list generated from @nuxt/ui package
 * Run: node scripts/generate-components.mjs
 */

import { GENERATED_COMPONENTS, GENERATED_COMPONENT_NAMES } from './componentList.generated'

export interface ComponentConfig {
  name: string
  title: string
  category: string
  defaultProps: Record<string, any>
  slots?: Record<string, string>
}

// Component-specific default props for preview
const PREVIEW_PROPS: Record<string, { props?: Record<string, any>; slots?: Record<string, string> }> = {
  UButton: { props: { label: 'Button', color: 'primary' } },
  UBadge: { props: { label: 'Badge', color: 'primary' } },
  UAvatar: { props: { text: 'JD', size: 'md' } },
  UInput: { props: { placeholder: 'Type here...' } },
  UTextarea: { props: { placeholder: 'Enter text...' } },
  USelect: { props: { placeholder: 'Select...', items: ['Option 1', 'Option 2', 'Option 3'] } },
  UCheckbox: { props: { label: 'Check me' } },
  USwitch: { props: { label: 'Toggle me' } },
  URadioGroup: { props: { items: [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }] } },
  UCard: { slots: { default: 'Card content goes here' } },
  UAlert: { props: { title: 'Alert', description: 'This is an alert message.' } },
  UProgress: { props: { value: 60 } },
  UAccordion: { props: { items: [{ label: 'Section 1', content: 'Content 1' }, { label: 'Section 2', content: 'Content 2' }] } },
  UTooltip: { props: { text: 'Tooltip text' }, slots: { default: 'Hover me' } },
  UKbd: { props: { value: '⌘K' } },
  UIcon: { props: { name: 'i-lucide-star', size: '24' } },
  UChip: { slots: { default: 'Chip' } },
  USkeleton: { props: { class: 'h-8 w-32' } },
  USlider: { props: { defaultValue: [50] } },
  UPinInput: { props: { length: 4 } },
  UPagination: { props: { total: 100, defaultPage: 1 } },
  UTabs: { props: { items: [{ label: 'Tab 1', value: '1' }, { label: 'Tab 2', value: '2' }] } },
  UBreadcrumb: { props: { items: [{ label: 'Home' }, { label: 'Products' }, { label: 'Item' }] } },
  UStepper: { props: { items: [{ title: 'Step 1' }, { title: 'Step 2' }, { title: 'Step 3' }] } },
  UNavigationMenu: { props: { items: [{ label: 'Home' }, { label: 'About' }, { label: 'Contact' }] } },
  UCalendar: { props: {} },
  UCarousel: { props: { items: [{ src: '' }, { src: '' }] } },
  UTable: { props: { data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }], columns: [{ id: 'id', accessorKey: 'id', header: 'ID' }, { id: 'name', accessorKey: 'name', header: 'Name' }] } },
  UTimeline: { props: { items: [{ title: 'Event 1' }, { title: 'Event 2' }] } },
  UTree: { props: { items: [{ label: 'Root', children: [{ label: 'Child' }] }] } },
  UUser: { props: { name: 'John Doe', description: 'Developer' } },
  UEmpty: { props: { title: 'No data', description: 'Nothing to display' } },
  UColorPicker: { props: {} },
  UInputNumber: { props: { placeholder: '0' } },
  UInputDate: { props: { placeholder: 'Select date' } },
  UInputTime: { props: { placeholder: 'Select time' } },
  UInputTags: { props: { placeholder: 'Add tags...' } },
  UInputMenu: { props: { placeholder: 'Search...', items: ['Apple', 'Banana', 'Cherry'] } },
  USelectMenu: { props: { placeholder: 'Select...', items: ['Option 1', 'Option 2', 'Option 3'] } },
  UCheckboxGroup: { props: { items: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] } },
  UFileUpload: { props: {} },
  UCollapsible: { props: {}, slots: { default: 'Collapsible content' } },
  UPopover: { slots: { default: 'Click me' } },
  UDropdownMenu: { props: { items: [[{ label: 'Edit' }, { label: 'Delete' }]] } },
  UContextMenu: { props: { items: [[{ label: 'Copy' }, { label: 'Paste' }]] }, slots: { default: 'Right-click me' } },
  UModal: { props: {} },
  USlideover: { props: {} },
  UDrawer: { props: {} },
  UToast: { props: { title: 'Toast', description: 'Message' } },
  UMarquee: { slots: { default: 'Scrolling content...' } },
  UScrollArea: { props: { class: 'h-32 w-48' }, slots: { default: 'Scrollable content' } },
}

// Re-export the generated list
export const COMPONENT_LIST = GENERATED_COMPONENTS

// Categories for filtering
export const CATEGORIES = [
  { key: 'element', label: 'Elements' },
  { key: 'form', label: 'Forms' },
  { key: 'data', label: 'Data' },
  { key: 'navigation', label: 'Navigation' },
  { key: 'overlay', label: 'Overlays' },
] as const

// Build the registry from generated list + preview props
export const COMPONENT_REGISTRY: Record<string, ComponentConfig> = Object.fromEntries(
  COMPONENT_LIST.map(comp => {
    const preview = PREVIEW_PROPS[comp.name] || {}
    return [comp.name, {
      name: comp.name,
      title: comp.title,
      category: comp.category,
      defaultProps: preview.props || {},
      slots: preview.slots
    }]
  })
)

// List of all component names for resolving (from generated)
export const COMPONENT_NAMES = GENERATED_COMPONENT_NAMES

export function useComponentRegistry() {
  const components = Object.values(COMPONENT_REGISTRY)

  const getComponentsByCategory = (category: string) => {
    return components.filter(c => c.category === category)
  }

  const getComponent = (name: string) => {
    return COMPONENT_REGISTRY[name]
  }

  return {
    components,
    categories: CATEGORIES,
    getComponentsByCategory,
    getComponent,
    componentNames: COMPONENT_NAMES
  }
}
