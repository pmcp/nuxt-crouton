import { useEmailService } from './email'
import { renderEmailTemplate, getEmailBrandConfig } from './template-renderer'
import type {
  VerificationEmailOptions,
  VerificationLinkEmailOptions,
  MagicLinkEmailOptions,
  PasswordResetEmailOptions,
  TeamInviteEmailOptions,
  WelcomeEmailOptions,
  SendEmailResult
} from '../../types'

// Import email templates
import VerificationEmail from '../emails/Verification.vue'
import VerificationLinkEmail from '../emails/VerificationLink.vue'
import MagicLinkEmail from '../emails/MagicLink.vue'
import PasswordResetEmail from '../emails/PasswordReset.vue'
import TeamInviteEmail from '../emails/TeamInvite.vue'
import WelcomeEmail from '../emails/Welcome.vue'

/**
 * Send a verification code email
 */
export async function sendVerificationEmail(
  options: VerificationEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  if (!event) { try { event = useEvent() } catch {} }
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  const publicConfig = (config.public as any)?.crouton?.email
  const brandConfig = getEmailBrandConfig()
  if (options.brandName) brandConfig.brandName = options.brandName
  const expiryMinutes = options.expiryMinutes
    || publicConfig?.verification?.codeExpiry
    || 10

  const { html, text } = await renderEmailTemplate(VerificationEmail, {
    code: options.code,
    name: options.name,
    expiryMinutes,
    preview: `Your verification code is ${options.code}`,
    ...brandConfig,
    // Content overrides from team settings
    ...(options.overrides?.greeting && { greeting: options.overrides.greeting }),
    ...(options.overrides?.body && { body: options.overrides.body }),
    ...(options.overrides?.footer && { footer: options.overrides.footer })
  })

  return useEmailService(event).send({
    to: options.to,
    subject: options.overrides?.subject || `Your verification code is ${options.code}`,
    html,
    text,
    ...(options.overrides?.fromName && { fromName: options.overrides.fromName })
  })
}

/**
 * Send a verification link email (link-based, used by Better Auth)
 */
export async function sendVerificationLink(
  options: VerificationLinkEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  if (!event) { try { event = useEvent() } catch {} }
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  const publicConfig = (config.public as any)?.crouton?.email
  const brandConfig = getEmailBrandConfig()
  if (options.brandName) brandConfig.brandName = options.brandName
  const expiryMinutes = options.expiryMinutes
    || publicConfig?.verification?.codeExpiry
    || 10

  const { html, text } = await renderEmailTemplate(VerificationLinkEmail, {
    link: options.link,
    name: options.name,
    expiryMinutes,
    preview: 'Verify your email address',
    ...brandConfig,
    ...(options.overrides?.greeting && { greeting: options.overrides.greeting }),
    ...(options.overrides?.body && { body: options.overrides.body }),
    ...(options.overrides?.buttonText && { buttonText: options.overrides.buttonText }),
    ...(options.overrides?.footer && { footer: options.overrides.footer })
  })

  return useEmailService(event).send({
    to: options.to,
    subject: options.overrides?.subject || `Verify your ${brandConfig.brandName} email`,
    html,
    text,
    ...(options.overrides?.fromName && { fromName: options.overrides.fromName })
  })
}

/**
 * Send a magic link login email
 */
