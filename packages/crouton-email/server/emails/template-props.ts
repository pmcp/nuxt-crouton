/**
 * Shared Vue Email template prop interfaces.
 *
 * Every transactional template repeats the same branding/layout fields plus
 * a similar set of admin-overridable content slots. These base interfaces
 * keep them in one place so adding a new field (e.g. another brand color)
 * is a one-line change instead of a 6-file edit.
 */

/** Branding + layout fields injected into every email by the renderer. */
export interface BaseEmailTemplateProps {
  preview?: string
  brandName?: string
  logoUrl?: string
  primaryColor?: string
  appUrl?: string
}

/**
 * Content slots that admins can override per template.
 * Templates with a CTA button include `buttonText`; templates without one
 * (e.g. the code-only verification email) use `BasicContentOverrideProps`.
 */
export interface ContentOverrideProps {
  greeting?: string
  body?: string
  buttonText?: string
  footer?: string
}

/** Content slots for templates without a CTA button. */
export interface BasicContentOverrideProps {
  greeting?: string
  body?: string
  footer?: string
}
