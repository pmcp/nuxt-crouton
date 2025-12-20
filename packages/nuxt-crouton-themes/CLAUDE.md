# CLAUDE.md - @friendlyinternet/nuxt-crouton-themes

## Package Purpose

Swappable UI themes for Nuxt applications using Nuxt UI 4. Each theme is a self-contained Nuxt layer that provides design tokens, Nuxt UI component variants, and optional custom components. Themes are tree-shakeable via subpath exports.

## Key Files

| File | Purpose |
|------|---------|
| `package.json` | Subpath exports for each theme (`./ko`, `./brutalist`, etc.) |
| `{theme}/nuxt.config.ts` | Layer entry point - imports CSS, registers components |
| `{theme}/app.config.ts` | Nuxt UI theme overrides (variants, compoundVariants) |
| `{theme}/assets/css/main.css` | Design tokens (CSS custom properties), utility classes |
| `{theme}/components/` | Optional theme-specific components |

## Architecture

```
packages/nuxt-crouton-themes/
├── package.json              # Subpath exports
├── ko/                       # KO theme (Teenage Engineering inspired)
│   ├── nuxt.config.ts        # Layer config
│   ├── app.config.ts         # Nuxt UI variants
│   ├── assets/
│   │   ├── css/main.css      # Design tokens, ko-bezel classes
│   │   └── fonts/tt34.otf    # Tech font
│   └── components/           # KoLed, KoKnob, KoPanel, etc.
├── minimal/                  # Minimal theme (black lines, white bg)
│   ├── nuxt.config.ts        # Layer config
│   ├── app.config.ts         # Nuxt UI variants
│   └── assets/css/main.css   # Design tokens, minimal classes
├── kr11/                     # KR-11 theme (Korg rhythm box inspired)
│   ├── nuxt.config.ts        # Layer config
│   ├── app.config.ts         # Nuxt UI variants
│   ├── assets/css/main.css   # Design tokens, kr classes
│   └── components/           # KrDisplay, KrPad, KrLed, etc.
└── brutalist/                # Future theme
```

## Available Themes

### Minimal Theme (`./minimal`)

Super clean, minimalist design with black lines on white background.

**Design Language:**
- Black 2px borders, no rounded corners
- Pure white background, black text
- System font stack for modern, clean typography
- No shadows, no gradients - pure geometry
- Subtle hover states with color inversion

**Nuxt UI Variants:**
- `variant="minimal"` for UButton, UInput, UCard, USeparator
- Color mappings: primary→filled black, neutral→gray outline, error→red on hover

**CSS Utilities:**
- `.minimal-border` - 1px black border
- `.minimal-border-thick` - 2px black border
- `.minimal-grid` - Subtle grid pattern background
- `.minimal-hover-lift` - Hover lift animation
- `.minimal-font` / `.minimal-font-mono` - Typography

**Design Tokens:**
- `--minimal-white` / `--minimal-black`
- `--minimal-gray-50` through `--minimal-gray-900`
- `--minimal-border-width` / `--minimal-border-width-thick`
- `--minimal-radius` (0 for sharp corners)
- `--minimal-transition` (150ms ease)

---

### KR-11 Theme (`./kr11`)

Friendly, tactile styling inspired by the Korg KR-11 Compact Rhythm Box.

**Design Language:**
- Light gray chassis with soft shadows
- Cream-colored tactile pads with subtle depth
- Red LED 7-segment display on black background
- Colorful accent buttons (coral, gold, mint)
- Horizontal speaker grill pattern
- Rounded corners (8px pads, 12px cards)

**Nuxt UI Variants:**
- `variant="kr11"` for UButton, UInput, UCard, UBadge
- Color mappings: primary→mint, neutral→cream, warning→gold, error→coral

**Custom Components:**
- `<KrDisplay>` - 7-segment LED tempo display with blink animation
- `<KrPad>` - Tactile drum pad buttons (cream, coral, gold, mint)
- `<KrLed>` - Status LED indicators (yellow, green, with blink)
- `<KrKnob>` - Rotary control with drag interaction
- `<KrSpeakerGrill>` - Horizontal slot speaker pattern

**CSS Utilities:**
- `.kr-surface` / `.kr-surface-light` / `.kr-surface-dark`
- `.kr-display` / `.kr-display-text` - LED display styling
- `.kr-grill` / `.kr-grill-slots` - Speaker grill pattern
- `.kr-led` / `.kr-led--yellow` / `.kr-led--green` - LED indicators
- `.kr-knob` - Rotary knob styling
- `.kr-text-label` - Small uppercase labels
- `.kr-seam` - Panel seam divider

**Design Tokens:**
- Chassis: `--kr-chassis`, `--kr-chassis-light`, `--kr-chassis-dark`
- Display: `--kr-display-bg`, `--kr-display-red`, `--kr-display-red-glow`
- Pads: `--kr-pad-cream`, `--kr-pad-coral`, `--kr-pad-gold`, `--kr-pad-mint`
- LEDs: `--kr-led-yellow`, `--kr-led-green`, `--kr-led-off`

**Usage:**
```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton-themes/kr11']
})
```

```vue
<template>
  <!-- Nuxt UI with KR11 variants -->
  <UButton variant="kr11" color="primary">Play</UButton>
  <UButton variant="kr11" color="warning">Fill 1</UButton>
  <UButton variant="kr11" color="error">1</UButton>

  <!-- Custom KR components (auto-imported as Kr*) -->
  <KrDisplay value="120" :blink="isPlaying" />
  <KrPad color="mint" label="▶" @click="play" />
  <KrLed state="on" color="green" />
  <KrKnob v-model="tempo" :min="40" :max="240" />
  <KrSpeakerGrill :slots="8" />
</template>
```

