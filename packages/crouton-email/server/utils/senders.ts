import type { Component } from 'vue'
import { useEmailService } from './email'
import { renderEmailTemplate, getEmailBrandConfig } from './template-renderer'
import type {
  VerificationEmailOptions,
  VerificationLinkEmailOptions,
  MagicLinkEmailOptions,
  PasswordResetEmailOptions,
  TeamInviteEmailOptions,
  WelcomeEmailOptions,
  SendEmailResult,
  EmailContentOverrides
} from '../../types'

// Import email templates
import VerificationEmail from '../emails/Verification.vue'
import VerificationLinkEmail from '../emails/VerificationLink.vue'
import MagicLinkEmail from '../emails/MagicLink.vue'
import PasswordResetEmail from '../emails/PasswordReset.vue'
import TeamInviteEmail from '../emails/TeamInvite.vue'
import WelcomeEmail from '../emails/Welcome.vue'

type OverrideKey = keyof EmailContentOverrides

/**
 * Pick only the truthy override fields onto a template props object.
 * Avoids spreading `undefined` over template defaults.
 */
function pickOverrides(
  overrides: EmailContentOverrides | undefined,
  keys: OverrideKey[]
): Partial<EmailContentOverrides> {
  if (!overrides) return {}
  const out: Partial<EmailContentOverrides> = {}
  for (const key of keys) {
    if (overrides[key]) (out as any)[key] = overrides[key]
  }
  return out
}

/**
 * Resolve runtime config + brand config + expiry minutes shared by every sender.
 */
function resolveEmailContext(
  brandName: string | undefined,
  expiryOverride: number | undefined,
  expiryConfigPath: 'verification.codeExpiry' | 'magicLink.expiry' | null,
  event: any
) {
  if (!event) { try { event = useEvent() } catch {} }
  const brandConfig = getEmailBrandConfig()
  if (brandName) brandConfig.brandName = brandName

  let expiryMinutes = expiryOverride
  if (!expiryMinutes && expiryConfigPath) {
    const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
    const publicConfig = (config.public as any)?.crouton?.email
    const [section, key] = expiryConfigPath.split('.') as [string, string]
    expiryMinutes = publicConfig?.[section]?.[key] || 10
  }

  return { event, brandConfig, expiryMinutes: expiryMinutes ?? 10 }
}

/**
 * Render a Vue Email template and send it via the configured email service.
 * Handles subject + fromName overrides uniformly across all sender wrappers.
 */
async function sendTemplatedEmail(args: {
  event: any
  template: Component
  templateProps: Record<string, any>
  to: string | string[]
  subject: string
  fromNameOverride?: string
}): Promise<SendEmailResult> {
  const { html, text } = await renderEmailTemplate(args.template, args.templateProps)
  return useEmailService(args.event).send({
    to: args.to,
    subject: args.subject,
    html,
    text,
    ...(args.fromNameOverride && { fromName: args.fromNameOverride })
  })
}

/**
 * Send a verification code email
 */
export async function sendVerificationEmail(
  options: VerificationEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  const ctx = resolveEmailContext(options.brandName, options.expiryMinutes, 'verification.codeExpiry', event)

  return sendTemplatedEmail({
    event: ctx.event,
    template: VerificationEmail,
    templateProps: {
      code: options.code,
      name: options.name,
      expiryMinutes: ctx.expiryMinutes,
      preview: `Your verification code is ${options.code}`,
      ...ctx.brandConfig,
      ...pickOverrides(options.overrides, ['greeting', 'body', 'footer'])
    },
    to: options.to,
    subject: options.overrides?.subject || `Your verification code is ${options.code}`,
    fromNameOverride: options.overrides?.fromName
  })
}

/**
 * Send a verification link email (link-based, used by Better Auth)
 */
export async function sendVerificationLink(
  options: VerificationLinkEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  const ctx = resolveEmailContext(options.brandName, options.expiryMinutes, 'verification.codeExpiry', event)

  return sendTemplatedEmail({
    event: ctx.event,
    template: VerificationLinkEmail,
    templateProps: {
      link: options.link,
      name: options.name,
      expiryMinutes: ctx.expiryMinutes,
      preview: 'Verify your email address',
      ...ctx.brandConfig,
      ...pickOverrides(options.overrides, ['greeting', 'body', 'buttonText', 'footer'])
    },
    to: options.to,
    subject: options.overrides?.subject || `Verify your ${ctx.brandConfig.brandName} email`,
    fromNameOverride: options.overrides?.fromName
  })
}

/**
 * Send a magic link login email
 */
export async function sendMagicLink(
  options: MagicLinkEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  const ctx = resolveEmailContext(options.brandName, options.expiryMinutes, 'magicLink.expiry', event)

  return sendTemplatedEmail({
    event: ctx.event,
    template: MagicLinkEmail,
    templateProps: {
      link: options.link,
      name: options.name,
      expiryMinutes: ctx.expiryMinutes,
      preview: 'Click to sign in to your account',
      ...ctx.brandConfig,
      ...pickOverrides(options.overrides, ['greeting', 'body', 'buttonText', 'footer'])
    },
    to: options.to,
    subject: options.overrides?.subject || `Sign in to ${ctx.brandConfig.brandName}`,
    fromNameOverride: options.overrides?.fromName
  })
}

/**
 * Send a password reset email
 */
export async function sendPasswordReset(
  options: PasswordResetEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  const ctx = resolveEmailContext(options.brandName, options.expiryMinutes, 'verification.codeExpiry', event)

  return sendTemplatedEmail({
    event: ctx.event,
    template: PasswordResetEmail,
    templateProps: {
      link: options.link,
      name: options.name,
      expiryMinutes: ctx.expiryMinutes,
      preview: 'Reset your password',
      ...ctx.brandConfig,
      ...pickOverrides(options.overrides, ['greeting', 'body', 'buttonText', 'footer'])
    },
    to: options.to,
    subject: options.overrides?.subject || `Reset your ${ctx.brandConfig.brandName} password`,
    fromNameOverride: options.overrides?.fromName
  })
}

/**
 * Send a team invitation email
 */
export async function sendTeamInvite(
  options: TeamInviteEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  const ctx = resolveEmailContext(options.brandName, undefined, null, event)

  return sendTemplatedEmail({
    event: ctx.event,
    template: TeamInviteEmail,
    templateProps: {
      link: options.link,
      inviterName: options.inviterName,
      teamName: options.teamName,
      role: options.role,
      preview: `${options.inviterName} invited you to join ${options.teamName}`,
      ...ctx.brandConfig,
      ...pickOverrides(options.overrides, ['body', 'buttonText', 'footer'])
    },
    to: options.to,
    subject: options.overrides?.subject || `Join ${options.teamName} on ${ctx.brandConfig.brandName}`,
    fromNameOverride: options.overrides?.fromName
  })
}

/**
 * Send a welcome email
 */
export async function sendWelcome(
  options: WelcomeEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  const ctx = resolveEmailContext(options.brandName, undefined, null, event)

  return sendTemplatedEmail({
    event: ctx.event,
    template: WelcomeEmail,
    templateProps: {
      name: options.name,
      getStartedLink: options.getStartedLink,
      preview: `Welcome to ${ctx.brandConfig.brandName}!`,
      ...ctx.brandConfig,
      ...pickOverrides(options.overrides, ['greeting', 'body', 'buttonText', 'footer'])
    },
    to: options.to,
    subject: options.overrides?.subject || `Welcome to ${ctx.brandConfig.brandName}!`,
    fromNameOverride: options.overrides?.fromName
  })
}
