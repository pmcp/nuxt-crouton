/**
 * Create User API Endpoint
 *
 * POST /api/admin/users/create
 *
 * Creates a new user with the provided details.
 * Requires super admin privileges.
 *
 * Request body:
 * - name: User's display name (required)
 * - email: User's email address (required)
 * - password: User's password (required)
 * - emailVerified: Whether email is verified (default: false)
 * - superAdmin: Whether user is super admin (default: false)
 */
import type { H3Event } from 'h3'
import { defineEventHandler, readBody, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { user, account, useAdminDb } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/admin'
import type { CreateUserPayload, AdminUser } from '../../../../types/admin'

// Generate a unique ID (similar to nanoid)
function generateId(length = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

// Hash password using Web Crypto API (bcrypt-like approach not available, using PBKDF2)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Format: $pbkdf2$iterations$salt$hash
  return `$pbkdf2$100000$${saltHex}$${hashHex}`
}

export default defineEventHandler(async (event: H3Event): Promise<AdminUser> => {
  // Verify super admin access
  await requireSuperAdmin(event)

  const db = useAdminDb()

  // Parse and validate body
  const body = await readBody<CreateUserPayload>(event)

  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Name is required',
    })
  }

  if (!body.email?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Email is required',
    })
  }

  if (!body.password || body.password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 8 characters',
    })
  }

  // Check if email already exists
  const existingUser = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, body.email.toLowerCase()))
    .limit(1)

  if (existingUser.length > 0) {
    throw createError({
      statusCode: 409,
      message: 'A user with this email already exists',
    })
  }

  // Generate IDs
  const userId = generateId()
  const accountId = generateId()
  const now = new Date()

  // Hash password
  const hashedPassword = await hashPassword(body.password)

  // Create user
  await db.insert(user).values({
    id: userId,
    name: body.name.trim(),
    email: body.email.toLowerCase().trim(),
    emailVerified: body.emailVerified ?? false,
    superAdmin: body.superAdmin ?? false,
    banned: false,
    createdAt: now,
    updatedAt: now,
  })

  // Create credential account for password auth
  await db.insert(account).values({
    id: accountId,
    userId: userId,
    accountId: userId, // For credential provider, accountId is same as userId
    providerId: 'credential',
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  })

  // Fetch and return created user
  const createdUsers = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  const createdUser = createdUsers[0]

  return {
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    emailVerified: createdUser.emailVerified,
    image: createdUser.image,
    createdAt: createdUser.createdAt,
    updatedAt: createdUser.updatedAt,
    stripeCustomerId: createdUser.stripeCustomerId,
    superAdmin: createdUser.superAdmin,
    banned: createdUser.banned,
    bannedReason: createdUser.bannedReason,
    bannedUntil: createdUser.bannedUntil,
  }
})
