// KO Button - Hardware-inspired styling based on Teenage Engineering KO II
// Base classes shared by all KO button colors
const koBase = [
  'relative overflow-visible isolate',
  'before:content-[\'\'] before:absolute before:inset-[-4px] before:bg-[#171717] before:rounded-[5px] before:-z-10',
  'font-[ko-tech] tracking-wider uppercase text-xs',
  'transition-all duration-100 ease-in-out',
  'active:translate-y-[0.5px]'
].join(' ')

export default defineAppConfig({
  ui: {
    // === COLORS ===
    colors: {
      primary: 'orange',
      neutral: 'stone'
    },

    // === BUTTON OVERRIDES ===
    button: {
      variants: {
        variant: {
          // KO Hardware variant - gray tactile button with dark bezel
          ko: [
            koBase,
            'bg-[#c7c3c0] text-[#403E3D]',
            'shadow-[rgba(0,0,0,0.377)_10px_10px_8px,_#ffffff_1.5px_1.5px_2px_0px_inset,_#c7c3c0_-3.2px_-3.2px_8px_0px_inset]',
            'hover:bg-[#bfbbb8]',
            'active:shadow-[rgba(0,0,0,0.377)_0px_0px_0px,_inset_0.5px_0.5px_4px_#000000,_#c7c3c0_-3.2px_-3.2px_8px_0px_inset]'
          ].join(' ')
        },
        // Color variants work with variant="ko" via compoundVariants
        color: {
          ko: '' // Placeholder, actual colors defined in compoundVariants
        }
      },
      // Use compoundVariants to combine variant="ko" with color="orange", etc.
      compoundVariants: [
        // KO + Orange
        {
          variant: 'ko',
          color: 'primary',
          class: [
            koBase,
            'bg-[#FA5F28] text-[#F2F2F2]',
            'shadow-[rgba(0,0,0,0.377)_10px_10px_8px,_#FDC7B4_1.5px_1.5px_1px_0px_inset,_#FA5F28_-3.2px_-3.2px_8px_0px_inset]',
            'hover:bg-[#e85520]',
            'active:shadow-[rgba(0,0,0,0.377)_0px_0px_0px,_inset_0.5px_0.5px_4px_#000000,_#d42a02_-3.2px_-3.2px_8px_0px_inset]'
          ].join(' ')
        },
        // KO + Neutral (dark gray)
        {
          variant: 'ko',
          color: 'neutral',
          class: [
            koBase,
            'bg-[#545251] text-[#F2F2F2]',
            'shadow-[rgba(0,0,0,0.377)_10px_10px_8px,_#a8a6a4_1.5px_1.5px_1px_0px_inset,_#545251_-3.2px_-3.2px_8px_0px_inset]',
            'hover:bg-[#4a4948]',
            'active:shadow-[rgba(0,0,0,0.377)_0px_0px_0px,_inset_0.5px_0.5px_4px_#000000,_#545251_-3.2px_-3.2px_8px_0px_inset]'
          ].join(' ')
        },
        // KO + Error (red)
        {
          variant: 'ko',
          color: 'error',
          class: [
            koBase,
            'bg-[#F12618] text-[#F2F2F2]',
            'shadow-[rgba(0,0,0,0.377)_10px_10px_8px,_#FBCFCC_1.5px_1.5px_1px_0px_inset,_#F12618_-3.2px_-3.2px_8px_0px_inset]',
            'hover:bg-[#d92015]',
            'active:shadow-[rgba(0,0,0,0.377)_0px_0px_0px,_inset_0.5px_0.5px_4px_#000000,_#F12618_-3.2px_-3.2px_8px_0px_inset]'
          ].join(' ')
        },
        // KO + Secondary (pink)
        {
          variant: 'ko',
          color: 'secondary',
          class: [
            koBase,
            'bg-[#E62C5E] text-[#F2F2F2]',
            'shadow-[rgba(0,0,0,0.377)_10px_10px_8px,_#FFC2D2_1.5px_1.5px_1px_0px_inset,_#E62C5E_-3.2px_-3.2px_8px_0px_inset]',
            'hover:bg-[#cc2550]',
            'active:shadow-[rgba(0,0,0,0.377)_0px_0px_0px,_inset_0.5px_0.5px_4px_#000000,_#E62C5E_-3.2px_-3.2px_8px_0px_inset]'
          ].join(' ')
        },
        // KO + Info (blue)
        {
          variant: 'ko',
          color: 'info',
          class: [
            koBase,
            'bg-[#429CCE] text-[#F2F2F2]',
            'shadow-[rgba(0,0,0,0.377)_10px_10px_8px,_#B4E0F9_1.5px_1.5px_1px_0px_inset,_#429CCE_-3.2px_-3.2px_8px_0px_inset]',
            'hover:bg-[#3a8ab8]',
            'active:shadow-[rgba(0,0,0,0.377)_0px_0px_0px,_inset_0.5px_0.5px_4px_#000000,_#429CCE_-3.2px_-3.2px_8px_0px_inset]'
          ].join(' ')
        }
      ]
    },

    // === INPUT OVERRIDES ===
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

    // === CARD OVERRIDES ===
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
