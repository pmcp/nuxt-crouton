# Theme Playground - Agent Briefing
**Project**: nuxt-crouton
**Task**: Build interactive Nuxt UI theming playground
**Date**: 2025-09-30
**Complexity**: High - New package with real-time UI updates

## Objective

Create `packages/nuxt-crouton-playground/` - an interactive, "playable" theming tool for Nuxt UI 4 that provides real-time visual feedback, smart color tools, and easy sharing capabilities.

## Requirements

### Core "Playability" Features

1. **Real-Time Visual Feedback**
   - Split-screen layout: controls left, live preview right
   - Instant updates (no "apply" button)
   - Smooth transitions between theme changes
   - Live component showcase showing all variants and states

2. **Interactive Color System**
   - HSL color pickers (more intuitive than RGB)
   - Auto-generate full 50-950 Tailwind scale from base color
   - Live contrast ratio checker (WCAG AA/AAA)
   - Accessibility compliance badges
   - Preview in light/dark modes simultaneously

3. **Component Showcase**
   - Display all Nuxt UI 4 components
   - Show all variants (solid, outline, ghost, etc.)
   - Toggle states (hover, focus, disabled, loading)
   - Group by category (Forms, Navigation, Feedback, etc.)

4. **Export & Share**
   - Generate `app.config.ts` code
   - Generate Tailwind config code
   - Export as JSON
   - **URL sharing**: Encode theme in URL params
   - LocalStorage persistence (auto-restore)

5. **Preset Library**
   - Pre-built themes: Midnight, Ocean, Forest, Sunset, Corporate, Neon
   - One-click apply
   - Visual preview cards
   - "Random theme" generator

6. **Developer Experience**
   - Keyboard shortcuts
   - Undo/redo theme changes
   - Search/filter components
   - Copy individual component examples
   - Responsive preview modes (desktop/tablet/mobile)

## Technical Architecture

### Package Structure
```
packages/nuxt-crouton-playground/
├── nuxt.config.ts
├── app.config.ts
├── package.json
├── app/
│   ├── app.vue
│   ├── pages/
│   │   └── index.vue              # Main playground interface
│   ├── components/
│   │   ├── ControlPanel.vue       # Left sidebar controls
│   │   ├── PreviewCanvas.vue      # Right side component showcase
│   │   ├── ColorPicker.vue        # HSL picker with palette gen
│   │   ├── ExportModal.vue        # Code generation UI
│   │   ├── PresetCard.vue         # Theme preset display
│   │   ├── ComponentShowcase.vue  # Individual component demos
│   │   └── ContrastChecker.vue    # Accessibility checker
│   └── composables/
│       ├── useThemeState.ts       # Reactive theme management
│       ├── useThemeExport.ts      # Code generation logic
│       ├── useContrastRatio.ts    # WCAG compliance checking
│       ├── useColorPalette.ts     # 50-950 scale generation
│       └── useUrlTheme.ts         # URL encoding/decoding
```

### State Management Pattern
```typescript
// composables/useThemeState.ts
export const useThemeState = () => {
  const theme = useState('playground-theme', () => ({
    colors: {
      primary: 'green',
      secondary: 'blue',
      success: 'green',
      warning: 'yellow',
      error: 'red',
      neutral: 'slate'
    },
    customPalettes: {}, // User-defined 50-950 scales
    colorMode: 'light'
  }))

  // Apply changes to runtime app.config
  watchEffect(() => {
    updateAppConfig({ ui: { colors: theme.value.colors } })
  })

  return { theme, updateColor, resetTheme }
}
```

### URL Sharing Implementation
```typescript
// composables/useUrlTheme.ts
export const useUrlTheme = () => {
  const route = useRoute()
  const router = useRouter()

  const encodeTheme = (theme: Theme) => {
    return btoa(JSON.stringify(theme))
  }

  const decodeTheme = (encoded: string): Theme | null => {
    try {
      return JSON.parse(atob(encoded))
    } catch {
      return null
    }
  }

  const shareableUrl = computed(() => {
    const { theme } = useThemeState()
    const encoded = encodeTheme(theme.value)
    return `${location.origin}?t=${encoded}`
  })

  // Load theme from URL on mount
  onMounted(() => {
    const encoded = route.query.t
    if (encoded) {
      const decoded = decodeTheme(encoded as string)
      if (decoded) applyTheme(decoded)
    }
  })

  return { shareableUrl, encodeTheme, decodeTheme }
}
```

### Color Palette Generation
```typescript
// composables/useColorPalette.ts
export const useColorPalette = () => {
  // Generate 50-950 scale from single HSL color
  const generatePalette = (h: number, s: number, l: number) => {
    return {
      50: `hsl(${h}, ${s}%, ${Math.min(l + 40, 95)}%)`,
      100: `hsl(${h}, ${s}%, ${Math.min(l + 35, 90)}%)`,
      200: `hsl(${h}, ${s}%, ${Math.min(l + 25, 80)}%)`,
      300: `hsl(${h}, ${s}%, ${Math.min(l + 15, 70)}%)`,
      400: `hsl(${h}, ${s}%, ${Math.min(l + 5, 60)}%)`,
      500: `hsl(${h}, ${s}%, ${l}%)`,
      600: `hsl(${h}, ${s}%, ${Math.max(l - 10, 20)}%)`,
      700: `hsl(${h}, ${s}%, ${Math.max(l - 20, 15)}%)`,
      800: `hsl(${h}, ${s}%, ${Math.max(l - 30, 10)}%)`,
      900: `hsl(${h}, ${s}%, ${Math.max(l - 40, 5)}%)`,
      950: `hsl(${h}, ${s}%, ${Math.max(l - 45, 3)}%)`
    }
  }

  return { generatePalette }
}
```

