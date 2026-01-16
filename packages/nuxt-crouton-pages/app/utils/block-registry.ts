/**
 * Block Registry
 *
 * Defines all available block types with their schemas and default values.
 * Used by the editor for block creation and property editing.
 */

import type {
  BlockDefinition,
  BlockType,
  HeroBlockAttrs,
  SectionBlockAttrs,
  CTABlockAttrs,
  CardGridBlockAttrs,
  SeparatorBlockAttrs,
  RichTextBlockAttrs,
  BlockMenuItem
} from '../types/blocks'

// ============================================================================
// Block Definitions
// ============================================================================

export const heroBlockDefinition: BlockDefinition<HeroBlockAttrs> = {
  type: 'heroBlock',
  name: 'Hero',
  description: 'A responsive hero section with title, description, and CTA buttons',
  icon: 'i-lucide-layout-template',
  category: 'hero',
  defaultAttrs: {
    title: 'Welcome to our site',
    description: 'Add a compelling description for your hero section.',
    orientation: 'vertical',
    reverse: false,
    links: []
  },
  schema: [
    {
      name: 'headline',
      type: 'text',
      label: 'Headline',
      description: 'Small text above the title'
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      required: true
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description'
    },
    {
      name: 'orientation',
      type: 'select',
      label: 'Orientation',
      options: [
        { label: 'Vertical', value: 'vertical' },
        { label: 'Horizontal', value: 'horizontal' }
      ],
      defaultValue: 'vertical'
    },
    {
      name: 'reverse',
      type: 'switch',
      label: 'Reverse Layout',
      description: 'Swap content and image positions'
    },
    {
      name: 'links',
      type: 'links',
      label: 'Call to Action Buttons'
    },
    {
      name: 'image',
      type: 'image',
      label: 'Hero Image'
    }
  ]
}

export const sectionBlockDefinition: BlockDefinition<SectionBlockAttrs> = {
  type: 'sectionBlock',
  name: 'Section',
  description: 'A content section with features grid',
  icon: 'i-lucide-square-stack',
  category: 'content',
  defaultAttrs: {
    title: 'Section Title',
    description: 'Describe this section.',
    orientation: 'vertical',
    reverse: false,
    features: []
  },
  schema: [
    {
      name: 'headline',
      type: 'text',
      label: 'Headline',
      description: 'Small text above the title'
    },
    {
      name: 'icon',
      type: 'icon',
      label: 'Icon',
      description: 'Icon displayed above the title'
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      required: true
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description'
    },
    {
      name: 'orientation',
      type: 'select',
      label: 'Orientation',
      options: [
        { label: 'Vertical', value: 'vertical' },
        { label: 'Horizontal', value: 'horizontal' }
      ],
      defaultValue: 'vertical'
    },
    {
      name: 'reverse',
      type: 'switch',
      label: 'Reverse Layout'
    },
    {
      name: 'features',
      type: 'features',
      label: 'Features'
    },
    {
      name: 'links',
      type: 'links',
      label: 'Action Buttons'
    }
  ]
}

export const ctaBlockDefinition: BlockDefinition<CTABlockAttrs> = {
  type: 'ctaBlock',
  name: 'Call to Action',
  description: 'A call-to-action banner',
  icon: 'i-lucide-megaphone',
  category: 'cta',
  defaultAttrs: {
    title: 'Ready to get started?',
    description: 'Start your journey today.',
    orientation: 'vertical',
    variant: 'outline',
    links: []
  },
  schema: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      required: true
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description'
    },
    {
      name: 'orientation',
      type: 'select',
      label: 'Orientation',
      options: [
        { label: 'Vertical', value: 'vertical' },
        { label: 'Horizontal', value: 'horizontal' }
      ],
      defaultValue: 'vertical'
    },
    {
      name: 'reverse',
      type: 'switch',
      label: 'Reverse Layout'
    },
    {
      name: 'variant',
      type: 'select',
      label: 'Style',
      options: [
        { label: 'Outline', value: 'outline' },
        { label: 'Solid', value: 'solid' },
        { label: 'Soft', value: 'soft' },
        { label: 'Subtle', value: 'subtle' },
        { label: 'Naked', value: 'naked' }
      ],
      defaultValue: 'outline'
    },
    {
      name: 'links',
      type: 'links',
      label: 'Action Buttons'
    }
  ]
}

