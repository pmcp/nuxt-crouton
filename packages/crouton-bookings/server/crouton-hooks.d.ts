/**
 * Augment NitroRuntimeHooks with crouton:operation for standalone typecheck.
 *
 * The canonical declaration lives in crouton-core/crouton-hooks.d.ts.
 * This file makes the hook type available when typechecking crouton-bookings
 * in isolation (i.e. without crouton-core loaded as a Nuxt layer), because
 * tsconfig.server.json includes `../server/**\/*` but not the package types/.
 */
declare module 'nitropack' {
  interface NitroRuntimeHooks {
    'crouton:operation': (payload: {
      type: string
      source: string
      teamId?: string
      userId?: string
      correlationId?: string
      metadata?: Record<string, any>
      timestamp?: number
    }) => void | Promise<void>
  }
}

export {}
