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
  CollectionBlockAttrs,
  FaqBlockAttrs,
  TwoColumnBlockAttrs,
  ChartBlockAttrs,
  MapBlockAttrs,
  CollectionMapBlockAttrs,
  EmbedBlockAttrs,
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

export const collectionBlockDefinition: BlockDefinition<CollectionBlockAttrs> = {
  type: 'collectionBlock',
  name: 'Collection',
  description: 'Embed a collection in view-only mode',
  icon: 'i-lucide-database',
  category: 'content',
  defaultAttrs: {
    collection: '',
    layout: 'table',
    pageSize: 10,
    showPagination: true
  },
  schema: [
    {
      name: 'collection',
      type: 'collection',
      label: 'Collection',
      required: true,
      description: 'Select a collection to display'
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      description: 'Optional title above the collection'
    },
    {
      name: 'layout',
      type: 'select',
      label: 'Layout',
      options: [
        { label: 'Table', value: 'table' },
        { label: 'List', value: 'list' },
        { label: 'Grid', value: 'grid' },
        { label: 'Cards', value: 'cards' }
      ],
      defaultValue: 'table'
    },
    {
      name: 'pageSize',
      type: 'select',
      label: 'Items per page',
      options: [
        { label: '5 items', value: '5' },
        { label: '10 items', value: '10' },
        { label: '20 items', value: '20' },
        { label: '50 items', value: '50' }
      ],
      defaultValue: '10'
    },
    {
      name: 'showPagination',
      type: 'switch',
      label: 'Show Pagination',
      defaultValue: true
    }
  ]
}

// ============================================================================
// Registry
// ============================================================================

export const faqBlockDefinition: BlockDefinition<FaqBlockAttrs> = {
  type: 'faqBlock',
  name: 'FAQ',
  description: 'A collapsible FAQ accordion',
  icon: 'i-lucide-help-circle',
  category: 'content',
  defaultAttrs: {
    items: [
      { question: 'What is this?', answer: 'A great question — add your answer here.' },
      { question: 'How does it work?', answer: 'Describe how it works here.' }
    ],
    allowMultiple: false
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
      label: 'Title'
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description'
    },
    {
      name: 'allowMultiple',
      type: 'switch',
      label: 'Allow multiple open',
      description: 'Let users expand more than one item at a time'
    },
    {
      name: 'items',
      type: 'faq-items',
      label: 'Questions'
    }
  ]
}

export const twoColumnBlockDefinition: BlockDefinition<TwoColumnBlockAttrs> = {
  type: 'twoColumnBlock',
  name: 'Two Columns',
  description: 'Side-by-side two-column layout',
  icon: 'i-lucide-columns-2',
  category: 'layout',
  defaultAttrs: {
    split: '1/2',
    leftTitle: 'Left column',
    leftDescription: 'Add content for the left side.',
    rightTitle: 'Right column',
    rightDescription: 'Add content for the right side.'
  },
  schema: [
    {
      name: 'split',
      type: 'select',
      label: 'Column split',
      options: [
        { label: 'Equal (50/50)', value: '1/2' },
        { label: 'Left narrow (33/67)', value: '1/3' },
        { label: 'Left wide (67/33)', value: '2/3' }
      ],
      defaultValue: '1/2'
    },
    { name: 'leftTitle', type: 'text', label: 'Left: Title' },
    { name: 'leftDescription', type: 'textarea', label: 'Left: Description' },
    { name: 'leftImage', type: 'image', label: 'Left: Image' },
    { name: 'leftLinks', type: 'links', label: 'Left: Buttons' },
    { name: 'rightTitle', type: 'text', label: 'Right: Title' },
    { name: 'rightDescription', type: 'textarea', label: 'Right: Description' },
    { name: 'rightImage', type: 'image', label: 'Right: Image' },
    { name: 'rightLinks', type: 'links', label: 'Right: Buttons' }
  ]
}

