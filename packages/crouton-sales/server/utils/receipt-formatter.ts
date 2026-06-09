/**
 * @crouton-package crouton-sales
 * @description ESC/POS thermal receipt formatter for POS systems
 * @opt-in Requires print module to be enabled
 *
 * Self-contained ESC/POS byte builder — no native dependencies.
 *
 * The server never talks to a printer directly; it only produces the base64
 * ESC/POS payload that the on-site spooler (e.g. the RUT956 BusyBox script)
 * streams to the printer's raw TCP port (9100). So we only need to emit the
 * byte stream, not a full driver. This replaces `node-thermal-printer`, which
 * dragged in Workers-incompatible deps (pngjs, iconv-lite, unorm) and crashed
 * the Cloudflare runtime at init.
 *
 * Text is encoded to code page 858 (CP850 + €), selected on the printer with
 * `ESC t 19`. This covers Western-European accents and the € sign.
 */

export interface ReceiptItem {
  name: string
  quantity: number
  price?: number
  notes?: string
  options?: Record<string, unknown>
}

// Only the fields the receipt format actually renders. (Earlier versions
// carried items_section_title/complete_order_header/test_* which nothing used.)
export interface ReceiptSettings {
  special_instructions_title: string
  staff_order_header: string
  footer_text: string
}

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  special_instructions_title: 'SPECIAL INSTRUCTIONS:',
  staff_order_header: '*** STAFF ORDER ***',
  footer_text: 'Thank you for your order!'
}

export interface ReceiptData {
  orderNumber: number | string
  orderId: string
  teamName: string
  eventName: string
  clientName?: string
  /** Name of the logged-in volunteer/helper who took the order. */
  helperName?: string
  orderNotes?: string
  items: ReceiptItem[]
  total?: number
  locationName?: string
  /** Free-text remark for this location, printed on the kitchen ticket only. Not a sales item. */
  locationNote?: string
  printMode: 'kitchen' | 'receipt'
  showPrices: boolean
  createdAt: Date | string
  isPersonnel?: boolean
  receiptSettings?: ReceiptSettings
  /**
   * IANA timezone used to render the order time on the ticket. Cloudflare
   * Workers run in UTC, so without this the printed time is off by the local
   * offset. Defaults to Europe/Brussels.
   */
  timeZone?: string
}

/** Default timezone for rendering receipt timestamps. */
const DEFAULT_TIME_ZONE = 'Europe/Brussels'
const TIME_LOCALE = 'nl-BE'

export interface FormattedReceipt {
  base64: string
  rawBuffer: Buffer
}

const RECEIPT_WIDTH = 48

// ESC/POS control bytes
const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

/**
 * Code page 858 high range: byte 0x80..0xFF -> Unicode code point.
 * CP858 == CP850 with the dotless-i at 0xD5 replaced by € (U+20AC).
 */
const CP858_HIGH = [
  0x00C7, 0x00FC, 0x00E9, 0x00E2, 0x00E4, 0x00E0, 0x00E5, 0x00E7, // 80-87
  0x00EA, 0x00EB, 0x00E8, 0x00EF, 0x00EE, 0x00EC, 0x00C4, 0x00C5, // 88-8F
  0x00C9, 0x00E6, 0x00C6, 0x00F4, 0x00F6, 0x00F2, 0x00FB, 0x00F9, // 90-97
  0x00FF, 0x00D6, 0x00DC, 0x00F8, 0x00A3, 0x00D8, 0x00D7, 0x0192, // 98-9F
  0x00E1, 0x00ED, 0x00F3, 0x00FA, 0x00F1, 0x00D1, 0x00AA, 0x00BA, // A0-A7
  0x00BF, 0x00AE, 0x00AC, 0x00BD, 0x00BC, 0x00A1, 0x00AB, 0x00BB, // A8-AF
  0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x00C1, 0x00C2, 0x00C0, // B0-B7
  0x00A9, 0x2563, 0x2551, 0x2557, 0x255D, 0x00A2, 0x00A5, 0x2510, // B8-BF
  0x2514, 0x2534, 0x252C, 0x251C, 0x2500, 0x253C, 0x00E3, 0x00C3, // C0-C7
  0x255A, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256C, 0x00A4, // C8-CF
  0x00F0, 0x00D0, 0x00CA, 0x00CB, 0x00C8, 0x20AC, 0x00CD, 0x00CE, // D0-D7
  0x00CF, 0x2518, 0x250C, 0x2588, 0x2584, 0x00A6, 0x00CC, 0x2580, // D8-DF
  0x00D3, 0x00DF, 0x00D4, 0x00D2, 0x00F5, 0x00D5, 0x00B5, 0x00FE, // E0-E7
  0x00DE, 0x00DA, 0x00DB, 0x00D9, 0x00FD, 0x00DD, 0x00AF, 0x00B4, // E8-EF
  0x00AD, 0x00B1, 0x2017, 0x00BE, 0x00B6, 0x00A7, 0x00F7, 0x00B8, // F0-F7
  0x00B0, 0x00A8, 0x00B7, 0x00B9, 0x00B3, 0x00B2, 0x25A0, 0x00A0  // F8-FF
]

