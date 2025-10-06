# @friendlyinternet/nuxt-crouton-i18n

Multi-language support layer extending `@friendlyinternet/nuxt-crouton` for FYIT scaffolded collections.

## Features

- 🌍 Multi-language input components
- 🔄 Auto-sync with English as primary language
- 📝 Team-specific translations
- 🎯 Built-in support for EN, NL, FR
- ⚡ Inherits all CRUD features from base layer

## Installation

```bash
# Install both base and addon
pnpm add @friendlyinternet/nuxt-crouton @friendlyinternet/nuxt-crouton-i18n
```

## Configuration

Add BOTH layers to your `nuxt.config.ts` (explicit pattern):

```typescript
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',       // Base layer (required)
    '@friendlyinternet/nuxt-crouton-i18n'   // i18n addon
  ]
})
```

## What You Get

### From Base Layer (inherited)
- All CRUD components (CrudButton, CrudEntitySelect, etc.)
- All CRUD composables (useCrud, useCollections, etc.)
- Table components with search and pagination

### From This Layer
- **CroutonI18nInput** - Multi-language input component
- **CroutonI18nDisplay** - Display translated content
- **CroutonI18nLanguageSwitcher** - Switch between languages
- **useT()** - Translation composable
- **useEntityTranslations()** - Entity-specific translations
- i18n module pre-configured

## Components

### CroutonI18nInput

Multi-language input for forms:

```vue
<CroutonI18nInput
  v-model="state.translations"
  :fields="['name', 'description']"
  :default-values="{
    name: state.name,
    description: state.description
  }"
  @update:english="(data) => { state[data.field] = data.value }"
  label="Translations"
/>
```

### CroutonI18nDisplay

Display translated content:

```vue
<CroutonI18nDisplay
  :translations="item.translations"
  :field="'name'"
  :fallback="item.name"
/>
```

### CroutonI18nLanguageSwitcher

Switch between available languages:

```vue
<CroutonI18nLanguageSwitcher />
```

## Composables

### useT()

Get translated values:

```typescript
const { t } = useT()
const label = t('products.name')
```

### useEntityTranslations()

Manage entity-specific translations:

```typescript
const { getTranslation, setTranslation } = useEntityTranslations()

const translated = getTranslation(entity.translations, 'name', 'nl')
```

## Customizing Locales

Override default locales in your nuxt.config:

```typescript
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-i18n'
  ],

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' }
    ]
  }
})
```

## Layer Architecture

```
@friendlyinternet/nuxt-crouton (base CRUD - required)
    +
@friendlyinternet/nuxt-crouton-i18n (addon - this layer)
```

**Explicit configuration**: You must extend both layers:
1. Base layer provides CRUD functionality
2. i18n addon provides translation features

## Publishing

```bash
pnpm publish --access public
```

## Migration from Previous Versions

**Breaking Change**: Component prefix changed from `Translations` to `CroutonI18n` in latest version.

### Quick Migration Steps

1. Update package: `pnpm update @friendlyinternet/nuxt-crouton-i18n`
2. Find and replace in your project:
   - `<Translations` → `<CroutonI18n`
   - `</Translations` → `</CroutonI18n`
3. Clear Nuxt cache: `rm -rf .nuxt`
4. Rebuild: `pnpm dev`

### Why This Change?

This change ensures consistency with the base `nuxt-crouton` package where all components use the `Crouton` prefix. The `I18n` suffix clearly indicates this is an addon package. This naming pattern:
- Matches base package naming (`Crouton*`)
- Provides clarity that this is an i18n addon
- Enables future addons like `CroutonAuth`, `CroutonAdmin`
- Improves discoverability via IDE autocomplete
- Follows Vue/Nuxt standards (e.g., `NuxtLink`, `NuxtPage`)

## License

MIT