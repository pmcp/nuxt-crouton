import { describe, it, expect } from 'vitest'
import { generateKeyPairSync, createVerify, type KeyObject } from 'node:crypto'
import { appJwt } from '../src/runtime/server/utils/githubApp'

// Verify an RS256 JWT produced by `appJwt` against the signing key's public half.
// This exercises importPrivateKey (+ the PKCS#1→PKCS#8 wrap) and the WebCrypto
// RSASSA-PKCS1-v1_5 / SHA-256 signature — the load-bearing part of the App mint.
function verifyJwt(jwt: string, publicKey: KeyObject): boolean {
  const [header, payload, sig] = jwt.split('.')
  const signature = Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  return createVerify('RSA-SHA256').update(`${header}.${payload}`).verify(publicKey, signature)
}

function decodeSegment(seg: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(seg.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
}

describe('appJwt', () => {
  it('signs a verifiable RS256 JWT from a PKCS#8 key with the expected claims', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    })

    const jwt = await appJwt('123456', privateKey)
    const [header, payload] = jwt.split('.')

    expect(jwt.split('.')).toHaveLength(3)
    expect(decodeSegment(header)).toMatchObject({ alg: 'RS256', typ: 'JWT' })

    const claims = decodeSegment(payload) as { iss: string, iat: number, exp: number }
    expect(claims.iss).toBe('123456')
    expect(claims.exp).toBeGreaterThan(claims.iat) // ~9 min window
    expect(verifyJwt(jwt, publicKey as unknown as KeyObject)).toBe(true)
  })

  it('accepts a PKCS#1 (BEGIN RSA PRIVATE KEY) key by wrapping it to PKCS#8', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    })
    expect(privateKey).toContain('BEGIN RSA PRIVATE KEY')

    const jwt = await appJwt('123456', privateKey)
    expect(verifyJwt(jwt, publicKey as unknown as KeyObject)).toBe(true)
  })

  it('tolerates a PEM stored with escaped newlines (Worker-secret form)', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    })

    const escaped = privateKey.replace(/\n/g, '\\n')
    const jwt = await appJwt('123456', escaped)
    expect(verifyJwt(jwt, publicKey as unknown as KeyObject)).toBe(true)
  })
})