const UNICODE_TO_CP858: Map<number, number> = (() => {
  const map = new Map<number, number>()
  for (let i = 0; i < CP858_HIGH.length; i++) {
    const cp = CP858_HIGH[i]
    // First mapping wins so canonical Latin-1 chars beat box-drawing aliases
    if (cp !== undefined && !map.has(cp)) map.set(cp, 0x80 + i)
  }
  // OEM glyph for the rightwards arrow used in item notes (matches the old
  // iconv CP437/850 behaviour, which emitted 0x1A for U+2192).
  map.set(0x2192, 0x1A)
  return map
})()

/** Encode a JS string to CP858 bytes; unknown chars fall back to '?'. */
function encodeText(text: string): number[] {
  const out: number[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0x3F
    if (cp < 0x80) {
      out.push(cp)
    }
    else {
      out.push(UNICODE_TO_CP858.get(cp) ?? 0x3F)
    }
  }
  return out
}

/**
 * Minimal ESC/POS command builder covering the subset the receipts use.
 * Initializes the printer (ESC @) and selects CP858 (ESC t 19) up front.
 */
class EscPosBuilder {
  private bytes: number[] = []

  constructor(private readonly width = RECEIPT_WIDTH) {
    this.raw(ESC, 0x40) // ESC @  — initialize
    this.raw(ESC, 0x74, 19) // ESC t 19 — select code page 858
  }

  raw(...b: number[]): this {
    for (const x of b) this.bytes.push(x)
    return this
  }

  alignLeft(): this { return this.raw(ESC, 0x61, 0x00) }
  alignCenter(): this { return this.raw(ESC, 0x61, 0x01) }
  bold(on: boolean): this { return this.raw(ESC, 0x45, on ? 1 : 0) }
  invert(on: boolean): this { return this.raw(GS, 0x42, on ? 1 : 0) }

  print(text: string): this {
    for (const byte of encodeText(text)) this.bytes.push(byte)
    return this
  }

  println(text = ''): this { return this.print(text).raw(LF) }

  drawLine(char = '-'): this { return this.println(char.repeat(this.width)) }

  /** Feed a few lines and perform a full cut. */
  cut(): this { return this.raw(LF, LF, LF, GS, 0x56, 0x00) }

  build(): FormattedReceipt {
    const rawBuffer = Buffer.from(this.bytes)
    return {
      base64: rawBuffer.toString('base64'),
      rawBuffer
    }
  }
}

/**
 * Generate ESC/POS formatted receipt data for thermal printers
 * Returns both Base64 encoded string and raw buffer
 */
