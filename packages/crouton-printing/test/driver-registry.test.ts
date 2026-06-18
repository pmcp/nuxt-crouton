import { describe, it, expect } from 'vitest'
import {
  DEFAULT_DRIVER,
  getDriver,
  isDriverRegistered,
  registerDriver,
  registeredDriverIds
} from '../server/utils/driver-registry'
import type { ReceiptData } from '../server/utils/receipt-formatter'

const sampleData = { orderNumber: '1', orderId: 'o1', teamName: 't', eventName: 'e', items: [], printMode: 'receipt', showPrices: true, createdAt: new Date() } as unknown as ReceiptData

describe('driver registry', () => {
  it('registers the two built-in drivers on import', () => {
    const ids = registeredDriverIds()
    expect(ids).toContain('network-escpos')
    expect(ids).toContain('browser-print')
  })

  it('treats NULL/undefined as the default driver', () => {
    expect(DEFAULT_DRIVER).toBe('network-escpos')
    expect(isDriverRegistered(undefined)).toBe(true)
    expect(isDriverRegistered(null)).toBe(true)
    expect(getDriver(undefined)?.id).toBe('network-escpos')
  })

  it('reports an unknown driver as not registered', () => {
    expect(isDriverRegistered('serial-xyz')).toBe(false)
    expect(getDriver('serial-xyz')).toBeUndefined()
  })

  it('network-escpos encodes to base64, browser-print to JSON', () => {
    const escpos = getDriver('network-escpos')!.encode(sampleData)
    const browser = getDriver('browser-print')!.encode(sampleData)
    // base64 ESC/POS is not valid JSON; browser-print is the canonical JSON.
    expect(() => JSON.parse(browser)).not.toThrow()
    expect(JSON.parse(browser).orderId).toBe('o1')
    expect(() => JSON.parse(escpos)).toThrow()
  })

  it('lets a new driver slot in via registerDriver (serial/usb extension point)', () => {
    registerDriver({ id: 'serial-test', encode: () => 'SERIAL' })
    expect(isDriverRegistered('serial-test')).toBe(true)
    expect(getDriver('serial-test')!.encode(sampleData)).toBe('SERIAL')
  })
})
