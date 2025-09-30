# Nuxt Crouton Playground

Interactive Nuxt UI theming playground with real-time preview and export capabilities.

## ⚠️ Important: Nuxt 4 Required

This package requires **Nuxt 4.0.0** to work properly with Nuxt UI 4. 

### Current Status

The playground is fully built and ready, but waiting for Nuxt 4 stable release. All files are in place:
- ✅ All composables implemented (theme state, presets, export, URL sharing)
- ✅ All components built (control panel, preview canvas, export modal)  
- ✅ TypeScript types are correct
- ⏸️ Waiting for Nuxt 4.0.0 stable to enable Nuxt UI 4

### Temporary Workaround

To run this now with Nuxt 3, you would need to:
1. Downgrade to Nuxt UI v3 (not recommended)
2. Or wait for Nuxt 4 stable release

### Once Nuxt 4 is Released

Simply update `package.json`:
```json
"nuxt": "^4.0.0"
```

Then install and run:
```bash
pnpm install
pnpm dev
```

## Features

- 🎨 **Real-Time Theme Preview** - See changes instantly across all components
- 🎭 **Preset Library** - 8 pre-built themes plus random generation
- 🔗 **URL Sharing** - Share themes via URL
- 💾 **Export Options** - Generate app.config.ts, Tailwind config, or JSON
- ⌨️ **Keyboard Shortcuts** - Undo/Redo support (Cmd+Z, Cmd+Shift+Z)
- 🌓 **Dark Mode** - Full dark mode support
- ♿ **Accessibility** - WCAG contrast checking

## File Structure

```
packages/nuxt-crouton-playground/
├── README.md
├── package.json
├── nuxt.config.ts
├── app.config.ts
├── tsconfig.json
├── app/
│   ├── app.vue
│   ├── composables/
│   │   ├── useColorPalette.ts        # Color palette generation
│   │   ├── useContrastRatio.ts       # WCAG compliance checking
│   │   ├── usePresets.ts             # Theme presets
│   │   ├── useThemeExport.ts         # Export functionality
│   │   ├── useThemeState.ts          # Theme state management
│   │   └── useUrlTheme.ts            # URL sharing
│   ├── components/
│   │   ├── PlaygroundControlPanel.vue    # Left sidebar controls
│   │   ├── PlaygroundPreviewCanvas.vue   # Component showcase
│   │   └── PlaygroundExportModal.vue     # Export modal
│   └── pages/
│       └── index.vue                  # Main playground page
```

## Stack

- Nuxt 4 (when released)
- Nuxt UI 4
- VueUse
- TypeScript

## License

MIT