---

### KO Theme (`./ko`)

Hardware-inspired styling based on the Teenage Engineering KO II sampler.

**Design Language:**
- Tactile button bevels with pseudo-element dark bezels
- LCD-style inputs with orange-on-dark aesthetic
- Hardware panel cards with inset shadows
- Industrial color palette (grays, orange, pink, blue, red)

**Nuxt UI Variants:**
- `variant="ko"` for UButton, UInput, UCard
- Color mappings: primary→orange, neutral→dark, error→red, secondary→pink, info→blue

**Custom Components:**
- `<KoLed>` - LED indicators with glow animations (off, on, blink, fast, alive)
- `<KoKnob>` - Rotary controls with drag interaction
- `<KoPanel>` - Display panels with glass overlay
- `<KoDisplay>` - 7-segment style readouts
- `<KoButton>` - Full tactile buttons with LED slots
- `<KoLabel>` - Hardware-style labels
- `<KoPunchHole>` - Decorative punch holes
- `<KoSpeakerGrill>` - Speaker grill pattern

## Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton-themes/ko']
})
```

```vue
<template>
  <!-- Nuxt UI with KO variants -->
  <UButton variant="ko" color="primary">Orange</UButton>
  <UInput variant="ko" placeholder="LCD INPUT" />
  <UCard variant="ko">Hardware panel</UCard>

  <!-- Custom KO components (auto-imported as Ko*) -->
  <KoLed state="blink" />
  <KoKnob v-model="value" :min="0" :max="100" />
</template>
```

## Common Tasks

### Add a new theme

1. Create theme directory:
   ```bash
   mkdir -p packages/nuxt-crouton-themes/brutalist/{assets/css,components}
   ```

2. Create `nuxt.config.ts`:
   ```ts
   import { fileURLToPath } from 'node:url'
   import { join } from 'node:path'

   const currentDir = fileURLToPath(new URL('.', import.meta.url))

   export default defineNuxtConfig({
     $meta: {
       name: 'nuxt-crouton-themes/brutalist',
       description: 'Brutalist theme for Nuxt UI'
     },
     css: [join(currentDir, 'assets/css/main.css')],
     components: {
       dirs: [{
         path: join(currentDir, 'components'),
         prefix: 'Brutalist',
         global: true
       }]
     }
   })
   ```

3. Create `app.config.ts` with Nuxt UI overrides:
   ```ts
   export default defineAppConfig({
     ui: {
       colors: { primary: 'zinc', neutral: 'stone' },
       button: {
         variants: { variant: { brutalist: '' } },
         compoundVariants: [
           { variant: 'brutalist', class: 'brutalist-button' }
         ]
       }
     }
   })
   ```

4. Create `assets/css/main.css` with design tokens

5. Update package.json exports:
   ```json
   "exports": {
     "./ko": "./ko/nuxt.config.ts",
     "./brutalist": "./brutalist/nuxt.config.ts"
   }
   ```

### Add a component variant to existing theme

1. Edit `{theme}/app.config.ts`
2. Add to `variants.variant` object to register the variant name
3. Add `compoundVariants` entries for color combinations
4. Create corresponding CSS classes in `assets/css/main.css`

### Add design tokens

1. Edit `{theme}/assets/css/main.css`
2. Add CSS custom properties in `:root` block
3. Use in component styles: `var(--theme-token-name)`

### Add a custom component

1. Create `{theme}/components/ComponentName.vue`
2. Use `<script setup lang="ts">` with Composition API
3. Component auto-imports as `{Prefix}ComponentName` (e.g., `KoLed`)

## CSS Class Naming

Each theme should namespace its classes:

| Theme | Prefix | Example |
|-------|--------|---------|
| KO | `ko-` | `ko-bezel`, `ko-tactile`, `ko-input` |
| Minimal | `minimal-` | `minimal-btn`, `minimal-card`, `minimal-border` |
| KR-11 | `kr-` | `kr-pad`, `kr-display`, `kr-led` |
| Brutalist | `brutalist-` | `brutalist-button`, `brutalist-card` |

## Design Token Naming

Use theme-prefixed CSS custom properties:

```css
:root {
  /* KO theme */
  --ko-surface-light: #c7c3c0;
  --ko-accent-orange: #FA5F28;

  /* Minimal theme */
  --minimal-white: #ffffff;
  --minimal-black: #000000;

  /* KR-11 theme */
  --kr-chassis: #e5e2dd;
  --kr-pad-mint: #7ee8c7;

  /* Brutalist theme */
  --brutalist-bg: #000;
  --brutalist-border: 4px solid #fff;
}
```

## Nuxt UI Theming Pattern

The key insight for Nuxt UI 4 theming:

1. **Register variant** in `variants.variant` object (can be empty string)
2. **Apply styles** via `compoundVariants` array matching variant + color
3. **Use CSS classes** rather than inline Tailwind for complex effects

```ts
// app.config.ts
export default defineAppConfig({
  ui: {
    button: {
      variants: {
        variant: {
          ko: ''  // Register 'ko' as valid variant
        }
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: 'ko',
          class: 'ko-bezel ko-bezel--orange'  // Apply CSS classes
        }
      ]
    }
  }
})
```

## Dependencies

- **Peer deps**: `@nuxt/ui ^4.0.0`, `nuxt ^4.0.0`
- **No runtime deps** - themes are pure CSS/config

## Testing

```bash
# Test in ko-ui app
cd apps/ko-ui
pnpm dev

# Typecheck
npx nuxt typecheck
```

## File Size Considerations

- Keep fonts optimized (subset if possible)
- Avoid importing entire icon sets
- Each theme should be < 50KB (excluding fonts)
