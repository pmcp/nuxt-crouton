// Minimal Theme Configuration
// Super clean, black lines, white background, minimal aesthetic

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'neutral'
    },

    button: {
      slots: {
        base: [
          'font-medium inline-flex items-center justify-center',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-150'
        ]
      },

      variants: {
        variant: {
          minimal: ''
        }
      },

      compoundVariants: [
        // Minimal + Primary (black)
        {
          color: 'primary',
          variant: 'minimal',
          class: 'minimal-btn minimal-btn--primary'
        },
        // Minimal + Neutral (gray outline)
        {
          color: 'neutral',
          variant: 'minimal',
          class: 'minimal-btn minimal-btn--neutral'
        },
        // Minimal + Error (black with red text)
        {
          color: 'error',
          variant: 'minimal',
          class: 'minimal-btn minimal-btn--error'
        },
        // Minimal default
        {
          variant: 'minimal',
          class: 'minimal-btn'
        }
      ]
    },

    input: {
      variants: {
        variant: {
          minimal: {
            root: 'minimal-input',
            base: 'minimal-input-base'
          }
        }
      }
    },

    card: {
      variants: {
        variant: {
          minimal: {
            root: 'minimal-card',
            header: 'minimal-card-header',
            body: 'minimal-card-body',
            footer: 'minimal-card-footer'
          }
        }
      }
    },

    separator: {
      variants: {
        variant: {
          minimal: {
            root: 'minimal-separator'
          }
        }
      }
    }
  }
})
