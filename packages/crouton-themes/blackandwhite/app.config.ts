export default defineAppConfig({
  ui: {
    theme: {
      defaultVariants: {
        size: 'sm'
      }
    },
    colors: {
      primary: 'neutral',
      neutral: 'neutral'
    },
    container: {
      base: 'w-full max-w-full mx-auto px-4 sm:px-6 lg:px-8'
    },
    select: {
      slots: {
        content: 'min-w-fit'
      },
      defaultVariants: {
        variant: 'subtle'
      }
    },
    button: {
      // Register bw-* as valid variants and override solid/outline/soft/ghost/link
      // to inject our CSS class names. The CSS file handles actual styling with
      // !important to override Nuxt UI's CSS-variable-based defaults.
      variants: {
        variant: {
          solid: 'bw-solid',
          outline: 'bw-outline',
          soft: 'bw-soft',
          ghost: 'bw-ghost',
          link: 'bw-link'
        }
      }
    },
    dashboardPanel: {
      slots: {
        body: 'p-4'
      }
    },
    navigationMenu: {
      props: {
        color: 'primary',
        variant: 'pill',
        orientation: 'vertical',
        highlight: false,
        highlightColor: 'primary',
        collapsed: false
      },
      slots: {
        root: 'w-full'
      }
    },
    card: {
      defaultVariants: {
        variant: 'outline'
      }
    },
    input: {
      variants: {
        variant: {}
      },
      defaultVariants: {
        variant: 'subtle'
      }
    },
    alert: {
      defaultVariants: {
        variant: 'subtle'
      }
    },
    textarea: {
      defaultVariants: {
        variant: 'subtle'
      }
    }
  }
})
