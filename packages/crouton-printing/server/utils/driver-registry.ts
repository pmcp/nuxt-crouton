/**
 * @crouton-package crouton-printing
 * @description Output-driver registry for the printing engine
 *
 * A station's `driver` decides HOW a ticket is fulfilled. Routing (items →
 * location → station, kitchen vs receipt) is **driver-agnostic** — only the
 * **encoding** differs. This registry is the single place that maps a driver id
 * to its encoder, so new drivers (`serial`, `usb`, …) slot in by registering
 * here instead of branching through `encodeTicket`.
 *
 * Registered today:
 * - `network-escpos` (default) — base64 ESC/POS bytes for the thermal TCP path
 *   (`formatReceipt`). NULL/undefined driver maps here, so existing stations are
 *   unchanged.
 * - `browser-print` — the canonical `ReceiptData` stored as JSON, which the
 *   browser-print drainer renders to HTML (`renderTicketHtml`) and prints via the
 *   OS / AirPrint dialog.
 */

import { formatReceipt, type ReceiptData } from './receipt-formatter'

/** The driver used when a station has no explicit driver (NULL/undefined). */
export const DEFAULT_DRIVER = 'network-escpos' as const

/**
 * An output driver: turns the canonical `ReceiptData` into the string payload
 * stored on the print-queue row for this station. The encoding is the only
 * thing a driver owns — routing and the `ReceiptData` itself are shared.
 */
export interface OutputDriver {
  /** Stable id stored on `salesPrinters.driver`. */
  id: string
  /** Encode one ticket into the queue-row payload for this driver. */
  encode: (data: ReceiptData) => string
}

const drivers = new Map<string, OutputDriver>()

/** Register (or override) an output driver. Last registration wins. */
export function registerDriver(driver: OutputDriver): void {
  drivers.set(driver.id, driver)
}

/** Look up a driver by id (NULL/undefined ⇒ the default driver). */
export function getDriver(id?: string | null): OutputDriver | undefined {
  return drivers.get(id || DEFAULT_DRIVER)
}

/** True when a driver id is registered (NULL/undefined ⇒ the default driver). */
export function isDriverRegistered(id?: string | null): boolean {
  return drivers.has(id || DEFAULT_DRIVER)
}

/** All registered driver ids — the set routing treats as "drivable". */
export function registeredDriverIds(): string[] {
  return [...drivers.keys()]
}

// --- Built-in drivers ---

// network-escpos (default): base64 ESC/POS bytes for the thermal TCP path.
registerDriver({
  id: 'network-escpos',
  encode: data => formatReceipt(data).base64
})

// browser-print (#127, AirPrint): canonical ReceiptData stored as JSON; the
// browser-print drainer re-renders it to HTML (renderTicketHtml) at read time.
registerDriver({
  id: 'browser-print',
  encode: data => JSON.stringify(data)
})
