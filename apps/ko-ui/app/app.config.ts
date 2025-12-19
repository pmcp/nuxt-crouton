// KO-UI Theme Configuration
// Hardware-inspired styling based on Teenage Engineering KO II

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'orange',
      neutral: 'stone'
    },

    button: {
      // Extend the base slot with KO font
      slots: {
        base: [
          'rounded-md font-medium inline-flex items-center disabled:cursor-not-allowed aria-disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:opacity-75',
          'transition-colors'
        ]
      },

      // Add 'ko' to the variant options
      variants: {
        variant: {
          // KO variant - placeholder, actual styling via compoundVariants
          ko: ''
        }
      },

      // Define KO styling for each color via compoundVariants
      compoundVariants: [
        // KO + Primary (orange)
        {
          color: 'primary',
          variant: 'ko',
          class: 'ko-bezel ko-bezel--orange'
        },
        // KO + Neutral (dark gray)
        {
          color: 'neutral',
          variant: 'ko',
          class: 'ko-bezel ko-bezel--dark'
        },
        // KO + Error (red)
        {
          color: 'error',
          variant: 'ko',
          class: 'ko-bezel ko-bezel--red'
        },
        // KO + Secondary (pink)
        {
          color: 'secondary',
          variant: 'ko',
          class: 'ko-bezel ko-bezel--pink'
        },
        // KO + Info (blue)
        {
          color: 'info',
          variant: 'ko',
          class: 'ko-bezel ko-bezel--blue'
        },
        // KO default (gray) - when no color specified or for fallback
        {
          variant: 'ko',
          class: 'ko-bezel'
        }
      ]
    },

    // INPUT OVERRIDES
    input: {
      slots: {
        root: 'font-[ko-tech]',
        base: [
          'bg-[#171717] text-[#FA5F28] border-[#323232]',
          'font-[ko-tech] tracking-wider',
          'shadow-[inset_2px_2px_8px_rgba(0,0,0,0.5)]',
          'focus:ring-[#FA5F28] focus:border-[#FA5F28]'
        ]
      }
    },

    // CARD OVERRIDES
    card: {
      slots: {
        root: [
          'bg-[#c7c3c0]',
          'shadow-[rgba(0,0,0,0.377)_10px_10px_8px]',
          'font-[ko-tech]'
        ],
        header: 'border-b border-[#908E8D]',
        body: 'text-[#403E3D]'
      }
    }
  }
})
