/**
 * Issue a short-lived HMAC-signed collab token for cross-origin WebSocket auth.
 *
 * Flow:
 * 1. Client fetches this endpoint (same-origin, session cookies sent automatically)
 * 2. Server validates session, creates token with userId + expiry, signs with HMAC
 * 3. Client passes token as query param when connecting to cross-origin collab worker
 * 4. CollabRoom DO verifies HMAC signature and expiry — no callback needed
 */
import { getServerSession } from '@fyit/crouton-auth/server/utils/useServerAuth'

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  // Use BETTER_AUTH_SECRET as the signing key (available in both app and worker)
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw createError({ status: 500, statusText: 'Server misconfigured' })
  }

  const userId = session.user.id
  const exp = Date.now() + 60_000 // 60 seconds

  const payload = JSON.stringify({ userId, exp })
  const signature = await hmacSign(payload, secret)

  // Token = base64(payload).signature
  const token = `${btoa(payload)}.${signature}`

  return { token }
})
