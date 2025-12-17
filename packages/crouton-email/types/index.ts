/**
 * Email configuration options
 */
export interface EmailConfig {
  /** Resend API key (server-only) */
  resendApiKey: string
  /** From email address */
  from: string
  /** From name */
  fromName: string
  /** Reply-to email address (optional) */
  replyTo?: string
}

/**
 * Public email configuration
 */
export interface EmailPublicConfig {
  brand: {
    /** App name for email templates */
    name: string
    /** Logo URL for email headers */
    logoUrl?: string
    /** Primary brand color (hex) */
    primaryColor: string
    /** App URL for links */
    url: string
  }
  verification: {
    /** Length of verification code */
    codeLength: number
    /** Code expiry in minutes */
    codeExpiry: number
    /** Resend cooldown in seconds */
    resendCooldown: number
  }
  magicLink: {
    /** Link expiry in minutes */
    expiry: number
    /** Resend cooldown in seconds */
    resendCooldown: number
  }
}

/**
 * Email send options
 */
export interface SendEmailOptions {
  /** Recipient email address */
  to: string | string[]
  /** Email subject */
  subject: string
  /** HTML content */
  html: string
  /** Plain text content (optional) */
  text?: string
  /** Reply-to address (overrides default) */
  replyTo?: string
  /** Custom from address (overrides default) */
  from?: string
  /** Custom from name (overrides default) */
  fromName?: string
  /** CC recipients */
  cc?: string | string[]
  /** BCC recipients */
  bcc?: string | string[]
  /** Custom headers */
  headers?: Record<string, string>
  /** Tags for tracking */
  tags?: Array<{ name: string; value: string }>
}

/**
 * Email send result
 */
export interface SendEmailResult {
  /** Whether the email was sent successfully */
  success: boolean
  /** Resend message ID if successful */
  id?: string
  /** Error message if failed */
  error?: string
}

/**
 * Verification email options
 */
export interface VerificationEmailOptions {
  /** Recipient email */
  to: string
  /** Verification code or link */
  code: string
  /** User's name (optional) */
  name?: string
  /** Custom expiry time in minutes */
  expiryMinutes?: number
}

/**
 * Magic link email options
 */
export interface MagicLinkEmailOptions {
  /** Recipient email */
  to: string
  /** Magic link URL */
  link: string
  /** User's name (optional) */
  name?: string
  /** Custom expiry time in minutes */
  expiryMinutes?: number
}

/**
 * Password reset email options
 */
export interface PasswordResetEmailOptions {
  /** Recipient email */
  to: string
  /** Reset link URL */
  link: string
  /** User's name (optional) */
  name?: string
  /** Custom expiry time in minutes */
  expiryMinutes?: number
}

/**
 * Team invite email options
 */
export interface TeamInviteEmailOptions {
  /** Recipient email */
  to: string
  /** Accept invitation link */
  link: string
  /** Inviter's name */
  inviterName: string
  /** Team/organization name */
  teamName: string
  /** Optional role being invited to */
  role?: string
}

/**
 * Welcome email options
 */
export interface WelcomeEmailOptions {
  /** Recipient email */
  to: string
  /** User's name */
  name: string
  /** Optional getting started link */
  getStartedLink?: string
}

/**
 * Email template props base
 */
export interface EmailTemplateBaseProps {
  /** Preview text shown in email client */
  preview?: string
  /** Brand name */
  brandName?: string
  /** Brand logo URL */
  logoUrl?: string
  /** Brand primary color */
  primaryColor?: string
  /** App URL */
  appUrl?: string
}

/**
 * Verification email template props
 */
export interface VerificationEmailProps extends EmailTemplateBaseProps {
  code: string
  name?: string
  expiryMinutes: number
}

/**
 * Magic link email template props
 */
export interface MagicLinkEmailProps extends EmailTemplateBaseProps {
  link: string
  name?: string
  expiryMinutes: number
}

/**
 * Password reset email template props
 */
export interface PasswordResetEmailProps extends EmailTemplateBaseProps {
  link: string
  name?: string
  expiryMinutes: number
}

/**
 * Team invite email template props
 */
export interface TeamInviteEmailProps extends EmailTemplateBaseProps {
  link: string
  inviterName: string
  teamName: string
  role?: string
}

/**
 * Welcome email template props
 */
export interface WelcomeEmailProps extends EmailTemplateBaseProps {
  name: string
  getStartedLink?: string
}

// Re-export everything
export type {
  EmailConfig as CroutonEmailConfig,
  EmailPublicConfig as CroutonEmailPublicConfig,
}
