# CLAUDE.md - @friendlyinternet/crouton-sales

## Package Purpose

Event-based Point of Sale (POS) system for Nuxt Crouton. Provides products, categories, orders, and optional thermal receipt printing. Designed for pop-up events, markets, and temporary retail situations with team-based multi-tenancy.

## Key Files

| File | Purpose |
|------|---------|
| `app/composables/usePosOrder.ts` | Cart management, checkout, price calculations |
| `app/composables/useHelperAuth.ts` | Helper authentication (wraps @crouton/auth) |
| `app/composables/usePosProducts.ts` | Product fetching with category filtering |
| `app/composables/usePosCategories.ts` | Category management for products |
| `app/composables/usePosEvents.ts` | Event management (pop-ups, markets) |
| `app/components/Client/` | Customer-facing order interface |
| `app/components/Admin/` | Admin sidebar and management |
| `server/utils/receipt-formatter.ts` | ESC/POS thermal receipt formatting (opt-in) |
| `server/utils/print-queue-service.ts` | Print job queuing (opt-in) |
| `schemas/` | JSON schema files for crouton generate |

## Architecture

### Order Flow

```
Event -> Products/Categories -> Customer selects -> Cart -> Order -> Print (opt-in)
```

1. Admin creates Event with Products organized by Categories
2. Customer (or Helper) opens order interface for event
3. Products displayed by category, options available
4. Items added to cart with quantities and remarks
5. Checkout creates Order with OrderItems
6. If printing enabled: Print jobs queued for locations

### Database Tables (Convention)

Package expects tables with `sales` prefix:
- `salesEvents`, `salesProducts`, `salesCategories`
- `salesOrders`, `salesOrderitems`
- `salesLocations`, `salesClients`, `salesEventsettings`
- `salesPrinters`, `salesPrintqueues` (if print enabled)

User MUST use `sales` as layer name in crouton.config.mjs.

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/crouton-sales',
    './layers/sales'  // Generated layer
  ],
  croutonSales: {
    print: { enabled: true }  // Opt-in printing
  }
})
```

## Usage Workflow

1. `pnpm add @friendlyinternet/crouton-sales`
2. Copy schemas from package to local `./schemas/`
3. Configure crouton.config.mjs with `sales` layer
4. Run `crouton config`
5. Add package to nuxt.config extends
6. POS system ready

## Components

Components are auto-imported with `Sales` prefix (e.g., `SalesClientCart`, `SalesAdminPosSidebar`).

### Customer-Facing (`Client/`)
| Component | Auto-import Name | Purpose |
|-----------|------------------|---------|
| `Cart.vue` | `SalesClientCart` | Shopping cart display with quantity controls |
| `ProductList.vue` | `SalesClientProductList` | Product grid with inline option selection |
| `CategoryTabs.vue` | `SalesClientCategoryTabs` | Category navigation tabs |
| `ProductOptionsSelect.vue` | `SalesClientProductOptionsSelect` | Product variant/option selection |
| `CartTotal.vue` | `SalesClientCartTotal` | Order total display with item count |
| `OrderInterface.vue` | `SalesClientOrderInterface` | Main order page combining all components |
| `Selector.vue` | `SalesClientSelector` | Client selector with create-on-type |
| `OfflineBanner.vue` | `SalesClientOfflineBanner` | Offline mode indicator |

### Orders (`Pos/`)
| Component | Auto-import Name | Purpose |
|-----------|------------------|---------|
| `OrdersList.vue` | `SalesPosOrdersList` | Orders table with status filtering and auto-refresh |

### Admin (`Admin/`)
| Component | Auto-import Name | Purpose |
|-----------|------------------|---------|
| `PosSidebar.vue` | `SalesAdminPosSidebar` | Admin navigation sidebar |

### Print Settings (`Settings/`) - Opt-in
| Component | Auto-import Name | Purpose |
|-----------|------------------|---------|
| `ReceiptSettingsModal.vue` | `SalesSettingsReceiptSettingsModal` | Receipt text customization |
| `PrintPreviewModal.vue` | `SalesSettingsPrintPreviewModal` | Receipt preview with test print |

## Common Tasks

### Add a new product field
1. Update `schemas/products-schema.json`
2. Run `crouton config` to regenerate
3. Run migrations

### Enable printing
1. Set `croutonSales.print.enabled: true` in nuxt.config
2. Add printer/printQueue schemas to crouton.config
3. Regenerate collections

### Customize receipt format
1. Copy `server/utils/receipt-formatter.ts` to your project
2. Modify formatting functions
3. Import your custom formatter in API routes

## Helper Authentication

Helpers (volunteers, staff) authenticate with an event's shared PIN. The authentication is managed by `@crouton/auth`'s scoped access system.

### Client-side Usage

```typescript
const {
  isHelper,
  helperName,
  eventId,
  teamId,
  login,
  logout
} = useHelperAuth()

// Login with PIN
await login({
  teamId: 'team-123',
  eventId: 'event-456',
  pin: '1234',
  helperName: 'John'  // For new helpers
  // OR helperId: 'existing-helper-id'  // For returning helpers
})

// Check authentication
if (isHelper.value) {
  console.log(`Welcome, ${helperName.value}!`)
}

// Logout
await logout()
```

### Server-side Validation

```typescript
// In API handlers
import { requireScopedAccess } from '@crouton/auth/server'

export default defineEventHandler(async (event) => {
  const access = await requireScopedAccess(event, 'pos-helper-token')

  // access.displayName - Helper's name
  // access.resourceId - Event ID
  // access.organizationId - Team ID
  // access.role - 'helper'
})
```

### Event PIN Setup

Events must have a `helperPin` field configured:

```json
// schemas/events.json
{
  "helperPin": {
    "type": "string",
    "meta": { "label": "Helper PIN", "maxLength": 6 }
  }
}
```

## Dependencies

- **Extends**: `@friendlyinternet/nuxt-crouton` (required)
- **Peer deps**: `@crouton/auth`, `@nuxtjs/i18n ^9.0.0`, `zod ^3.0.0`
- **Optional**: `node-thermal-printer` for receipt printing

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
pnpm build          # Build with unbuild
```
