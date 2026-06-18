# CLAUDE.md - @fyit/crouton-printing

## Package Purpose

The **shared printing engine** for Nuxt Crouton — the domain-neutral "turn a
receipt into printer bytes / pick the right output driver" code, extracted from
`@fyit/crouton-sales` (epic #325, issue #327) so any package can reuse it.

**Zero runtime dependencies.** Import-safe on Cloudflare Workers: the formatter
is a hand-rolled ESC/POS byte builder (no `node-thermal-printer`, which dragged
in Workers-incompatible deps); nothing imports `node:net` at module load.

## Key Files

| File | Purpose |
|------|---------|
| `server/utils/receipt-formatter.ts` | ESC/POS byte builder (`formatReceipt` → `{ base64, rawBuffer }`), the HTML sibling encoder `renderTicketHtml` (browser-print / AirPrint), `formatTestReceipt`, and the canonical `ReceiptData` / `ReceiptItem` / `ReceiptSettings` types + `DEFAULT_RECEIPT_SETTINGS`. CP858 (CP850 + €) selected on the printer via `ESC t 19`. Renders ticket time with an explicit IANA timezone (`ReceiptData.timeZone`, default `Europe/Brussels`) because CF Workers run in UTC. Fixed labels per locale (`ReceiptData.locale`: en/nl/fr, default nl). |
| `server/utils/driver-registry.ts` | The **output-driver registry**: `registerDriver`, `getDriver`, `isDriverRegistered`, `registeredDriverIds`, `DEFAULT_DRIVER` (`'network-escpos'`). Ships two built-in drivers — `network-escpos` (base64 ESC/POS) and `browser-print` (canonical `ReceiptData` as JSON). `serial`/`usb` slot in by calling `registerDriver` — no `encodeTicket` branching. |
| `server/utils/print-queue-service.ts` | `encodeTicket(data, driver)` (driver-registry-backed; NULL/undefined ⇒ default; unregistered ⇒ default encoder), `PRINT_STATUS`, `receiptCurrencySymbol`, the print-job routing (`generatePrintJobsForOrder`, `groupItemsByLocation`, `generateKitchenTicketData`, `generateReceiptData`) and the `PrinterConfig` / `PrintJobData` / `OrderItemForPrint` / `PrintQueueGeneratorOptions` types. Re-exports the registry surface for one-import use. |
| `schemas/printers.json` | Crouton-generate schema for the printers collection. |
| `schemas/printQueues.json` | Crouton-generate schema for the print-queue collection. |
| `test/receipt-formatter.test.ts` | Vitest snapshot of `formatReceipt(...).base64` (customer receipt + kitchen ticket, with accents/€/options on a fixed instant+timezone) — the **byte-for-byte** guard — plus `encodeTicket` driver-routing assertions. |

## Output drivers (the registry abstraction)

A station's `driver` decides **how** a ticket is fulfilled. Routing (items →
location → station, kitchen vs receipt) is **driver-agnostic** — only the
**encoding** differs, via `encodeTicket(receiptData, driver)`:

- **`network-escpos`** (default; NULL/undefined maps here) — base64 ESC/POS bytes
  for the thermal TCP path (`formatReceipt`).
- **`browser-print`** (#127, AirPrint) — the canonical `ReceiptData` stored as
  JSON; the browser-print drainer re-renders it to HTML (`renderTicketHtml`) and
  prints via the OS / AirPrint dialog.

`generatePrintJobsForOrder` treats **any registered driver** as drivable
(`isDriverRegistered`); a station on an unregistered driver yields no jobs
(forward-compatible). This preserves the pre-registry behaviour exactly (the two
registered drivers are `network-escpos` + `browser-print`).

## Consumers

`@fyit/crouton-sales` re-exports the moved symbols from its old
`server/utils/{receipt-formatter,print-queue-service}.ts` paths as **thin
shims** (so its endpoints keep their relative imports). Those shims are slated
for removal in the sales-migration issue (#325/5); new code should import from
`@fyit/crouton-printing/server/utils/*` directly. Sales-specific glue
(`generate-print-queues.ts`, which does the DB inserts + cloud-sync capture)
stays in crouton-sales.

## Testing

```bash
pnpm --filter @fyit/crouton-printing test   # vitest snapshot + driver-routing
```
