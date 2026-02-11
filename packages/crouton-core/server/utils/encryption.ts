/**
 * Reusable encryption utility for storing third-party secrets at rest.
 *
 * Uses AES-256-GCM via Web Crypto API (works on Cloudflare Workers, Node, Deno).
 * Key is sourced from NUXT_ENCRYPTION_KEY env var (base64-encoded 32-byte key).
 *
 * Format: base64(iv):base64(ciphertext+tag)
 */

async function getEncryptionKey(): Promise<CryptoKey> {
  const config = useRuntimeConfig()
  const keyBase64 = config.encryptionKey as string

  if (!keyBase64) {
    throw new Error('NUXT_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32')
  }

  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0))

  if (keyBytes.length !== 32) {
    throw new Error(`NUXT_ENCRYPTION_KEY must be 32 bytes (got ${keyBytes.length}). Generate with: openssl rand -base64 32`)
  }

  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

/**
 * Encrypt a plaintext string.
 * Returns format: `base64(iv):base64(ciphertext+tag)`
 */
async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded),
  )

  return `${toBase64(iv)}:${toBase64(ciphertext)}`
}

/**
 * Decrypt an encrypted string.
 * Expects format: `base64(iv):base64(ciphertext+tag)`
 */
async function decryptSecret(encrypted: string): Promise<string> {
  const colonIndex = encrypted.indexOf(':')
  if (colonIndex === -1) {
    throw new Error('Invalid encrypted format: missing separator')
  }

  const key = await getEncryptionKey()
  const iv = fromBase64(encrypted.slice(0, colonIndex))
  const ciphertext = fromBase64(encrypted.slice(colonIndex + 1))

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Generate a masked display hint for a secret.
 * Example: `sk-ant-api03-xxxxx...xxxxx` → `sk-ant-...xxxx`
 */
function maskSecret(value: string, prefixChars = 6, suffixChars = 4): string {
  if (value.length <= prefixChars + suffixChars) {
    return '*'.repeat(value.length)
  }
  return `${value.slice(0, prefixChars)}...${value.slice(-suffixChars)}`
}

/**
 * Check if a value looks like an encrypted string (base64:base64 format).
 */
function isEncryptedSecret(value: string): boolean {
  const colonIndex = value.indexOf(':')
  if (colonIndex === -1 || colonIndex === 0 || colonIndex === value.length - 1) {
    return false
  }
  const base64Regex = /^[A-Za-z0-9+/]+=*$/
  return base64Regex.test(value.slice(0, colonIndex)) && base64Regex.test(value.slice(colonIndex + 1))
}

export { encryptSecret, decryptSecret, maskSecret, isEncryptedSecret }
