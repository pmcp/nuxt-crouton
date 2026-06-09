import type { CroutonBlockDefinition } from '@fyit/crouton-core/app/types/block-definition'
import { SALES_CHART_KIND_OPTIONS } from './utils/chart-blocks'

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
    eventSlug: '',
    height: 'tall'
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
    },
    {
      name: 'height',
      type: 'select',
      label: 'Height',
      description: 'Compact/Tall sit inside the page flow. Fill screen makes the POS take the full viewport — pair it with the Full width size for a dedicated POS page.',
      defaultValue: 'tall',
      options: [
        { label: 'Compact (60% viewport)', value: 'compact' },
        { label: 'Tall (80% viewport)', value: 'tall' },
        { label: 'Fill screen', value: 'fill' }
      ]
    }
  ],
  tiptap: {
    parseHTMLTag: 'div[data-type="order-interface-block"]',
    attributes: {
      eventSlug: { default: '' },
      height: { default: 'tall' }
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

// Sales analytics block for crouton-pages: editor picks a chart kind and an
// event scope (one event or all). Renders via CroutonChartsWidget when
// @fyit/crouton-charts is installed; degrades to a notice otherwise.
const salesChartBlock: CroutonBlockDefinition = {
  type: 'salesChartBlock',
  name: 'Sales Chart',
  description: 'Embed a sales analytics chart for one event or the whole team',
  icon: 'i-lucide-chart-bar',
  category: 'data',
  clientOnly: true,
  defaultAttrs: {
    chart: 'revenue-by-day',
    eventScope: '',
    chartTypeOverride: 'default',
    title: '',
    height: 300
  },
  components: {
    editorView: 'SalesBlocksChartBlockView',
    renderer: 'SalesBlocksChartBlockRender'
  },
  propertyComponents: {
    'sales-event-scope': 'SalesBlocksPropertiesEventScopePicker'
  },
  schema: [
    {
      name: 'chart',
      type: 'select',
      label: 'Chart',
      description: 'Which sales metric to visualize',
      defaultValue: 'revenue-by-day',
      options: SALES_CHART_KIND_OPTIONS
    },
    {
      name: 'eventScope',
      type: 'sales-event-scope',
      label: 'Event scope',
      description: 'Limit to one event, or show all events for the team'
    },
    {
      name: 'chartTypeOverride',
      type: 'select',
      label: 'Chart type',
      description: 'Override the chart\'s default type',
      defaultValue: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Bar', value: 'bar' },
        { label: 'Line', value: 'line' },
        { label: 'Area', value: 'area' },
        { label: 'Donut', value: 'donut' }
      ]
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      description: 'Optional heading above the chart (overrides the default)'
    },
    {
      name: 'height',
      type: 'select',
      label: 'Height',
      defaultValue: '300',
      options: [
        { label: '200px', value: '200' },
        { label: '300px', value: '300' },
        { label: '400px', value: '400' },
        { label: '500px', value: '500' }
      ]
    }
  ],
  tiptap: {
    parseHTMLTag: 'div[data-type="sales-chart-block"]',
    attributes: {
      chart: { default: 'revenue-by-day' },
      eventScope: { default: '' },
      chartTypeOverride: { default: 'default' },
      title: { default: '' },
      height: { default: 300, htmlAttr: 'data-height', parseType: 'int' }
    }
  }
}

// Sales product × day pivot table for crouton-pages: rows = products,
// columns = days, last column = total, with an interactive Units/Revenue
// toggle. Pure UTable — no charts dependency.
const salesProductMatrixBlock: CroutonBlockDefinition = {
  type: 'salesProductMatrixBlock',
  name: 'Sales Table (product × day)',
  description: 'Pivot table of products by day with a Units/Revenue toggle',
  icon: 'i-lucide-table',
  category: 'data',
  clientOnly: true,
  defaultAttrs: {
    eventScope: '',
    measure: 'units',
    title: ''
  },
  components: {
    editorView: 'SalesBlocksProductMatrixView',
    renderer: 'SalesBlocksProductMatrixRender'
  },
  propertyComponents: {
    'sales-event-scope': 'SalesBlocksPropertiesEventScopePicker'
  },
  schema: [
    {
      name: 'eventScope',
      type: 'sales-event-scope',
      label: 'Event scope',
      description: 'Limit to one event, or show all events for the team'
    },
    {
      name: 'measure',
      type: 'select',
      label: 'Default measure',
      description: 'Which measure the table shows first (viewers can toggle)',
      defaultValue: 'units',
      options: [
        { label: 'Units sold', value: 'units' },
        { label: 'Revenue', value: 'revenue' }
      ]
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      description: 'Optional heading above the table'
    }
  ],
  tiptap: {
    parseHTMLTag: 'div[data-type="sales-product-matrix-block"]',
    attributes: {
      eventScope: { default: '' },
      measure: { default: 'units' },
      title: { default: '' }
    }
  }
}

// Admin event workspace embedded in a CMS page: the full Products / Orders /
// Printers / Settings tabbed workspace for one event. The editor fixes the
// event by slug; the renderer hides the switcher and shows a sign-in notice for
// anonymous visitors (the tabs are authenticated admin surfaces).
const eventWorkspaceBlock: CroutonBlockDefinition = {
  type: 'eventWorkspaceBlock',
  name: 'Event Workspace',
  description: 'Embed the full admin workspace (products, orders, printers, settings) for one event',
  icon: 'i-lucide-layout-dashboard',
  category: 'admin',
  clientOnly: true,
  defaultAttrs: {
    eventSlug: ''
  },
  components: {
    editorView: 'SalesBlocksEventWorkspaceView',
    renderer: 'SalesBlocksEventWorkspaceRender'
  },
  propertyComponents: {
    eventSlug: 'SalesBlocksPropertiesEventSlugPicker'
  },
  schema: [
    {
      name: 'eventSlug',
      type: 'eventSlug',
      label: 'Event',
      description: 'Pick which event\'s workspace to embed. Only signed-in team members can use it.'
    }
  ],
  tiptap: {
    parseHTMLTag: 'div[data-type="event-workspace-block"]',
    attributes: {
      eventSlug: { default: '' }
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
          // name/description are i18n keys, translated at render via useT().
          name: 'sales.pageTypes.eventStorefront.name',
          description: 'sales.pageTypes.eventStorefront.description',
          icon: 'i-lucide-store',
          component: 'SalesBlocksEventStorefrontRender',
          category: 'customer'
        }
      ]
    }
  },
  croutonBlocks: {
    eventStorefrontBlock,
    orderInterfaceBlock,
    eventWorkspaceBlock,
    salesChartBlock,
    salesProductMatrixBlock
  }
})
