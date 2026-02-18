export default defineAppConfig({
  ui: {
    theme: {
      defaultVariants: {
        size: 'sm'
      }
    },
    colors: {
      primary: 'black',
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
      variants: {
        size: {
          xs: {
            base: 'px-1.5 py-0.5 text-xs gap-1',
            trailingIcon: 'size-4'
          },
          sm: {
            base: 'px-2 py-1.5 text-xs gap-1.5',
            leadingIcon: 'size-4',
            trailingIcon: 'size-4'
          },
          md: {
            base: 'px-2.5 py-1.5 text-sm gap-1.5',
            leadingIcon: 'size-5',
            trailingIcon: 'size-5'
          },
          lg: {
            base: 'px-2.5 py-1.5 text-sm gap-2',
            leadingIcon: 'size-5',
            trailingIcon: 'size-5'
          },
          xl: {
            base: 'px-2.5 py-1.5 text-base gap-2.5',
            leadingIcon: 'size-5',
            trailingIcon: 'size-5'
          }
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
