import type { CroutonBlockDefinition } from '@fyit/crouton-core/app/types/block-definition'

// Inline POS block: full helper login + order interface embedded in a CMS
// page. Mirrors /order/[team]/[event]/{login,index} but inline so a visitor
// can authenticate and take orders without leaving the CMS-rendered page.
const orderInterfaceBlock: CroutonBlockDefinition = {
  type: 'orderInterfaceBlock',
  name: 'Order Interface',
  description: 'Inline helper POS for one event with login + order taking',
  icon: 'i-lucide-shopping-cart',
  category: 'customer',
  clientOnly: true,
  defaultAttrs: {
    eventSlug: ''
  },
  components: {
    editorView: 'SalesBlocksOrderInterfaceView',
    renderer: 'SalesBlocksOrderInterfaceRender'
  },
  propertyComponents: {
    eventSlug: 'SalesBlocksPropertiesEventSlugPicker'
  },
  schema: [
    {
      name: 'eventSlug',
      type: 'eventSlug',
      label: 'Event',
      description: 'Pick which event\'s POS to embed. Visitors will be asked to log in as a helper first.'
    }
  ],
  tiptap: {
    parseHTMLTag: 'div[data-type="order-interface-block"]',
    attributes: {
      eventSlug: { default: '' }
    }
  }
}

// Storefront block for crouton-pages: editor picks an event by slug, public
// renderer fetches it via the existing /api/crouton-sales/events/[teamId]/by-slug
// endpoint and shows a card with a CTA to the POS surface.
const eventStorefrontBlock: CroutonBlockDefinition = {
  type: 'eventStorefrontBlock',
  name: 'Event Storefront',
  description: 'Embed a public order CTA for one event on a CMS page',
  icon: 'i-lucide-store',
  category: 'customer',
  clientOnly: true,
  defaultAttrs: {
    eventSlug: '',
    title: '',
    ctaLabel: ''
  },
  components: {
    editorView: 'SalesBlocksEventStorefrontView',
    renderer: 'SalesBlocksEventStorefrontRender'
  },
  // Maps custom schema field types to the auto-imported component that
  // renders them inside the block property panel.
  propertyComponents: {
    eventSlug: 'SalesBlocksPropertiesEventSlugPicker'
  },
  schema: [
    {
      name: 'eventSlug',
      type: 'eventSlug',
      label: 'Event',
      description: 'Pick which sales event to embed'
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title override',
      description: 'Optional heading; falls back to the event title'
    },
    {
      name: 'ctaLabel',
      type: 'text',
      label: 'Button label',
      description: 'Optional override for the "Order Now" button'
    }
  ],
  tiptap: {
    parseHTMLTag: 'div[data-type="event-storefront-block"]',
    attributes: {
      eventSlug: { default: '' },
      title: { default: '' },
      ctaLabel: { default: '' }
    }
  }
}

export default defineAppConfig({
  // App auto-discovery registration for crouton-sales
  croutonApps: {
    sales: {
      id: 'sales',
      name: 'sales.title',
      icon: 'i-lucide-shopping-cart',
      // API route prefixes for devtools operation tracking
      apiRoutes: ['/api/crouton-sales/'],
      // Admin routes (appear in /admin/[team]/ sidebar).
      // Each entry maps 1:1 to a page under app/pages/admin/[team]/sales/.
      adminRoutes: [
        {
          path: '/sales',
          label: 'sales.admin.overview',
          icon: 'i-lucide-shopping-cart'
        },
        {
          path: '/sales/events',
          label: 'sales.sidebar.events',
          icon: 'i-lucide-calendar'
        },
        {
          path: '/sales/products',
          label: 'sales.sidebar.products',
          icon: 'i-lucide-package'
        },
        {
          path: '/sales/categories',
          label: 'sales.sidebar.categories',
          icon: 'i-lucide-folder'
        },
        {
          path: '/sales/orders',
          label: 'sales.orders.title',
          icon: 'i-lucide-receipt'
        },
        {
          path: '/sales/locations',
          label: 'sales.sidebar.locations',
          icon: 'i-lucide-map-pin'
        },
        {
          path: '/sales/printers',
          label: 'sales.sidebar.printers',
          icon: 'i-lucide-printer'
        },
        {
          path: '/sales/helpers',
          label: 'sales.sidebar.helpers',
          icon: 'i-lucide-users'
        },
        {
          path: '/sales/clients',
          label: 'sales.sidebar.clients',
          icon: 'i-lucide-user'
        }
      ],
      dashboardRoutes: [],
      settingsRoutes: [],
      // Page types for crouton-pages CMS integration. Appears in the page
      // type selector at /admin/[team]/pages.
      pageTypes: [
        {
          id: 'eventStorefront',
          name: 'Event Storefront',
          description: 'Full page showing one event with order CTA',
          icon: 'i-lucide-store',
          component: 'SalesBlocksEventStorefrontRender',
          category: 'customer'
        }
      ]
    }
  },
  croutonBlocks: {
    eventStorefrontBlock,
    orderInterfaceBlock
  }
})
