# Connector Integration in Generator

This document explains how the generator automatically detects and configures external connectors.

## Overview

When you reference external collections in your schemas using the `:` prefix (e.g., `:users`, `:teams`), the generator can automatically:
1. **Detect** the external reference
2. **Recommend** appropriate connectors
3. **Install** the connector package
4. **Copy** connector files to your project
5. **Register** in `app.config.ts`

## How It Works

### 1. Detection Phase

During generation, the generator scans your schemas for external references:

```json
// booking-schema.json
{
  "updatedBy": {
    "type": "string",
    "refTarget": ":users"  // ← Detected!
  }
}
```

The `:` prefix signals: "This collection is managed externally, not by Crouton."

### 2. Configuration Options

You have two ways to configure connectors:

#### Option A: Explicit Configuration

Define connectors in `crouton.config.js`:

```javascript
export default {
  schemaPath: './schemas/',
  dialect: 'sqlite',

  // Explicit connector configuration
  connectors: {
    users: {
      type: 'supersaas',      // Which connector
      autoInstall: true,       // Install package
      copyFiles: true,         // Copy to project
      updateAppConfig: true    // Register automatically
    }
  },

  flags: {
    autoConnectors: true  // Don't prompt, use config above
  }
}
```

**Result**: Generator installs and configures automatically, no prompts.

#### Option B: Interactive Mode

Leave `connectors` empty or set `autoConnectors: false`:

```javascript
export default {
  schemaPath: './schemas/',
  dialect: 'sqlite',

  connectors: {},  // Empty = interactive mode

  flags: {
    autoConnectors: false  // Prompt for each external reference
  }
}
```

**Result**: Generator prompts you:

```bash
✓ Analyzed 5 schemas
⚠ Found external reference: :users (used in 5 collections)

Configure connector for 'users'? (Y/n)
> Y

Which auth system?
  1. SuperSaaS (team-based)
  2. Supabase (auth.users)
  3. Clerk
  4. Skip (configure manually)
> 1

✓ Installing @friendlyinternet/nuxt-crouton-connector
✓ Copied app/composables/useUsers.ts
✓ Copied server/api/teams/[id]/users/index.get.ts
✓ Updated app.config.ts
```

### 3. What Gets Created

After connector setup, you'll have:

```
your-project/
├── node_modules/
│   └── @friendlyinternet/nuxt-crouton-connector/  # Installed package
├── app/
│   ├── composables/
│   │   └── useUsers.ts                             # ✓ Created
│   └── app.config.ts                               # ✓ Updated
└── server/
    └── api/
        └── teams/[id]/users/
            └── index.get.ts                         # ✓ Created
```

## Connector Types

### SuperSaaS (Team-Based)

**Use when:** You have team-based user management

**Requirements:**
- `getActiveTeamMembers(teamId)` function
- `validateTeamOwnership(event, teamId)` function
- Team-based routing: `/api/teams/[id]/*`

**Configuration:**
```javascript
connectors: {
  users: {
    type: 'supersaas',
    autoInstall: true,
    copyFiles: true,
    updateAppConfig: true
  }
}
```

### Supabase (Coming Soon)

**Use when:** Using Supabase auth

**Requirements:**
- Supabase project with auth enabled

**Configuration:**
```javascript
connectors: {
  users: {
    type: 'supabase',
    autoInstall: true,
    copyFiles: true,
    updateAppConfig: true
  }
}
```

### Custom

**Use when:** You have a custom auth system

**Configuration:**
```javascript
connectors: {
  users: {
    type: 'custom',
    autoInstall: false,  // No package to install
    copyFiles: false,    // You'll write it yourself
    updateAppConfig: false
  }
}
```

## Examples

### Example 1: SuperSaaS with Auto-Config

```javascript
// crouton.config.js
export default {
  schemaPath: './bookings-crouton-config/schemas/',
  dialect: 'sqlite',

  targets: [
    {
      layer: 'bookings',
      collections: ['bookings', 'locations', 'emailtemplates', 'pages', 'assets']
    }
  ],

  connectors: {
    users: {
      type: 'supersaas',
      autoInstall: true,
      copyFiles: true,
      updateAppConfig: true
    }
  },

  flags: {
    useTeamUtility: true,
    useMetadata: true,
    autoConnectors: true  // No prompts
  }
}
```

**Run:**
```bash
npx crouton-generate --config crouton.config.js
```

**Output:**
```
✓ Analyzed 5 schemas
ℹ Found external reference: :users (5 collections)
✓ Installing connector: users (supersaas)
✓ Copied app/composables/useUsers.ts
✓ Copied server/api/teams/[id]/users/index.get.ts
✓ Updated app.config.ts
✓ Generated 5 collections
```

### Example 2: Interactive Mode

```javascript
// crouton.config.js
export default {
  schemaPath: './bookings-crouton-config/schemas/',
  dialect: 'sqlite',

  targets: [
    {
      layer: 'bookings',
      collections: ['bookings', 'locations']
    }
  ],

  // No connectors config = interactive
  connectors: {},

  flags: {
    autoConnectors: false  // Prompt me
  }
}
```

**Run:**
```bash
npx crouton-generate --config crouton.config.js
```

**Output:**
```
✓ Analyzed 2 schemas
⚠ Found external reference: :users (2 collections)

Configure connector for 'users'? (Y/n)
> Y

Which auth system?
  1. SuperSaaS (team-based)
  2. Supabase (auth.users)
  3. Clerk
  4. Skip (configure manually)
> 1

✓ Installing @friendlyinternet/nuxt-crouton-connector
...
```

## Customization After Generation

Once files are copied, you can customize them:

### Customize Schema

Edit `app/composables/useUsers.ts`:

```typescript
const userSchema = z.object({
  id: z.string(),
  title: z.string(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  // Add your custom fields:
  department: z.string().optional(),
  phoneNumber: z.string().optional()
})
```

### Customize API Endpoint

Edit `server/api/teams/[id]/users/index.get.ts`:

```typescript
// Change transform
(member) => ({
  id: member.userId,
  title: `${member.name} (${member.role})`,  // Show role
  email: member.email,
  department: member.department  // Add field
})
```

## Troubleshooting

### "Connector package not found"

Make sure `@friendlyinternet/nuxt-crouton-connector` is installed:

```bash
pnpm add @friendlyinternet/nuxt-crouton-connector
```

### "getActiveTeamMembers is not defined"

The copied API endpoint expects this function. Update the import to match your project structure.

### "Collection 'users' not registered"

Check that `app.config.ts` was updated:

```typescript
import { usersConfig } from './composables/useUsers'

export default defineAppConfig({
  croutonCollections: {
    users: usersConfig  // Must be present
  }
})
```

## Future Enhancements

- [ ] Support for Supabase connector
- [ ] Support for Clerk connector
- [ ] Support for Auth0 connector
- [ ] Custom connector template generator
- [ ] Connector validation before generation
- [ ] Connector update/migration tool
