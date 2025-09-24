# @fyit/nuxt-crouton-translations

Multi-language support layer extending `@fyit/nuxt-crouton` for FYIT scaffolded collections.

## Features

- 🌍 Multi-language input components
- 🔄 Auto-sync with English as primary language
- 📝 Team-specific translations
- 🎯 Built-in support for EN, NL, FR
- ⚡ Inherits all CRUD features from base layer

## Installation

```bash
# Install both the base and translations layer
pnpm add @fyit/nuxt-crouton @fyit/nuxt-crouton-translations
```

## Configuration

Add to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    '@fyit/nuxt-crouton-translations'
    // Automatically extends @fyit/nuxt-crouton
  ]
})
```

## What You Get

### From Base Layer (inherited)
- All CRUD components (CrudButton, CrudEntitySelect, etc.)
- All CRUD composables (useCrud, useCollections, etc.)
- Table components with search and pagination

### From This Layer
- **TranslationsInput** - Multi-language input component
- **TranslationsDisplay** - Display translated content
- **LanguageSwitcher** - Switch between languages
- **useT()** - Translation composable
- **useEntityTranslations()** - Entity-specific translations
- i18n module pre-configured

## Components

### TranslationsInput

Multi-language input for forms:

```vue
<TranslationsInput
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

### TranslationsDisplay

Display translated content:

```vue
<TranslationsDisplay
  :translations="item.translations"
  :field="'name'"
  :fallback="item.name"
/>
```

### LanguageSwitcher

Switch between available languages:

```vue
<LanguageSwitcher />
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
  extends: ['@fyit/nuxt-crouton-translations'],

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
@fyit/nuxt-crouton (base CRUD)
    ↑
@fyit/nuxt-crouton-translations (this layer)
```

When you extend this layer, you automatically get:
1. Everything from nuxt-crouton (CRUD)
2. Everything from nuxt-crouton-translations (i18n)

## Publishing

```bash
npm publish --access public
```

## License

MIT