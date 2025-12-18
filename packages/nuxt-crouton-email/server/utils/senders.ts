import { useEmailService } from './email'
import { renderEmailTemplate, getEmailBrandConfig } from './template-renderer'
import type {
  VerificationEmailOptions,
  MagicLinkEmailOptions,
  PasswordResetEmailOptions,
  TeamInviteEmailOptions,
  WelcomeEmailOptions,
  SendEmailResult,
} from '../../types'

// Import email templates
import VerificationEmail from '../emails/Verification.vue'
import MagicLinkEmail from '../emails/MagicLink.vue'
import PasswordResetEmail from '../emails/PasswordReset.vue'
import TeamInviteEmail from '../emails/TeamInvite.vue'
import WelcomeEmail from '../emails/Welcome.vue'

/**
 * Send a verification code email
 */
export async function sendVerificationEmail(
  options: VerificationEmailOptions,
): Promise<SendEmailResult> {
  const config = useRuntimeConfig()
  const publicConfig = (config.public as any)?.crouton?.email
  const brandConfig = getEmailBrandConfig()
  const expiryMinutes = options.expiryMinutes
    || publicConfig?.verification?.codeExpiry
    || 10

  const { html, text } = await renderEmailTemplate(VerificationEmail, {
    code: options.code,
    name: options.name,
    expiryMinutes,
    preview: `Your verification code is ${options.code}`,
    ...brandConfig,
  })

  return useEmailService().send({
    to: options.to,
    subject: `Your verification code is ${options.code}`,
    html,
    text,
  })
}

/**
 * Send a magic link login email
 */
export async function sendMagicLink(
  options: MagicLinkEmailOptions,
): Promise<SendEmailResult> {
  const config = useRuntimeConfig()
  const publicConfig = (config.public as any)?.crouton?.email
  const brandConfig = getEmailBrandConfig()
  const expiryMinutes = options.expiryMinutes
    || publicConfig?.magicLink?.expiry
    || 10

  const { html, text } = await renderEmailTemplate(MagicLinkEmail, {
    link: options.link,
    name: options.name,
    expiryMinutes,
    preview: 'Click to sign in to your account',
    ...brandConfig,
  })

  return useEmailService().send({
    to: options.to,
    subject: `Sign in to ${brandConfig.brandName}`,
    html,
    text,
  })
}

/**
 * Send a password reset email
 */
export async function sendPasswordReset(
  options: PasswordResetEmailOptions,
): Promise<SendEmailResult> {
  const config = useRuntimeConfig()
  const publicConfig = (config.public as any)?.crouton?.email
  const brandConfig = getEmailBrandConfig()
  const expiryMinutes = options.expiryMinutes
    || publicConfig?.verification?.codeExpiry
    || 10

  const { html, text } = await renderEmailTemplate(PasswordResetEmail, {
    link: options.link,
    name: options.name,
    expiryMinutes,
    preview: 'Reset your password',
    ...brandConfig,
  })

  return useEmailService().send({
    to: options.to,
    subject: `Reset your ${brandConfig.brandName} password`,
    html,
    text,
  })
}

/**
 * Send a team invitation email
 */
export async function sendTeamInvite(
  options: TeamInviteEmailOptions,
): Promise<SendEmailResult> {
  const brandConfig = getEmailBrandConfig()

  const { html, text } = await renderEmailTemplate(TeamInviteEmail, {
    link: options.link,
    inviterName: options.inviterName,
    teamName: options.teamName,
    role: options.role,
    preview: `${options.inviterName} invited you to join ${options.teamName}`,
    ...brandConfig,
  })

  return useEmailService().send({
    to: options.to,
    subject: `Join ${options.teamName} on ${brandConfig.brandName}`,
    html,
    text,
  })
}

/**
 * Send a welcome email
 */
export async function sendWelcome(
  options: WelcomeEmailOptions,
): Promise<SendEmailResult> {
  const brandConfig = getEmailBrandConfig()

  const { html, text } = await renderEmailTemplate(WelcomeEmail, {
    name: options.name,
    getStartedLink: options.getStartedLink,
    preview: `Welcome to ${brandConfig.brandName}!`,
    ...brandConfig,
  })

  return useEmailService().send({
    to: options.to,
    subject: `Welcome to ${brandConfig.brandName}!`,
    html,
    text,
  })
}
