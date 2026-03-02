/**
 * Local type augmentation for the crouton:operation Nitro hook.
 *
 * The canonical declaration lives in @fyit/crouton (crouton-hooks.d.ts).
 * This file ensures the hook is recognised during standalone type-checking
 * of the crouton-auth package, which does not depend on @fyit/crouton directly.
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

    'crouton:auth:email': (payload: CroutonAuthEmailPayload) => void | Promise<void>
  }
}

export type CroutonAuthEmailPayload =
  | { type: 'verification', to: string, url: string, userName?: string }
  | { type: 'password-reset', to: string, url: string, userName?: string }
  | { type: 'invitation', to: string, invitationId: string, organizationName: string, inviterName: string, inviterEmail: string, role: string, expiresAt: Date }
  | { type: 'magic-link', to: string, url: string }

export {}