export const chartBlockDefinition: BlockDefinition<ChartBlockAttrs> = {
  type: 'chartBlock',
  name: 'Chart',
  description: 'Embed a collection as a chart (bar, line, area, donut)',
  icon: 'i-lucide-chart-bar',
  category: 'content',
  defaultAttrs: {
    mode: 'collection',
    collection: '',
    chartType: 'bar',
    height: 300,
    stacked: false
  },
  schema: [
    {
      name: 'mode',
      type: 'select',
      label: 'Data source',
      options: [
        { label: 'Collection', value: 'collection' },
        { label: 'Preset', value: 'preset' }
      ],
      defaultValue: 'collection'
    },
    // Preset mode fields
    {
      name: 'preset',
      type: 'chart-preset',
      label: 'Chart Preset',
      description: 'Select a pre-configured chart from an installed package',
      visibleWhen: (attrs) => attrs.mode === 'preset'
    },
    // Collection mode fields
    {
      name: 'collection',
      type: 'collection',
      label: 'Collection',
      description: 'Select a collection to visualize',
      visibleWhen: (attrs) => !attrs.mode || attrs.mode === 'collection'
    },
    {
      name: 'chartType',
      type: 'select',
      label: 'Chart Type',
      options: [
        { label: 'Bar', value: 'bar' },
        { label: 'Line', value: 'line' },
        { label: 'Area', value: 'area' },
        { label: 'Donut', value: 'donut' }
      ],
      defaultValue: 'bar',
      visibleWhen: (attrs) => !attrs.mode || attrs.mode === 'collection'
    },
    {
      name: 'yFields',
      type: 'text',
      label: 'Y-axis fields',
      description: 'Comma-separated field names. Leave empty to auto-detect numeric fields.',
      visibleWhen: (attrs) => !attrs.mode || attrs.mode === 'collection'
    },
    {
      name: 'xField',
      type: 'text',
      label: 'X-axis field',
      description: 'Field for the X axis. Auto-resolved from collection title field if empty.',
      visibleWhen: (attrs) => !attrs.mode || attrs.mode === 'collection'
    },
    // Shared fields (visible in both modes)
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      description: 'Optional heading above the chart (overrides preset default)'
    },
    {
      name: 'height',
      type: 'select',
      label: 'Height',
      options: [
        { label: '200px', value: '200' },
        { label: '300px', value: '300' },
        { label: '400px', value: '400' },
        { label: '500px', value: '500' }
      ],
      defaultValue: '300'
    },
    {
      name: 'stacked',
      type: 'switch',
      label: 'Stacked',
      description: 'Stack series (bar and area charts only)',
      visibleWhen: (attrs) => !attrs.mode || attrs.mode === 'collection'
    }
  ]
}

export const mapBlockDefinition: BlockDefinition<MapBlockAttrs> = {
  type: 'mapBlock',
  name: 'Map',
  description: 'Embed an interactive map with a location pin',
  icon: 'i-lucide-map-pin',
  category: 'content',
  defaultAttrs: {
    lat: 0,
    lng: 0,
    zoom: 12,
    style: 'streets',
    height: 400
  },
  schema: [
    {
      name: 'address',
      type: 'text',
      label: 'Place name',
      description: 'Display label for the location (for reference only)'
    },
    {
      name: 'lat',
      type: 'text',
      label: 'Latitude',
      required: true,
      description: 'Center latitude (e.g. 37.7749)'
    },
    {
      name: 'lng',
      type: 'text',
      label: 'Longitude',
      required: true,
      description: 'Center longitude (e.g. -122.4194)'
    },
    {
      name: 'zoom',
      type: 'select',
      label: 'Zoom',
      options: [
        { label: 'Country (8)', value: '8' },
        { label: 'Region (10)', value: '10' },
        { label: 'City (12)', value: '12' },
        { label: 'Neighbourhood (14)', value: '14' },
        { label: 'Street (16)', value: '16' }
      ],
      defaultValue: '12'
    },
    {
      name: 'style',
      type: 'select',
      label: 'Map style',
      options: [
        { label: 'Streets', value: 'streets' },
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'Satellite', value: 'satellite' },
        { label: 'Outdoors', value: 'outdoors' }
      ],
      defaultValue: 'streets'
    },
    {
      name: 'height',
      type: 'select',
      label: 'Height',
      options: [
        { label: '300px', value: '300' },
        { label: '400px', value: '400' },
        { label: '500px', value: '500' },
        { label: '600px', value: '600' }
      ],
      defaultValue: '400'
    },
    {
      name: 'markerLabel',
      type: 'text',
      label: 'Marker popup',
      description: 'Text shown in the popup when the pin is clicked'
    }
  ]
}

