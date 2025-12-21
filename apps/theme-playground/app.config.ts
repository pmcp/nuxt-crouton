// Theme Playground Configuration
// Merges all theme variants from ko, minimal, and kr11 layers
// This is necessary because Nuxt layer merging REPLACES compoundVariants arrays
// instead of combining them.

export default defineAppConfig({
  ui: {
    button: {
      // Register all theme variant names
      variants: {
        variant: {
          ko: '',
          minimal: '',
          kr11: ''
        }
      },

      // Merged compoundVariants from all themes
      compoundVariants: [
        // === KO Theme ===
        { color: 'primary', variant: 'ko', class: 'ko-bezel ko-bezel--orange' },
        { color: 'neutral', variant: 'ko', class: 'ko-bezel ko-bezel--dark' },
        { color: 'error', variant: 'ko', class: 'ko-bezel ko-bezel--red' },
        { color: 'secondary', variant: 'ko', class: 'ko-bezel ko-bezel--pink' },
        { color: 'info', variant: 'ko', class: 'ko-bezel ko-bezel--blue' },
        { variant: 'ko', class: 'ko-bezel' },

        // === Minimal Theme ===
        { color: 'primary', variant: 'minimal', class: 'minimal-btn minimal-btn--primary' },
        { color: 'neutral', variant: 'minimal', class: 'minimal-btn minimal-btn--neutral' },
        { color: 'error', variant: 'minimal', class: 'minimal-btn minimal-btn--error' },
        { variant: 'minimal', class: 'minimal-btn' },

        // === KR-11 Theme ===
        { color: 'primary', variant: 'kr11', class: 'kr-pad kr-pad--mint' },
        { color: 'neutral', variant: 'kr11', class: 'kr-pad' },
        { color: 'warning', variant: 'kr11', class: 'kr-pad kr-pad--gold' },
        { color: 'error', variant: 'kr11', class: 'kr-pad kr-pad--coral' },
        { color: 'secondary', variant: 'kr11', class: 'kr-mode-btn' },
        { variant: 'kr11', class: 'kr-pad' }
      ]
    },

    input: {
      variants: {
        variant: {
          ko: { root: 'ko-input', base: 'ko-input-base' },
          minimal: { root: 'minimal-input', base: 'minimal-input-base' },
          kr11: { root: 'kr-input', base: 'kr-input-base' }
        }
      }
    },

    card: {
      variants: {
        variant: {
          ko: {
            root: 'ko-card',
            header: 'ko-card-header',
            body: 'ko-card-body',
            footer: 'ko-card-footer'
          },
          minimal: {
            root: 'minimal-card',
            header: 'minimal-card-header',
            body: 'minimal-card-body',
            footer: 'minimal-card-footer'
          },
          kr11: {
            root: 'kr-card',
            header: 'kr-card-header',
            body: 'kr-card-body',
            footer: 'kr-card-footer'
          }
        }
      }
    },

    badge: {
      variants: {
        variant: {
          kr11: 'kr-badge'
        }
      }
    },

    separator: {
      variants: {
        variant: {
          minimal: { root: 'minimal-separator' }
        }
      }
    }
  }
})
