// KR-11 Theme Configuration
// Korg KR-11 Compact Rhythm Box inspired styling

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'stone'
    },

    button: {
      slots: {
        base: [
          'font-medium inline-flex items-center justify-center',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-100'
        ]
      },

      variants: {
        variant: {
          kr11: ''
        }
      },

      compoundVariants: [
        // KR11 + Primary (mint green - play button)
        {
          color: 'primary',
          variant: 'kr11',
          class: 'kr-pad kr-pad--mint'
        },
        // KR11 + Neutral (cream pad)
        {
          color: 'neutral',
          variant: 'kr11',
          class: 'kr-pad'
        },
        // KR11 + Warning (golden yellow - fill buttons)
        {
          color: 'warning',
          variant: 'kr11',
          class: 'kr-pad kr-pad--gold'
        },
        // KR11 + Error (coral pink - accent pad)
        {
          color: 'error',
          variant: 'kr11',
          class: 'kr-pad kr-pad--coral'
        },
        // KR11 + Secondary (small mode button style)
        {
          color: 'secondary',
          variant: 'kr11',
          class: 'kr-mode-btn'
        },
        // KR11 default
        {
          variant: 'kr11',
          class: 'kr-pad'
        }
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
          kr11: {
            root: 'kr-badge'
          }
        }
      }
    }
  }
})
