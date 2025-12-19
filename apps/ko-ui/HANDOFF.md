# KO-UI Handoff

## Project Goal

Create a hardware-inspired UI styling system based on the Teenage Engineering KO II sampler. The goal is to see how much of this tactile aesthetic can be achieved using Nuxt UI components with custom theming vs pure custom components.

## Status: SOLVED

**The `variant="ko"` approach with `compoundVariants` in `app.config.ts` works perfectly.**

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

### Nuxt UI Theming (WORKING!)

**Solution: Use `variant="ko"` with `compoundVariants` in `app.config.ts`**

```vue
<!-- Usage -->
<UButton variant="ko">Default Gray</UButton>
<UButton variant="ko" color="primary">Orange</UButton>
<UButton variant="ko" color="neutral">Dark</UButton>
<UButton variant="ko" color="secondary">Pink</UButton>
<UButton variant="ko" color="info">Blue</UButton>
<UButton variant="ko" color="error">Red</UButton>
```

## The Solution

### Key Insight

Nuxt UI 4 uses Tailwind Variants under the hood. To add a custom variant:

1. **Register the variant** in `variants.variant` object
2. **Define color combinations** using `compoundVariants` array
3. **Include ALL styling** in the class array (including pseudo-elements via Tailwind)

### Implementation (`app.config.ts`)

```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'orange',
      neutral: 'stone'
    },

    button: {
      // Extend the base slot
      slots: {
        base: [
          'rounded-md font-medium inline-flex items-center...',
          'transition-colors'
        ]
      },

      // Register the 'ko' variant
      variants: {
        variant: {
          ko: ''  // Placeholder - actual styling via compoundVariants
        }
      },

      // Define KO styling for each color
      compoundVariants: [
        // KO + Primary (orange)
        {
          color: 'primary',
          variant: 'ko',
          class: [
            'relative overflow-visible isolate',
            'font-[ko-tech] tracking-wider uppercase text-xs',
            'bg-[#FA5F28] text-[#F2F2F2]',
            'shadow-[rgba(0,0,0,0.377)_10px_10px_8px,_#FDC7B4_1.5px_1.5px_1px_0px_inset,_#FA5F28_-3.2px_-3.2px_8px_0px_inset]',
            'hover:bg-[#e85520]',
            'active:shadow-[...]',
            'active:translate-y-[0.5px]',
            // Dark bezel via pseudo-element
            'before:content-[\\'\\'] before:absolute before:inset-[-4px] before:bg-[#171717] before:rounded-[5px] before:-z-10'
          ].join(' ')
        },
        // ... similar entries for neutral, error, secondary, info
        // Plus a default (no color) fallback
      ]
    }
  }
})
```

### Why This Works

1. **`variants.variant.ko: ''`** - Registers 'ko' as a valid variant value
2. **`compoundVariants`** - Applies classes when BOTH conditions match (variant + color)
3. **Tailwind arbitrary values** - `bg-[#FA5F28]` bypasses JIT limitations
4. **Pseudo-element via Tailwind** - `before:content-['']` creates the dark bezel

### Color Mapping

| KO Color | Nuxt UI Color | Hex Value |
|----------|---------------|-----------|
| default  | (none)        | #c7c3c0   |
| orange   | primary       | #FA5F28   |
| dark     | neutral       | #545251   |
| pink     | secondary     | #E62C5E   |
| blue     | info          | #429CCE   |
| red      | error         | #F12618   |

## Files

```
apps/ko-ui/
├── app/
│   ├── app.config.ts           # Nuxt UI theme config (THE SOLUTION)
│   ├── assets/css/main.css     # Design tokens + ko-tactile CSS classes
│   ├── components/ko/          # Custom components (working)
│   └── pages/index.vue         # Showcase comparing both approaches
└── HANDOFF.md                  # This file
```

## Previous Attempts (What Didn't Work)

1. **CSS classes with `:ui="{ base: 'ko-tactile' }"`** - Nuxt UI's bg-primary overrides custom CSS
2. **Custom variant names like `variant="hardware"`** - Type system only accepts predefined variants
3. **Wrapper component `<KoUiButton>`** - Works but user rejected this as "not using variants"

## To Run

```bash
cd apps/ko-ui
pnpm dev
# Opens on http://localhost:3333
```

## Conclusion

**The experiment was successful.** Nuxt UI can be themed to match the KO II hardware aesthetic using the proper `compoundVariants` pattern. The key is:

1. Register custom variants in `variants.variant`
2. Use `compoundVariants` for variant + color combinations
3. Include ALL styling in Tailwind classes (including pseudo-elements)
4. Use arbitrary values `[#hex]` for precise colors

Both approaches are valid:
- **Custom `<KoButton>`**: More control, LED slots, cleaner API
- **`<UButton variant="ko">`**: Leverages Nuxt UI ecosystem, consistent with other components

Choose based on your needs. For a full hardware aesthetic with LEDs and special features, custom components are cleaner. For basic tactile buttons that integrate with Nuxt UI forms/tables, the variant approach works great.
