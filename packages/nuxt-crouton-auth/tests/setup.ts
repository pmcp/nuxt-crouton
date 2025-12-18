import { vi } from 'vitest'

// Mock window object for browser APIs
Object.defineProperty(globalThis, 'window', {
  value: {
    location: {
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000',
    },
  },
  writable: true,
})

// Mock PublicKeyCredential for WebAuthn tests
const MockPublicKeyCredential = {
  isConditionalMediationAvailable: vi.fn().mockImplementation(async () => true),
}

Object.defineProperty(globalThis, 'PublicKeyCredential', {
  value: MockPublicKeyCredential,
  writable: true,
  configurable: true,
})

// Mock navigator.credentials for WebAuthn tests
Object.defineProperty(globalThis, 'navigator', {
  value: {
    credentials: {
      create: vi.fn(),
      get: vi.fn(),
    },
  },
  writable: true,
})

// Mock import.meta.server for SSR checks
Object.defineProperty(import.meta, 'server', {
  value: false,
  writable: true,
  configurable: true,
})
