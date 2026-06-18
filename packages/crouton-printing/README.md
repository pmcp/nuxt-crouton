# @fyit/crouton-printing

Shared **printing engine** for Nuxt Crouton: a self-contained ESC/POS thermal
receipt formatter (CP858) and a pluggable **output-driver registry** behind
`encodeTicket(payload, driver)`.

This is the domain-neutral "turn a receipt into printer bytes / pick the right
driver" code, lifted out of `@fyit/crouton-sales` so it can be shared. It has
**zero runtime dependencies** and is import-safe on the Cloudflare Workers
runtime (no `node-thermal-printer`, no `node:net` at import time).

## What's here

| File | Purpose |
|------|---------|
| `server/utils/receipt-formatter.ts` | ESC/POS byte builder (`formatReceipt`), the HTML sibling (`renderTicketHtml`), `formatTestReceipt`, the canonical `ReceiptData`/`ReceiptItem`/`ReceiptSettings` types + `DEFAULT_RECEIPT_SETTINGS`. CP858 encoding via `ESC t 19` (Western-European accents + €). |
| `server/utils/driver-registry.ts` | The output-driver registry: `registerDriver`, `getDriver`, `isDriverRegistered`, `registeredDriverIds`, `DEFAULT_DRIVER`. Ships `network-escpos` (base64 ESC/POS) + `browser-print` (JSON) — `serial`/`usb` slot in by registering here. |
| `server/utils/print-queue-service.ts` | `encodeTicket(data, driver)` (driver-registry-backed), `PRINT_STATUS`, `receiptCurrencySymbol`, routing (`generatePrintJobsForOrder`, `groupItemsByLocation`, …) and the print-job types. |
| `schemas/printers.json`, `schemas/printQueues.json` | Crouton generate schemas for the printer + print-queue collections. |

## Output drivers

A station's `driver` decides **how** a ticket is fulfilled. Routing (items →
location → station, kitchen vs receipt) is **driver-agnostic** — only the
**encoding** differs, via `encodeTicket(receiptData, driver)`:

- **`network-escpos`** (default; NULL/undefined maps here) — base64 ESC/POS bytes
  for the thermal TCP path (`formatReceipt`).
- **`browser-print`** — the canonical `ReceiptData` stored as JSON; the
  browser-print drainer re-renders it to HTML (`renderTicketHtml`) and prints it
  through the OS / AirPrint dialog.

New drivers (`serial`, `usb`, …) register with `registerDriver({ id, encode })`
and become "drivable" automatically (`generatePrintJobsForOrder` routes to any
registered driver; unregistered drivers produce no jobs).

## Usage

```ts
import { encodeTicket, PRINT_STATUS } from '@fyit/crouton-printing/server/utils/print-queue-service'
import { formatReceipt } from '@fyit/crouton-printing/server/utils/receipt-formatter'
```