export async function sendMagicLink(
  options: MagicLinkEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  if (!event) { try { event = useEvent() } catch {} }
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  const publicConfig = (config.public as any)?.crouton?.email
  const brandConfig = getEmailBrandConfig()
  if (options.brandName) brandConfig.brandName = options.brandName
  const expiryMinutes = options.expiryMinutes
    || publicConfig?.magicLink?.expiry
    || 10

  const { html, text } = await renderEmailTemplate(MagicLinkEmail, {
    link: options.link,
    name: options.name,
    expiryMinutes,
    preview: 'Click to sign in to your account',
    ...brandConfig,
    ...(options.overrides?.greeting && { greeting: options.overrides.greeting }),
    ...(options.overrides?.body && { body: options.overrides.body }),
    ...(options.overrides?.buttonText && { buttonText: options.overrides.buttonText }),
    ...(options.overrides?.footer && { footer: options.overrides.footer })
  })

  return useEmailService(event).send({
    to: options.to,
    subject: options.overrides?.subject || `Sign in to ${brandConfig.brandName}`,
    html,
    text,
    ...(options.overrides?.fromName && { fromName: options.overrides.fromName })
  })
}

/**
 * Send a password reset email
 */
export async function sendPasswordReset(
  options: PasswordResetEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  if (!event) { try { event = useEvent() } catch {} }
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  const publicConfig = (config.public as any)?.crouton?.email
  const brandConfig = getEmailBrandConfig()
  if (options.brandName) brandConfig.brandName = options.brandName
  const expiryMinutes = options.expiryMinutes
    || publicConfig?.verification?.codeExpiry
    || 10

  const { html, text } = await renderEmailTemplate(PasswordResetEmail, {
    link: options.link,
    name: options.name,
    expiryMinutes,
    preview: 'Reset your password',
    ...brandConfig,
    ...(options.overrides?.greeting && { greeting: options.overrides.greeting }),
    ...(options.overrides?.body && { body: options.overrides.body }),
    ...(options.overrides?.buttonText && { buttonText: options.overrides.buttonText }),
    ...(options.overrides?.footer && { footer: options.overrides.footer })
  })

  return useEmailService(event).send({
    to: options.to,
    subject: options.overrides?.subject || `Reset your ${brandConfig.brandName} password`,
    html,
    text,
    ...(options.overrides?.fromName && { fromName: options.overrides.fromName })
  })
}

/**
 * Send a team invitation email
 */
export async function sendTeamInvite(
  options: TeamInviteEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  const brandConfig = getEmailBrandConfig()
  if (options.brandName) brandConfig.brandName = options.brandName

  const { html, text } = await renderEmailTemplate(TeamInviteEmail, {
    link: options.link,
    inviterName: options.inviterName,
    teamName: options.teamName,
    role: options.role,
    preview: `${options.inviterName} invited you to join ${options.teamName}`,
    ...brandConfig,
    ...(options.overrides?.body && { body: options.overrides.body }),
    ...(options.overrides?.buttonText && { buttonText: options.overrides.buttonText }),
    ...(options.overrides?.footer && { footer: options.overrides.footer })
  })

  return useEmailService(event).send({
    to: options.to,
    subject: options.overrides?.subject || `Join ${options.teamName} on ${brandConfig.brandName}`,
    html,
    text,
    ...(options.overrides?.fromName && { fromName: options.overrides.fromName })
  })
}

/**
 * Send a welcome email
 */
export async function sendWelcome(
  options: WelcomeEmailOptions,
  event?: any
): Promise<SendEmailResult> {
  const brandConfig = getEmailBrandConfig()
  if (options.brandName) brandConfig.brandName = options.brandName

  const { html, text } = await renderEmailTemplate(WelcomeEmail, {
    name: options.name,
    getStartedLink: options.getStartedLink,
    preview: `Welcome to ${brandConfig.brandName}!`,
    ...brandConfig,
    ...(options.overrides?.greeting && { greeting: options.overrides.greeting }),
    ...(options.overrides?.body && { body: options.overrides.body }),
    ...(options.overrides?.buttonText && { buttonText: options.overrides.buttonText }),
    ...(options.overrides?.footer && { footer: options.overrides.footer })
  })

  return useEmailService(event).send({
    to: options.to,
    subject: options.overrides?.subject || `Welcome to ${brandConfig.brandName}!`,
    html,
    text,
    ...(options.overrides?.fromName && { fromName: options.overrides.fromName })
  })
}
