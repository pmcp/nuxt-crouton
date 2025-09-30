# 🎨 Nuxt Crouton Theme Playground

Interactive theme playground for Nuxt UI 4. Experiment with colors and see live results!

## Features

- 🎨 **Live Preview** - See changes instantly across all Nuxt UI components
- 🌈 **22 Tailwind Colors** - Choose from the full Tailwind color palette
- 🎭 **5 Preset Themes** - Midnight, Ocean, Forest, Sunset, and Neon
- 🎲 **Random Generator** - Surprise yourself with random color combinations
- 💾 **Auto-Save** - Your theme persists in localStorage
- 🔗 **URL Sharing** - Share themes via URL parameters
- 📤 **Export** - Generate `app.config.ts` code
- 🌓 **Dark Mode** - Toggle between light and dark modes

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Usage

1. **Pick Colors** - Use the color pickers in the left sidebar
2. **Try Presets** - Click preset buttons for instant themes
3. **Randomize** - Hit "Surprise Me!" for random combinations
4. **Share** - Click Share to copy a URL with your theme
5. **Export** - Click Export to get the `app.config.ts` code

## How It Works

The playground uses:
- `useTheme` composable for state management
- `useLocalStorage` from VueUse for persistence
- URL query params for sharing
- Nuxt's `updateAppConfig()` for live theme updates

## Architecture

```
app/
├── app.vue                  # Main split-screen layout
├── components/
│   ├── ColorPicker.vue      # Tailwind color dropdown
│   └── PreviewCanvas.vue    # Component showcase
└── composables/
    ├── useTheme.ts          # State + localStorage + URL
    ├── usePresets.ts        # Theme presets library
    └── useExport.ts         # Code generation
```

## Tech Stack

- **Nuxt 4** - Full-stack framework
- **Nuxt UI 4** - Component library
- **VueUse** - Composable utilities
- **TypeScript** - Type safety