export const collectionMapBlockDefinition: BlockDefinition<CollectionMapBlockAttrs> = {
  type: 'collectionMapBlock',
  name: 'Collection Map',
  description: 'Show collection items as markers on an interactive map',
  icon: 'i-lucide-map',
  category: 'content',
  defaultAttrs: {
    collection: '',
    height: 400,
    zoom: 12,
    style: 'streets'
  },
  schema: [
    {
      name: 'collection',
      type: 'collection',
      label: 'Collection',
      required: true,
      description: 'Select a collection with location data'
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      description: 'Optional heading above the map'
    },
    {
      name: 'coordinateField',
      type: 'text',
      label: 'Coordinate field',
      description: 'Override the auto-detected coordinate field name'
    },
    {
      name: 'labelField',
      type: 'text',
      label: 'Label field',
      description: 'Field to use for marker popup (uses title field if empty)'
    },
    {
      name: 'style',
      type: 'select',
      label: 'Map style',
      options: [
        { label: 'Streets', value: 'streets' },
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'Satellite', value: 'satellite' },
        { label: 'Outdoors', value: 'outdoors' }
      ],
      defaultValue: 'streets'
    },
    {
      name: 'zoom',
      type: 'select',
      label: 'Fallback zoom',
      options: [
        { label: 'Country (8)', value: '8' },
        { label: 'Region (10)', value: '10' },
        { label: 'City (12)', value: '12' },
        { label: 'Neighbourhood (14)', value: '14' },
        { label: 'Street (16)', value: '16' }
      ],
      defaultValue: '12'
    },
    {
      name: 'height',
      type: 'select',
      label: 'Height',
      options: [
        { label: '300px', value: '300' },
        { label: '400px', value: '400' },
        { label: '500px', value: '500' },
        { label: '600px', value: '600' }
      ],
      defaultValue: '400'
    }
  ]
}

export const embedBlockDefinition: BlockDefinition<EmbedBlockAttrs> = {
  type: 'embedBlock',
  name: 'Embed',
  description: 'Embed YouTube videos, Figma files, or any URL',
  icon: 'i-lucide-youtube',
  category: 'content',
  defaultAttrs: {
    url: '',
    provider: 'custom',
    height: 400,
    caption: ''
  },
  schema: [
    {
      name: 'url',
      type: 'text',
      label: 'URL',
      required: true,
      description: 'YouTube, Figma, or any embeddable URL'
    },
    {
      name: 'height',
      type: 'select',
      label: 'Height',
      options: [
        { label: 'Small (300px)', value: '300' },
        { label: 'Medium (400px)', value: '400' },
        { label: 'Large (550px)', value: '550' },
        { label: 'Full HD (720px)', value: '720' }
      ],
      defaultValue: '400'
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Caption',
      description: 'Optional caption displayed below the embed'
    }
  ]
}

export const blockRegistry: Record<BlockType, BlockDefinition> = {
  heroBlock: heroBlockDefinition,
  sectionBlock: sectionBlockDefinition,
  ctaBlock: ctaBlockDefinition,
  cardGridBlock: cardGridBlockDefinition,
  separatorBlock: separatorBlockDefinition,
  richTextBlock: richTextBlockDefinition,
  collectionBlock: collectionBlockDefinition,
  faqBlock: faqBlockDefinition,
  twoColumnBlock: twoColumnBlockDefinition,
  chartBlock: chartBlockDefinition,
  mapBlock: mapBlockDefinition,
  collectionMapBlock: collectionMapBlockDefinition,
  embedBlock: embedBlockDefinition
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