export function formatReceipt(data: ReceiptData): FormattedReceipt {
  const printer = new EscPosBuilder()

  try {
    // Header with team and event
    printer.alignCenter()
    printer.bold(true)
    printer.println(data.teamName)
    printer.bold(false)
    printer.println(data.eventName)

    // Location header for kitchen tickets
    if (data.printMode === 'kitchen' && data.locationName) {
      printer.drawLine()
      printer.bold(true)
      printer.println(data.locationName.toUpperCase())
      printer.bold(false)
    }

    printer.drawLine()

    // Order information
    printer.alignLeft()
    printer.bold(true)
    printer.println(`Order #${data.orderNumber}`)
    printer.bold(false)

    const orderDate = typeof data.createdAt === 'string'
      ? new Date(data.createdAt)
      : data.createdAt
    printer.println(`Time: ${orderDate.toLocaleString(TIME_LOCALE, { timeZone: data.timeZone || DEFAULT_TIME_ZONE })}`)

    if (data.helperName) {
      printer.println(`Helper: ${data.helperName}`)
    }

    if (data.clientName) {
      printer.println(`Client: ${data.clientName}`)
    }

    // Staff order indicator
    if (data.isPersonnel) {
      const settings = data.receiptSettings || DEFAULT_RECEIPT_SETTINGS
      printer.println('')
      printer.alignCenter()
      printer.bold(true)
      printer.invert(true)
      printer.println(settings.staff_order_header)
      printer.invert(false)
      printer.bold(false)
      printer.alignLeft()
    }

    // Special instructions at the top for kitchen
    if (data.orderNotes && data.printMode === 'kitchen') {
      const settings = data.receiptSettings || DEFAULT_RECEIPT_SETTINGS
      printer.drawLine()
      printer.bold(true)
      printer.println(settings.special_instructions_title)
      printer.bold(false)
      printer.println(data.orderNotes)
    }

    // Per-location remark for kitchen tickets (prints only on this location's ticket)
    if (data.locationNote && data.printMode === 'kitchen') {
      printer.drawLine()
      printer.bold(true)
      printer.println('REMARK:')
      printer.bold(false)
      printer.println(data.locationNote)
    }

    printer.drawLine()

    // Items section
    if (data.items && data.items.length > 0) {
      const isKitchenTicket = data.printMode === 'kitchen'

      for (const item of data.items) {
        if (isKitchenTicket) {
          // Kitchen format - bold text
          printer.bold(true)
          if (data.showPrices && item.price !== undefined) {
            const itemTotal = item.price * item.quantity
            const itemText = `${item.quantity}x ${item.name}`
            const priceText = `€${itemTotal.toFixed(2)}`
            const padding = RECEIPT_WIDTH - itemText.length - priceText.length
            printer.println(itemText + ' '.repeat(Math.max(1, padding)) + priceText)
          }
          else {
            printer.println(`${item.quantity}x ${item.name}`)
          }
          printer.bold(false)
        }
        else if (data.showPrices && item.price !== undefined) {
          // Receipt format with prices
          printer.bold(true)
          const itemTotal = item.price * item.quantity
          const itemText = `${item.quantity}x ${item.name}`
          const priceText = `€${itemTotal.toFixed(2)}`
          const padding = RECEIPT_WIDTH - itemText.length - priceText.length
          printer.println(itemText + ' '.repeat(Math.max(1, padding)) + priceText)
          printer.bold(false)
        }
        else {
          // Receipt format without prices
          printer.bold(true)
          printer.println(`${item.quantity}x ${item.name}`)
          printer.bold(false)
        }

        // Item options (selected product options)
        if (item.options && Object.keys(item.options).length > 0) {
          for (const [optionName, optionValue] of Object.entries(item.options)) {
            if (optionValue) {
              // Format option value - could be string, boolean, or object with label/price
              let displayValue = ''
              if (typeof optionValue === 'object' && optionValue !== null && 'label' in optionValue) {
                const optionObj = optionValue as { label: string, price?: number }
                displayValue = optionObj.label
                if (optionObj.price) {
                  displayValue += ` (+€${Number(optionObj.price).toFixed(2)})`
                }
              }
              else if (typeof optionValue === 'boolean') {
                displayValue = optionValue ? 'Yes' : 'No'
              }
              else {
                displayValue = String(optionValue)
              }
              if (optionName === displayValue) {
                printer.println(`  + ${displayValue}`)
              }
              else {
                printer.println(`  + ${optionName}: ${displayValue}`)
              }
            }
          }
        }

        // Item notes/modifications
        if (item.notes) {
          printer.println(`  → ${item.notes}`)
        }

        printer.println('')
      }
    }

    // Special instructions at bottom for receipts
    if (data.orderNotes && data.printMode === 'receipt') {
      printer.drawLine()
      printer.bold(true)
      printer.println('NOTES:')
      printer.bold(false)
      printer.println(data.orderNotes)
    }

    // Total for receipts with prices
    if (data.printMode === 'receipt' && data.showPrices && data.total !== undefined) {
      printer.drawLine()
      printer.alignLeft()

      const totalLabel = 'TOTAL:'
      const totalAmount = `€${data.total.toFixed(2)}`
      const totalPadding = RECEIPT_WIDTH - totalLabel.length - totalAmount.length

      printer.bold(true)
      printer.println(totalLabel + ' '.repeat(Math.max(1, totalPadding)) + totalAmount)
      printer.bold(false)
    }

    // Footer
    printer.drawLine()

    if (data.printMode === 'receipt') {
      const settings = data.receiptSettings || DEFAULT_RECEIPT_SETTINGS
      printer.alignCenter()
      printer.println(settings.footer_text)
    }

    // Extra spacing and cut
    printer.println('')
    printer.println('')
    printer.cut()

    return printer.build()
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error formatting receipt:', error)
    throw new Error(`Failed to format receipt: ${message}`)
  }
}

/**
 * Generate a test receipt for printer testing
 */
export function formatTestReceipt(
  printerName: string,
  ipAddress: string,
  timeZone: string = DEFAULT_TIME_ZONE
): FormattedReceipt {
  const printer = new EscPosBuilder()

  printer.alignCenter()
  printer.bold(true)
  printer.println('PRINTER TEST')
  printer.bold(false)
  printer.drawLine()

  printer.alignLeft()
  printer.println(`Printer: ${printerName}`)
  printer.println(`IP: ${ipAddress}`)
  printer.println(`Time: ${new Date().toLocaleString(TIME_LOCALE, { timeZone })}`)
  printer.drawLine()

  printer.alignCenter()
  printer.println('Test completed successfully!')
  printer.println('ESC/POS formatting active')
  printer.println('')
  printer.cut()

  return printer.build()
}