// Minimal Theme Configuration
// Super clean, black lines, white background, minimal aesthetic

// Subtractive-theming helper (Nuxt UI >= 4.9, PR #6562).
// A slot value that is a `(defaults) => classes` function REPLACES the resolved
// default classes instead of merging onto them. We keep Nuxt UI's layout/sizing
// and remove only the decorative utilities (rounded-* / shadow-* / ring-*, incl.
// variant-prefixed ones like `focus-visible:ring-2`), then tag the element with
// `minimal-flat`. Pure + deterministic, so SSR and client compute the identical
// class string -> no hydration mismatch.
const isDecorative = (cls: string): boolean => {
  const util = cls.split(':').pop() ?? cls // drop variant prefixes (hover:, focus-visible:, dark:)
  return /^-?(rounded|shadow|ring)(-|$)/.test(util)
}

const stripDecorative = (defaults: string): string =>
  defaults
    .split(/\s+/)
    .filter(c => c && !isDecorative(c))
    .concat('minimal-flat')
    .join(' ')

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'neutral'
    },

    button: {
      // Subtractive base via a slot-class replacer (see stripDecorative above).
      // NOTE: this is GLOBAL to every <UButton> in an app that extends this
      // theme -- it is NOT scoped to `variant="minimal"`. Replacers are only read
      // at the top-level base/slots or the per-instance :ui prop, never inside
      // variants/compoundVariants, so a theme that wants to *subtract* defaults
      // does it here, while the named `minimal*` variants below stay additive.
      slots: {
        base: stripDecorative
      },
      variants: {
        variant: {
          minimal: '',
          'minimal-solid': '',
          'minimal-outline': '',
          'minimal-soft': '',
          'minimal-ghost': '',
          'minimal-link': ''
        }
      },

      compoundVariants: [
        // Minimal + Primary (black)
        { color: 'primary', variant: 'minimal', class: 'minimal-btn minimal-btn--primary' },
        { color: 'neutral', variant: 'minimal', class: 'minimal-btn minimal-btn--neutral' },
        { color: 'error', variant: 'minimal', class: 'minimal-btn minimal-btn--error' },
        { variant: 'minimal', class: 'minimal-btn' },

        // === MINIMAL-SOLID (same as base minimal) ===
        { color: 'primary', variant: 'minimal-solid', class: 'minimal-btn minimal-btn--primary' },
        { color: 'neutral', variant: 'minimal-solid', class: 'minimal-btn minimal-btn--neutral' },
        { color: 'error', variant: 'minimal-solid', class: 'minimal-btn minimal-btn--error' },
        { variant: 'minimal-solid', class: 'minimal-btn' },

        // === MINIMAL-OUTLINE ===
        { color: 'primary', variant: 'minimal-outline', class: 'minimal-outline minimal-outline--primary' },
        { color: 'neutral', variant: 'minimal-outline', class: 'minimal-outline minimal-outline--neutral' },
        { color: 'error', variant: 'minimal-outline', class: 'minimal-outline minimal-outline--error' },
        { variant: 'minimal-outline', class: 'minimal-outline' },

        // === MINIMAL-SOFT ===
        { color: 'primary', variant: 'minimal-soft', class: 'minimal-soft minimal-soft--primary' },
        { color: 'neutral', variant: 'minimal-soft', class: 'minimal-soft minimal-soft--neutral' },
        { color: 'error', variant: 'minimal-soft', class: 'minimal-soft minimal-soft--error' },
        { variant: 'minimal-soft', class: 'minimal-soft' },

        // === MINIMAL-GHOST ===
        { color: 'primary', variant: 'minimal-ghost', class: 'minimal-ghost minimal-ghost--primary' },
        { color: 'neutral', variant: 'minimal-ghost', class: 'minimal-ghost minimal-ghost--neutral' },
        { color: 'error', variant: 'minimal-ghost', class: 'minimal-ghost minimal-ghost--error' },
        { variant: 'minimal-ghost', class: 'minimal-ghost' },

        // === MINIMAL-LINK ===
        { color: 'primary', variant: 'minimal-link', class: 'minimal-link minimal-link--primary' },
        { color: 'neutral', variant: 'minimal-link', class: 'minimal-link minimal-link--neutral' },
        { color: 'error', variant: 'minimal-link', class: 'minimal-link minimal-link--error' },
        { variant: 'minimal-link', class: 'minimal-link' }
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
