import { describe, it, expect } from 'vitest'
import { classifyStatus } from '../server/utils/escpos-drainer'

// classifyStatus reads the first three DLE-EOT response bytes. A valid "online,
// paper present" reply has (b1 & 0x93) === 0x12 with no fault bits set.
const NO_RESPONSE = 'no response'

describe('classifyStatus', () => {
  it('returns the no-response message when the printer never answered', () => {
    expect(classifyStatus([], NO_RESPONSE)).toBe(NO_RESPONSE)
  })

  it('flags a reply that is not a valid ESC/POS status byte', () => {
    // (0x00 & 0x93) !== 0x12
    expect(classifyStatus([0x00, 0x00, 0x00], NO_RESPONSE)).toMatch(/not an ESC\/POS printer/)
  })

  it('passes a healthy online printer (empty string)', () => {
    expect(classifyStatus([0x12, 0x12, 0x12], NO_RESPONSE)).toBe('')
  })

  it('detects cover open (b2 & 0x04)', () => {
    expect(classifyStatus([0x12, 0x16, 0x12], NO_RESPONSE)).toBe('Cover open')
  })

  it('detects paper out (b3 & 0x60)', () => {
    expect(classifyStatus([0x12, 0x12, 0x72], NO_RESPONSE)).toBe('Paper out')
  })

  it('detects a generic printer error (b2 & 0x40, no cover/paper bits)', () => {
    expect(classifyStatus([0x12, 0x52, 0x12], NO_RESPONSE)).toBe('Printer error')
  })

  it('detects offline (b1 & 0x08, still a valid status byte)', () => {
    expect(classifyStatus([0x1a, 0x12, 0x12], NO_RESPONSE)).toBe('Printer offline')
  })
})
