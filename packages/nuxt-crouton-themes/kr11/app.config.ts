// KR-11 Theme Configuration
// Korg KR-11 Compact Rhythm Box inspired styling

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'stone'
    },

    button: {
      // Note: No slots.base override - let Nuxt UI handle base classes to avoid hydration mismatches
      variants: {
        variant: {
          kr11: '',
          'kr11-solid': '',
          'kr11-outline': '',
          'kr11-soft': '',
          'kr11-ghost': '',
          'kr11-link': ''
        }
      },

      compoundVariants: [
        // === BASE KR11 (pad style) ===
        { color: 'primary', variant: 'kr11', class: 'kr-pad kr-pad--mint' },
        { color: 'neutral', variant: 'kr11', class: 'kr-pad' },
        { color: 'warning', variant: 'kr11', class: 'kr-pad kr-pad--gold' },
        { color: 'error', variant: 'kr11', class: 'kr-pad kr-pad--coral' },
        { color: 'secondary', variant: 'kr11', class: 'kr-mode-btn' },
        { variant: 'kr11', class: 'kr-pad' },

        // === KR11-SOLID (same as base) ===
        { color: 'primary', variant: 'kr11-solid', class: 'kr-pad kr-pad--mint' },
        { color: 'neutral', variant: 'kr11-solid', class: 'kr-pad' },
        { color: 'warning', variant: 'kr11-solid', class: 'kr-pad kr-pad--gold' },
        { color: 'error', variant: 'kr11-solid', class: 'kr-pad kr-pad--coral' },
        { variant: 'kr11-solid', class: 'kr-pad' },

        // === KR11-OUTLINE ===
        { color: 'primary', variant: 'kr11-outline', class: 'kr-outline kr-outline--mint' },
        { color: 'neutral', variant: 'kr11-outline', class: 'kr-outline' },
        { color: 'warning', variant: 'kr11-outline', class: 'kr-outline kr-outline--gold' },
        { color: 'error', variant: 'kr11-outline', class: 'kr-outline kr-outline--coral' },
        { variant: 'kr11-outline', class: 'kr-outline' },

        // === KR11-SOFT ===
        { color: 'primary', variant: 'kr11-soft', class: 'kr-soft kr-soft--mint' },
        { color: 'neutral', variant: 'kr11-soft', class: 'kr-soft' },
        { color: 'warning', variant: 'kr11-soft', class: 'kr-soft kr-soft--gold' },
        { color: 'error', variant: 'kr11-soft', class: 'kr-soft kr-soft--coral' },
        { variant: 'kr11-soft', class: 'kr-soft' },

        // === KR11-GHOST ===
        { color: 'primary', variant: 'kr11-ghost', class: 'kr-ghost kr-ghost--mint' },
        { color: 'neutral', variant: 'kr11-ghost', class: 'kr-ghost' },
        { color: 'warning', variant: 'kr11-ghost', class: 'kr-ghost kr-ghost--gold' },
        { color: 'error', variant: 'kr11-ghost', class: 'kr-ghost kr-ghost--coral' },
        { variant: 'kr11-ghost', class: 'kr-ghost' },

        // === KR11-LINK ===
        { color: 'primary', variant: 'kr11-link', class: 'kr-link kr-link--mint' },
        { color: 'neutral', variant: 'kr11-link', class: 'kr-link' },
        { color: 'warning', variant: 'kr11-link', class: 'kr-link kr-link--gold' },
        { color: 'error', variant: 'kr11-link', class: 'kr-link kr-link--coral' },
        { variant: 'kr11-link', class: 'kr-link' }
      ]
    },

    input: {
      variants: {
        variant: {
          kr11: {
            root: 'kr-input',
            base: 'kr-input-base'
          }
        }
      }
    },

    card: {
      variants: {
        variant: {
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
    }
  }
})
