# @friendlyinternet/crouton-sales

Event-based Point of Sale (POS) system for Nuxt Crouton. Provides products, categories, orders, and optional thermal receipt printing.

## Features

- Product catalog with categories
- Shopping cart with quantity management
- Order processing with customer info
- Optional thermal receipt printing (ESC/POS)
- Team-based multi-tenancy
- i18n support

## Installation

```bash
pnpm add @friendlyinternet/crouton-sales
```

## Quick Start

### 1. Copy Schemas

Copy schema files from this package to your project's `./schemas/` directory:

```bash
cp node_modules/@friendlyinternet/crouton-sales/schemas/*.json ./schemas/
```

### 2. Configure Crouton

```javascript
// crouton.config.mjs
export default {
  dialect: 'sqlite',
  collections: [
    { name: 'events', fieldsFile: './schemas/events.json' },
    { name: 'products', fieldsFile: './schemas/products.json' },
    { name: 'categories', fieldsFile: './schemas/categories.json' },
    { name: 'orders', fieldsFile: './schemas/orders.json' },
    { name: 'orderItems', fieldsFile: './schemas/orderItems.json' },
    { name: 'locations', fieldsFile: './schemas/locations.json' },
    { name: 'clients', fieldsFile: './schemas/clients.json' },
    { name: 'eventSettings', fieldsFile: './schemas/eventSettings.json' }
  ],
  targets: [
    {
      layer: 'sales',  // MUST use 'sales' as layer name
      collections: ['events', 'products', 'categories', 'orders', 'orderItems', 'locations', 'clients', 'eventSettings']
    }
  ],
  flags: {
    useTeamUtility: true,
    useMetadata: true
  }
}
```

### 3. Generate Collections

```bash
crouton config
```

### 4. Configure Nuxt

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/crouton-sales',
    './layers/sales'
  ]
})
```

## Optional: Enable Printing

Add printer and print queue schemas:

```javascript
// crouton.config.mjs
collections: [
  // ... existing collections ...
  { name: 'printers', fieldsFile: './schemas/printers.json' },
  { name: 'printQueues', fieldsFile: './schemas/printQueues.json' }
],
targets: [
  {
    layer: 'sales',
    collections: [/* ... */, 'printers', 'printQueues']
  }
]
```

Enable in nuxt.config:

```typescript
export default defineNuxtConfig({
  croutonSales: {
    print: { enabled: true }
  }
})
```

## Components

### Customer Interface

- `<SalesClientCart />` - Shopping cart
- `<SalesClientProductList />` - Product grid
- `<SalesClientCategoryTabs />` - Category navigation
- `<SalesClientOrderInterface />` - Main order page

### Admin

- `<SalesAdminPosSidebar />` - Admin navigation

## Composables

- `usePosOrder()` - Cart management, checkout, pricing
- `usePosProducts()` - Product fetching
- `usePosCategories()` - Category management
- `usePosEvents()` - Event management
- `usePosClients()` - Client/customer management

## License

MIT
