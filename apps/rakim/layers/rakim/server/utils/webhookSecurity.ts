/**
 * Webhook Security Utilities
 *
 * Provides:
 * - Signature verification for Slack and Mailgun webhooks
 * - Timestamp validation to prevent replay attacks
 * - Request validation helpers
 *
 * Security measures:
 * - HMAC signature verification using crypto
 * - Configurable timestamp tolerance (default 5 minutes)
 * - Constant-time comparison to prevent timing attacks
 */

import crypto from 'node:crypto'
import { logger } from '../utils/logger'

/**
 * Replay attack prevention window (5 minutes)
 */
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000

/**
 * Verify Slack webhook signature
 *
 * Slack uses HMAC-SHA256 with the signing secret to sign requests.
 * The signature is sent in the `X-Slack-Signature` header.
 * The timestamp is sent in the `X-Slack-Request-Timestamp` header.
 *
 * **Algorithm:**
 * 1. Extract timestamp and signature from headers
 * 2. Validate timestamp is within tolerance window (prevent replay)
 * 3. Compute expected signature: HMAC-SHA256(signingSecret, `v0:${timestamp}:${rawBody}`)
 * 4. Compare using constant-time comparison
 *
 * @param rawBody - Raw request body string (not parsed JSON)
 * @param headers - Request headers object
 * @param signingSecret - Slack app signing secret (from environment)
 * @returns true if signature is valid, false otherwise
 *
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * @example
 * ```ts
 * const rawBody = await readRawBody(event)
 * const headers = getHeaders(event)
 * const signingSecret = useRuntimeConfig().slackSigningSecret
 *
 * if (!verifySlackSignature(rawBody, headers, signingSecret)) {
 *   throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
 * }
 * ```
 */
export function verifySlackSignature(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  signingSecret: string,
): boolean {
  try {
    // 1. Extract headers (normalize to lowercase)
    const timestamp = (headers['x-slack-request-timestamp'] || headers['X-Slack-Request-Timestamp']) as string | undefined
    const signature = (headers['x-slack-signature'] || headers['X-Slack-Signature']) as string | undefined

    if (!timestamp || !signature) {
      logger.warn('[Webhook Security] Missing Slack signature headers')
      return false
    }

    // 2. Validate timestamp (prevent replay attacks)
    const requestTime = Number.parseInt(timestamp, 10) * 1000 // Convert to milliseconds
    const currentTime = Date.now()
    const timeDiff = Math.abs(currentTime - requestTime)

    if (timeDiff > TIMESTAMP_TOLERANCE_MS) {
      logger.warn('[Webhook Security] Slack request timestamp outside tolerance window', {
        requestTime: new Date(requestTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        diffMinutes: (timeDiff / 60000).toFixed(2),
      })
      return false
    }

    // 3. Compute expected signature
    const baseString = `v0:${timestamp}:${rawBody}`
    const expectedSignature = `v0=${crypto
      .createHmac('sha256', signingSecret)
      .update(baseString)
      .digest('hex')}`

    // 4. Compare using constant-time comparison (prevent timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8'),
    )
  }
  catch (error) {
    logger.error('[Webhook Security] Error verifying Slack signature:', error)
    return false
  }
}

/**
 * Verify Mailgun webhook signature
 *
 * Mailgun signs webhooks using HMAC-SHA256 with the webhook signing key.
 * The signature is sent in the request body as `signature` object.
 *
 * **Algorithm:**
 * 1. Extract timestamp and signature from body
 * 2. Validate timestamp is within tolerance window (prevent replay)
 * 3. Compute expected signature: HMAC-SHA256(signingKey, `${timestamp}${token}`)
 * 4. Compare using constant-time comparison
 *
 * @param timestamp - Timestamp from Mailgun signature object
 * @param token - Token from Mailgun signature object
 * @param signature - Signature from Mailgun signature object
 * @param signingKey - Mailgun webhook signing key (from environment)
 * @returns true if signature is valid, false otherwise
 *
 * @see https://documentation.mailgun.com/en/latest/user_manual.html#webhooks
 *
 * @example
 * ```ts
 * const body = await readBody(event)
 * const signingKey = useRuntimeConfig().mailgunSigningKey
 *
 * if (body.signature) {
 *   const { timestamp, token, signature } = body.signature
 *   if (!verifyMailgunSignature(timestamp, token, signature, signingKey)) {
 *     throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
 *   }
 * }
 * ```
 */
export function verifyMailgunSignature(
  timestamp: string | number,
  token: string,
  signature: string,
  signingKey: string,
): boolean {
  try {
    // 1. Validate timestamp (prevent replay attacks)
    const requestTime = typeof timestamp === 'string' ? Number.parseInt(timestamp, 10) * 1000 : timestamp * 1000
    const currentTime = Date.now()
    const timeDiff = Math.abs(currentTime - requestTime)

    if (timeDiff > TIMESTAMP_TOLERANCE_MS) {
      logger.warn('[Webhook Security] Mailgun request timestamp outside tolerance window', {
        requestTime: new Date(requestTime).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
        diffMinutes: (timeDiff / 60000).toFixed(2),
      })
      return false
    }

    // 2. Compute expected signature
    const data = `${timestamp}${token}`
    const expectedSignature = crypto
      .createHmac('sha256', signingKey)
      .update(data)
      .digest('hex')

    // 3. Compare using constant-time comparison (prevent timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8'),
    )
  }
  catch (error) {
    logger.error('[Webhook Security] Error verifying Mailgun signature:', error)
    return false
  }
}

/**
 * Validate request timestamp to prevent replay attacks
 *
 * Checks if the timestamp is within the acceptable tolerance window.
 * Used as a standalone check or as part of signature verification.
 *
 * @param timestamp - Unix timestamp (seconds or milliseconds)
 * @param toleranceMs - Maximum age of request in milliseconds (default: 5 minutes)
 * @returns true if timestamp is valid, false otherwise
 */
export function validateTimestamp(
  timestamp: number | string,
  toleranceMs: number = TIMESTAMP_TOLERANCE_MS,
): boolean {
  try {
    const ts = typeof timestamp === 'string' ? Number.parseInt(timestamp, 10) : timestamp

    // Handle both seconds and milliseconds timestamps
    const requestTime = ts < 10000000000 ? ts * 1000 : ts

    const currentTime = Date.now()
    const timeDiff = Math.abs(currentTime - requestTime)

    return timeDiff <= toleranceMs
  }
  catch {
    return false
  }
}

/**
 * Timing-safe string comparison
 *
 * Prevents timing attacks by using constant-time comparison.
 * Wrapper around crypto.timingSafeEqual with automatic buffer conversion.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings match, false otherwise
 */
export function safeCompare(a: string, b: string): boolean {
  try {
    // Ensure strings are same length for timingSafeEqual
    if (a.length !== b.length) {
      return false
    }

    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf8'),
      Buffer.from(b, 'utf8'),
    )
  }
  catch {
    return false
  }
}
