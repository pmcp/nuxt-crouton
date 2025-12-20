# @friendlyinternet/nuxt-crouton-themes

Swappable themes for Nuxt UI applications.

## Installation

```bash
pnpm add @friendlyinternet/nuxt-crouton-themes
```

## Available Themes

### KO Theme

Hardware-inspired styling based on the Teenage Engineering KO II sampler.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton-themes/ko']
})
```

**Features:**
- Tactile button variants with bezel effects
- LCD-style input fields
- Hardware panel cards
- Custom components: `<KoLed>`, `<KoKnob>`, `<KoPanel>`, `<KoDisplay>`
- LED animations (blink, pulse, alive)

**Usage:**
```vue
<template>
  <!-- Nuxt UI components with KO variant -->
  <UButton variant="ko">Default Gray</UButton>
  <UButton variant="ko" color="primary">Orange</UButton>
  <UButton variant="ko" color="neutral">Dark</UButton>

  <UInput variant="ko" placeholder="LCD INPUT" />

  <UCard variant="ko">
    <template #header>Panel Title</template>
    Hardware-style card content
  </UCard>

  <!-- Custom KO components -->
  <KoLed state="blink" />
  <KoKnob v-model="value" :min="0" :max="100" />
  <KoPanel>Display content</KoPanel>
</template>
```

## Adding New Themes

Create a new directory under the package root:

```
packages/nuxt-crouton-themes/
├── ko/                    # KO theme
├── brutalist/             # Future theme
└── minimal/               # Future theme
```

Each theme needs:
- `nuxt.config.ts` - Layer configuration
- `app.config.ts` - Nuxt UI theme overrides
- `assets/css/main.css` - Design tokens and styles
- `components/` - Optional custom components

Update `package.json` exports:
```json
{
  "exports": {
    "./ko": "./ko/nuxt.config.ts",
    "./brutalist": "./brutalist/nuxt.config.ts"
  }
}
```

## License

MIT