export const cardGridBlockDefinition: BlockDefinition<CardGridBlockAttrs> = {
  type: 'cardGridBlock',
  name: 'Card Grid',
  description: 'A grid of cards with icons and links',
  icon: 'i-lucide-layout-grid',
  category: 'content',
  defaultAttrs: {
    columns: 3,
    cards: [
      { title: 'Card 1', description: 'First card description' },
      { title: 'Card 2', description: 'Second card description' },
      { title: 'Card 3', description: 'Third card description' }
    ]
  },
  schema: [
    {
      name: 'headline',
      type: 'text',
      label: 'Headline'
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title'
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description'
    },
    {
      name: 'columns',
      type: 'select',
      label: 'Columns',
      options: [
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' }
      ],
      defaultValue: '3'
    },
    {
      name: 'cards',
      type: 'cards',
      label: 'Cards'
    }
  ]
}

export const separatorBlockDefinition: BlockDefinition<SeparatorBlockAttrs> = {
  type: 'separatorBlock',
  name: 'Separator',
  description: 'A visual divider between sections',
  icon: 'i-lucide-minus',
  category: 'layout',
  defaultAttrs: {
    type: 'solid'
  },
  schema: [
    {
      name: 'label',
      type: 'text',
      label: 'Label',
      description: 'Optional text in the middle of the separator'
    },
    {
      name: 'icon',
      type: 'icon',
      label: 'Icon',
      description: 'Optional icon instead of text'
    },
    {
      name: 'type',
      type: 'select',
      label: 'Line Style',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Dotted', value: 'dotted' }
      ],
      defaultValue: 'solid'
    }
  ]
}

export const richTextBlockDefinition: BlockDefinition<RichTextBlockAttrs> = {
  type: 'richTextBlock',
  name: 'Rich Text',
  description: 'Standard formatted text content',
  icon: 'i-lucide-type',
  category: 'content',
  defaultAttrs: {
    content: '<p>Start writing...</p>'
  },
  schema: [
    {
      name: 'content',
      type: 'textarea',
      label: 'Content',
      required: true
    }
  ]
}

// ============================================================================
// Registry
// ============================================================================

export const blockRegistry: Record<BlockType, BlockDefinition> = {
  heroBlock: heroBlockDefinition,
  sectionBlock: sectionBlockDefinition,
  ctaBlock: ctaBlockDefinition,
  cardGridBlock: cardGridBlockDefinition,
  separatorBlock: separatorBlockDefinition,
  richTextBlock: richTextBlockDefinition
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getBlockDefinition(type: BlockType): BlockDefinition | undefined {
  return blockRegistry[type]
}

export function getBlockDefaultAttrs<T extends BlockType>(type: T): BlockDefinition['defaultAttrs'] {
  const def = blockRegistry[type]
  return def ? { ...def.defaultAttrs } : {}
}

export function getAllBlockTypes(): BlockType[] {
  return Object.keys(blockRegistry) as BlockType[]
}

export function getBlockMenuItems(): BlockMenuItem[] {
  return Object.values(blockRegistry).map(def => ({
    type: def.type,
    name: def.name,
    description: def.description,
    icon: def.icon,
    category: def.category
  }))
}

export function getBlocksByCategory(): Record<string, BlockMenuItem[]> {
  const items = getBlockMenuItems()
  return items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, BlockMenuItem[]>)
}

export function createBlock<T extends BlockType>(
  type: T,
  attrs?: Partial<BlockDefinition['defaultAttrs']>
): { type: T; attrs: BlockDefinition['defaultAttrs'] } {
  const defaultAttrs = getBlockDefaultAttrs(type)
  return {
    type,
    attrs: { ...defaultAttrs, ...attrs }
  }
}
