import type { CroutonBlockDefinition } from '@fyit/crouton-core/app/types/block-definition'
import { SALES_CHART_KIND_OPTIONS } from './utils/chart-blocks'

// Inline POS block: full helper login + order interface embedded in a CMS
// page. Mirrors /order/[team]/[event]/{login,index} but inline so a visitor
// can authenticate and take orders without leaving the CMS-rendered page.
const orderInterfaceBlock: CroutonBlockDefinition = {
  type: 'orderInterfaceBlock',
  // name/description and schema labels/descriptions are i18n keys, translated
  // by the crouton-pages block editor/panel via useT(). See i18n/locales/*.json.
  name: 'sales.blocks.orderInterface.name',
  description: 'sales.blocks.orderInterface.description',
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
      label: 'sales.blocks.orderInterface.fields.eventSlug.label',
      description: 'sales.blocks.orderInterface.fields.eventSlug.description'
    },
    {
      name: 'height',
      type: 'select',
      label: 'sales.blocks.orderInterface.fields.height.label',
      description: 'sales.blocks.orderInterface.fields.height.description',
      defaultValue: 'tall',
      options: [
        { label: 'sales.blocks.orderInterface.fields.height.options.compact', value: 'compact' },
        { label: 'sales.blocks.orderInterface.fields.height.options.tall', value: 'tall' },
        { label: 'sales.blocks.orderInterface.fields.height.options.fill', value: 'fill' }
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
  name: 'sales.blocks.eventStorefront.name',
  description: 'sales.blocks.eventStorefront.description',
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
      label: 'sales.blocks.eventStorefront.fields.eventSlug.label',
      description: 'sales.blocks.eventStorefront.fields.eventSlug.description'
    },
    {
      name: 'title',
      type: 'text',
      label: 'sales.blocks.eventStorefront.fields.title.label',
      description: 'sales.blocks.eventStorefront.fields.title.description'
    },
    {
      name: 'ctaLabel',
      type: 'text',
      label: 'sales.blocks.eventStorefront.fields.ctaLabel.label',
      description: 'sales.blocks.eventStorefront.fields.ctaLabel.description'
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
  name: 'sales.blocks.salesChart.name',
  description: 'sales.blocks.salesChart.description',
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
      label: 'sales.blocks.salesChart.fields.chart.label',
      description: 'sales.blocks.salesChart.fields.chart.description',
      defaultValue: 'revenue-by-day',
      // Option labels point at i18n keys so the dropdown is translated in the
      // editor panel; the public renderer keeps using SALES_CHART_KINDS labels.
      options: SALES_CHART_KIND_OPTIONS.map(o => ({
        label: `sales.blocks.salesChart.chartKinds.${o.value}`,
        value: o.value
      }))
    },
    {
      name: 'eventScope',
      type: 'sales-event-scope',
      label: 'sales.blocks.salesChart.fields.eventScope.label',
      description: 'sales.blocks.salesChart.fields.eventScope.description'
    },
    {
      name: 'chartTypeOverride',
      type: 'select',
      label: 'sales.blocks.salesChart.fields.chartTypeOverride.label',
      description: 'sales.blocks.salesChart.fields.chartTypeOverride.description',
      defaultValue: 'default',
      options: [
        { label: 'sales.blocks.salesChart.fields.chartTypeOverride.options.default', value: 'default' },
        { label: 'sales.blocks.salesChart.fields.chartTypeOverride.options.bar', value: 'bar' },
        { label: 'sales.blocks.salesChart.fields.chartTypeOverride.options.line', value: 'line' },
        { label: 'sales.blocks.salesChart.fields.chartTypeOverride.options.area', value: 'area' },
        { label: 'sales.blocks.salesChart.fields.chartTypeOverride.options.donut', value: 'donut' }
      ]
    },
    {
      name: 'title',
      type: 'text',
      label: 'sales.blocks.salesChart.fields.title.label',
      description: 'sales.blocks.salesChart.fields.title.description'
    },
    {
      name: 'height',
      type: 'select',
      label: 'sales.blocks.salesChart.fields.height.label',
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
  name: 'sales.blocks.salesProductMatrix.name',
  description: 'sales.blocks.salesProductMatrix.description',
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
      label: 'sales.blocks.salesProductMatrix.fields.eventScope.label',
      description: 'sales.blocks.salesProductMatrix.fields.eventScope.description'
    },
    {
      name: 'measure',
      type: 'select',
      label: 'sales.blocks.salesProductMatrix.fields.measure.label',
      description: 'sales.blocks.salesProductMatrix.fields.measure.description',
      defaultValue: 'units',
      options: [
        { label: 'sales.blocks.salesProductMatrix.fields.measure.options.units', value: 'units' },
        { label: 'sales.blocks.salesProductMatrix.fields.measure.options.revenue', value: 'revenue' }
      ]
    },
    {
      name: 'title',
      type: 'text',
      label: 'sales.blocks.salesProductMatrix.fields.title.label',
      description: 'sales.blocks.salesProductMatrix.fields.title.description'
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
  name: 'sales.blocks.eventWorkspace.name',
  description: 'sales.blocks.eventWorkspace.description',
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
      label: 'sales.blocks.eventWorkspace.fields.eventSlug.label',
      description: 'sales.blocks.eventWorkspace.fields.eventSlug.description'
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
