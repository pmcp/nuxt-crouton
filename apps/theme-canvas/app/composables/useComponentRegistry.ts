export interface ComponentConfig {
  name: string
  category: 'elements' | 'forms' | 'layout' | 'feedback' | 'overlays'
  defaultProps: Record<string, any>
  slots?: Record<string, string>
}

export const COMPONENT_REGISTRY: Record<string, ComponentConfig> = {
  UButton: {
    name: 'UButton',
    category: 'elements',
    defaultProps: { label: 'Button', color: 'primary' }
  },
  UBadge: {
    name: 'UBadge',
    category: 'elements',
    defaultProps: { label: 'Badge', color: 'primary' }
  },
  UAvatar: {
    name: 'UAvatar',
    category: 'elements',
    defaultProps: { text: 'JD', size: 'md' }
  },
  UInput: {
    name: 'UInput',
    category: 'forms',
    defaultProps: { placeholder: 'Type here...' }
  },
  UTextarea: {
    name: 'UTextarea',
    category: 'forms',
    defaultProps: { placeholder: 'Enter text...' }
  },
  USelect: {
    name: 'USelect',
    category: 'forms',
    defaultProps: {
      placeholder: 'Select...',
      items: ['Option 1', 'Option 2', 'Option 3']
    }
  },
  UCheckbox: {
    name: 'UCheckbox',
    category: 'forms',
    defaultProps: { label: 'Check me' }
  },
  USwitch: {
    name: 'USwitch',
    category: 'forms',
    defaultProps: { label: 'Toggle me' }
  },
  URadio: {
    name: 'URadio',
    category: 'forms',
    defaultProps: { label: 'Select me', value: 'option1' }
  },
  UCard: {
    name: 'UCard',
    category: 'layout',
    defaultProps: {},
    slots: { default: 'Card content goes here' }
  },
  USeparator: {
    name: 'USeparator',
    category: 'layout',
    defaultProps: {}
  },
  UAccordion: {
    name: 'UAccordion',
    category: 'layout',
    defaultProps: {
      items: [
        { label: 'Item 1', content: 'Content 1' },
        { label: 'Item 2', content: 'Content 2' }
      ]
    }
  },
  UAlert: {
    name: 'UAlert',
    category: 'feedback',
    defaultProps: { title: 'Alert Title', description: 'This is an alert message.' }
  },
  UProgress: {
    name: 'UProgress',
    category: 'feedback',
    defaultProps: { value: 60 }
  }
}

export const CATEGORIES = [
  { key: 'elements', label: 'Elements' },
  { key: 'forms', label: 'Forms' },
  { key: 'layout', label: 'Layout' },
  { key: 'feedback', label: 'Feedback' }
] as const

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
    getComponent
  }
}
