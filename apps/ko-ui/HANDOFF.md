# KO-UI Handoff

## Project Goal

Create a hardware-inspired UI styling system based on the Teenage Engineering KO II sampler. The goal is to see how much of this tactile aesthetic can be achieved using Nuxt UI components with custom theming vs pure custom components.

## What Exists

### Location
`apps/ko-ui/` - A standalone Nuxt app for developing and testing KO-style UI components.

### Custom Components (Working)
Located in `app/components/ko/`:
- `Button.vue` - Tactile buttons with 6 color variants, 3 shapes, LED slot
- `Led.vue` - LED indicators with glow animations (off, on, blink, fast, alive)
- `Knob.vue` - Rotary controls with drag interaction
- `Panel.vue` - Display panels with glass overlay effect
- `Display.vue` - 7-segment style readouts
- `Label.vue` - Hardware-style labels
- `PunchHole.vue` - Decorative punch holes
- `SpeakerGrill.vue` - Speaker grill pattern

These custom components work perfectly and match the KO II aesthetic.

### Design Tokens
`app/assets/css/main.css` contains:
- CSS custom properties for the KO color palette (`--ko-*`)
- LED animation keyframes
- Font-face for the technical font (`ko-tech`)

### Nuxt UI Theming Attempt (Partially Working)
We created `.ko-tactile` CSS classes to theme `<UButton>` components:

```vue
<UButton :ui="{ base: 'ko-tactile' }">Default</UButton>
<UButton :ui="{ base: 'ko-tactile ko-tactile--orange' }">Orange</UButton>
```

## Current Issue

**The bezel (dark wrapper) works, but color variants don't.**

When comparing custom `<KoButton>` to themed `<UButton>`:
- Custom buttons: All colors display correctly (gray, orange, dark, pink, blue, red)
- UButton with ko-tactile: Bezel shows, but all buttons appear dark gray regardless of variant class

### What We Tried
1. Added `::before` pseudo-element for the dark bezel - **Works**
2. Added `overflow: visible` and `isolation: isolate` - **Works** (bezel now visible)
3. Increased CSS specificity with `.ko-tactile.ko-tactile--orange` - **Doesn't help**

### Root Cause (FOUND)
Inspecting a UButton shows the rendered classes:
```
bg-primary hover:bg-primary/75 active:bg-primary/75 ... ko-tactile ko-tactile--orange ko-tactile--square
```

**The problem**: Nuxt UI's `:ui="{ base: '...' }"` prop **ADDS** classes, it doesn't replace defaults. So `bg-primary` (Tailwind utility) is still being applied alongside our `ko-tactile--orange`.

Our `!important` CSS should win over Tailwind utilities, but something in the cascade is preventing it. Possible causes:
1. CSS load order (Tailwind after our styles)
2. Tailwind's `@layer` system affecting cascade
3. Our CSS file being processed/purged incorrectly

## Files to Look At

```
apps/ko-ui/
├── app/
│   ├── assets/css/main.css      # Design tokens + ko-tactile classes (THE ISSUE IS HERE)
│   ├── components/ko/           # Custom components (working)
│   ├── pages/index.vue          # Showcase with side-by-side comparison
│   └── app.config.ts            # Nuxt UI theme config (mostly unused currently)
└── HANDOFF.md                   # This file
```

## Key CSS Section (main.css lines ~79-230)

The `.ko-tactile` base class and variants. The bezel pseudo-element:

```css
.ko-tactile::before {
  content: '';
  position: absolute;
  inset: -4px;
  background-color: var(--ko-surface-panel);
  border-radius: var(--ko-wrapper-radius);
  z-index: -1;
}
```

## Next Steps

### Option 1: Override with Tailwind arbitrary values in template
Skip our CSS variants entirely, use Tailwind's `!` prefix for important:
```vue
<UButton :ui="{ base: 'ko-tactile !bg-[#FA5F28] !shadow-[...]' }">X</UButton>
```
Downside: Verbose, hard to maintain.

### Option 2: Use app.config.ts to create a proper variant
Define a `hardware` variant in Nuxt UI's theme system:
```ts
// app.config.ts
export default defineAppConfig({
  ui: {
    button: {
      variants: {
        variant: {
          hardware: 'bg-[#c7c3c0] shadow-[...] ...'
        }
      }
    }
  }
})
```
Then use `<UButton variant="hardware">`. This works WITH Nuxt UI instead of fighting it.

### Option 3: Move our CSS to a higher-priority layer
```css
@layer components {
  .ko-tactile { ... }
}
```
Or put styles AFTER `@import "@nuxt/ui"` in main.css.

### Option 4: Accept custom components are the answer
The custom `<KoButton>` works perfectly. Maybe the lesson is: for highly custom aesthetics that fight the design system, custom components are cleaner than trying to override everything.

### Recommended: Try Option 2 first
Creating a proper Nuxt UI variant is the "right" way to do this.

## To Run

```bash
cd apps/ko-ui
pnpm dev
# Opens on http://localhost:3333
```

## Reference Image

The original KO II that inspired this: tactile physical buttons with beveled edges, dark recessed bezels, LED indicators, industrial gray color palette with orange/red/blue accents.

## The Big Question

Is it worth fighting Nuxt UI's styling system for this aesthetic, or should we just use the custom `<KoButton>` components? The custom components work perfectly - the Nuxt UI theming is an experiment to see if we can get the same look with less custom code.