## Component Showcase Data Structure

```typescript
// types/showcase.ts
interface ComponentDemo {
  name: string
  category: 'forms' | 'navigation' | 'feedback' | 'layout' | 'overlays'
  variants?: string[]
  colors?: string[]
  sizes?: string[]
  states?: ('default' | 'hover' | 'focus' | 'disabled' | 'loading')[]
  example: Component
}

const componentShowcase: ComponentDemo[] = [
  {
    name: 'UButton',
    category: 'forms',
    variants: ['solid', 'outline', 'ghost', 'link'],
    colors: ['primary', 'secondary', 'success', 'warning', 'error', 'neutral'],
    sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
    states: ['default', 'hover', 'focus', 'disabled', 'loading'],
    example: ComponentShowcaseButton
  },
  // ... all other Nuxt UI components
]
```

## Export Formats

### app.config.ts
```typescript
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'purple',
      success: 'green',
      warning: 'yellow',
      error: 'red',
      neutral: 'slate'
    }
  }
})
```

### Tailwind CSS (for custom palettes)
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... 200-900
          950: '#082f49'
        }
      }
    }
  }
}
```

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🎨 Nuxt Crouton Theme Playground    [Export] [Share] [Dark] │
├──────────────────┬──────────────────────────────────────────┤
│                  │                                          │
│ 🎨 Colors        │        Live Preview Canvas               │
│                  │                                          │
│ Primary          │ ┌─ Forms ────────────────────────┐      │
│ [color picker]   │ │ Buttons: [all variants shown]  │      │
│                  │ │ Inputs: [all types shown]      │      │
│ Secondary        │ └────────────────────────────────┘      │
│ [color picker]   │                                          │
│                  │ ┌─ Feedback ──────────────────────┐     │
│ ...              │ │ Alerts, Toasts, Badges          │     │
│                  │ └────────────────────────────────┘      │
│ ─────────────    │                                          │
│                  │ ┌─ Navigation ─────────────────────┐    │
│ 🎭 Presets       │ │ Tabs, Dropdowns, Menus          │    │
│                  │ └────────────────────────────────┘      │
│ [Midnight]       │                                          │
│ [Ocean]          │ ┌─ Overlays ──────────────────────┐     │
│ [Forest]         │ │ Modal [Open] Slideover [Open]   │     │
│ [Sunset]         │ └────────────────────────────────┘      │
│                  │                                          │
│ [Surprise Me!]   │ Accessibility: Contrast AA ✅ AAA ❌     │
│                  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Foundation (Functionality)
1. Set up package structure with nuxt-crouton as dependency
2. Create basic split-screen layout
3. Implement `useThemeState` with reactive color management
4. Build simple color picker component
5. Apply theme changes to Nuxt UI runtime config

### Phase 2: Preview System
1. Create component showcase with all Nuxt UI 4 components
2. Organize by category (Forms, Navigation, etc.)
3. Show all variants and states
4. Add dark/light mode toggle
5. Responsive preview modes

### Phase 3: Export & Sharing
1. Generate app.config.ts code
2. Generate Tailwind config for custom palettes
3. URL encoding/decoding
4. LocalStorage persistence
5. Copy-to-clipboard functionality

### Phase 4: Polish & Enhancement
1. Add preset library with pre-built themes
2. Build HSL color picker with palette generation
3. Implement contrast ratio checker
4. Add keyboard shortcuts
5. Undo/redo functionality
6. "Random theme" generator

### Phase 5: Testing
1. Test all Nuxt UI components render correctly
2. Verify WCAG compliance checking accuracy
3. Test URL sharing across browsers
4. Verify LocalStorage persistence
5. Run `npx nuxt typecheck` for type safety

## Critical Technical Notes

### Nuxt UI 4 Specifics
- Use `updateAppConfig()` for runtime theme changes
- Colors use semantic aliases: `primary`, `secondary`, etc.
- Components automatically respond to color changes
- Dark mode handled via `useColorMode()`

### VueUse Integration
- `useColorMode()` - Color mode management
- `useClipboard()` - Copy functionality
- `useLocalStorage()` - Theme persistence
- `useBreakpoints()` - Responsive preview

### Performance Considerations
- Debounce rapid color changes (use VueUse's `useDebounceFn`)
- Virtual scrolling for long component lists if needed
- Lazy load component showcases by category

## Dependencies
```json
{
  "dependencies": {
    "@friendlyinternet/nuxt-crouton": "workspace:*",
    "@nuxt/ui": "^4.0.0",
    "@vueuse/core": "latest"
  }
}
```

## Success Criteria

✅ Real-time theme updates with smooth transitions
✅ All Nuxt UI 4 components showcase correctly
✅ Working URL sharing (copy link → open in new tab → same theme)
✅ Contrast ratio checking with WCAG badges
✅ Export generates valid app.config.ts code
✅ Preset library with 6+ themes
✅ LocalStorage persistence across sessions
✅ TypeScript compilation passes (`npx nuxt typecheck`)
✅ Responsive on mobile/tablet/desktop
✅ Dark/light mode toggle works seamlessly

## References

- Nuxt UI Theming: https://ui.nuxt.com/getting-started/theme
- Nuxt UI Components: https://ui.nuxt.com/components
- VueUse: https://vueuse.org/
- WCAG Contrast Guidelines: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

---

**Agent Guidelines**: Follow CLAUDE.md conventions. Use Composition API with `<script setup>`. Run `npx nuxt typecheck` after changes. Check VueUse before implementing complex utilities. Focus on simplicity and maintainability.