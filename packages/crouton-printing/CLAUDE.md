# CLAUDE.md - @fyit/crouton-printing

## Package Purpose

**On-site physical print delivery** for Nuxt Crouton — the plumbing that actually
*delivers bytes to a physical printer* at the venue. Extracted from
`@fyit/crouton-sales` (epic #325, #328) so any package that hands a job to the
print queue can have it printed by the shared transport.

This is **transport only**. It does NOT own the print *engine* (ticket
formatting / queue lifecycle) — that stays in `@fyit/crouton-sales`
(`receipt-formatter.ts`, `print-job-complete.ts`, `print-queue-service.ts`). This
package imports those via the `@fyit/crouton-sales/server/utils/*` package
exports and converges on the **same `salesPrintqueues` lifecycle + order LEDs**.

**OFF by default and Workers-safe.** Nothing runs unless explicitly env-gated;
`node:net` is imported lazily so merely loading the module pulls no Node builtin
(the layer is import-safe on Cloudflare Workers).

## Layout

This is an **addon layer** — extend it alongside the package that owns the print
engine + queue (today: `crouton-sales`):

```ts
extends: ['@fyit/crouton-core', '@fyit/crouton-sales', '@fyit/crouton-printing', './layers/sales']
```

Nuxt's layer mechanism auto-registers this layer's `server/{api,plugins,utils}`
in the consuming app's Nitro (no extra config). The transport reads/writes the
generated `sales` layer's `salesPrintqueues` / `salesPrinters` tables (lazy /
direct `~~/layers/sales/...` imports — app-resolved, same as crouton-sales).

## Key Files

| File | Purpose |
|------|---------|
| `server/utils/escpos-drainer.ts` | In-process TCP `:9100` ESC/POS drainer (venue/self-host Node profile). `node:net` lazy-imported inside `exchange()`. DLE-EOT pre-flight → send + confirmation pass → `classifyStatus` → `completePrintJob`/`failPrintJob` (shared lifecycle from crouton-sales, no HTTP callback). Faithful port of the RUT956 spooler script. |
| `server/plugins/escpos-drainer.ts` | Nitro plugin running the drainer poll loop. **Gated by `CROUTON_SALES_PRINT_DRAINER`** (`_EVENT`, `_POLL_MS` optional) — OFF by default + on Cloudflare. Non-overlapping ticks. |
| `server/utils/print-server-auth.ts` | `requirePrintServerKey` — `x-api-key` auth for `/api/print-server/*`, validated against `runtimeConfig.croutonSales.printApiKey` (default `'1234'`; override `NUXT_CROUTON_SALES_PRINT_API_KEY`). The runtimeConfig key is still set by crouton-sales. |
| `server/api/print-server/events/[eventId]/jobs.get.ts` | HTTP spooler poll: pending `network-escpos` jobs joined with printer IP; `?mark_as_printing=true` flips pending→printing atomically. |
| `server/api/print-server/jobs/[jobId]/complete.post.ts` | Spooler callback → completed (+ order auto-complete). Inline copy (byte-for-byte behavior is load-bearing for the RUT956 spooler — deliberately NOT routed through the shared util). |
| `server/api/print-server/jobs/[jobId]/fail.post.ts` | Spooler callback → failed (+ order `print_failed`). Inline copy, same reason. |
| `server/api/crouton-sales/events/[eventId]/browser-print-jobs/index.get.ts` | Browser-print (AirPrint) drainer read model (#127): pending `browser-print` jobs server-rendered to HTML via `renderTicketHtml` (from crouton-sales). |
| `server/api/crouton-sales/events/[eventId]/browser-print-jobs/[jobId]/done.post.ts` | Browser-print callback → completed (shared `completePrintJob`). |
| `server/api/crouton-sales/events/[eventId]/browser-print-jobs/[jobId]/fail.post.ts` | Browser-print callback → failed (shared `failPrintJob`). |
| `print-server/teltonika-simple-spooler-fast.sh` | RUT956 BusyBox spooler — polls the HTTP endpoints over the LAN, streams ESC/POS to TCP `:9100`, calls back. Pure-awk base64 decoder (BusyBox has no `base64` applet). |
| `print-server/print_server.init` | BusyBox init service to boot the spooler. |
| `print-server/README.md` | RUT956 spooler setup guide (validated on a RUT956 over 5G). |

## Profiles (pick one per printer set, never both)

- **HTTP spooler** (cloud profile / Workers): the RUT956 shell spooler polls
  `/api/print-server/*` and prints. The only option on Cloudflare (no raw sockets).
- **In-process drainer** (venue/self-host Node profile): a Pi/mini-PC on the
  venue LAN opens TCP `:9100` itself — no external spooler. Enable with
  `CROUTON_SALES_PRINT_DRAINER`.
- **Browser-print** (#127, AirPrint): a browser screen (`printBridgeBlock` in
  crouton-sales) drains `browser-print-jobs`, prints via `window.print()`, and
  POSTs done/fail. Works in any profile.

## Env Gates (unchanged from crouton-sales — stable names)

| Var | Effect |
|-----|--------|
| `CROUTON_SALES_PRINT_DRAINER` | `'1'`/`'true'` → start the in-process drainer (else idle). |
| `CROUTON_SALES_PRINT_DRAINER_EVENT` | Optional: only drain this event. |
| `CROUTON_SALES_PRINT_DRAINER_POLL_MS` | Poll interval (default 2000). |
| `NUXT_CROUTON_SALES_PRINT_API_KEY` | Overrides the `x-api-key` for `/api/print-server/*` (default `'1234'`). |

The `CROUTON_SALES_*` prefix is kept deliberately for backward compatibility
(no behaviour change on existing deploys — see #328). A future rename would alias
old→new.

## Dependencies

- **Peer deps**: `@fyit/crouton-core`, `@fyit/crouton-sales` (the print engine +
  queue this transport drives), `nuxt ^4`.
- **Runtime deps**: none. Workers-safe (`node:net` lazy-imported).

## Testing

```bash
pnpm -r --filter './apps/*' typecheck   # MANDATORY
pnpm build                              # unbuild (server/utils → dist)
```

Functional check: on a Node target with `CROUTON_SALES_PRINT_DRAINER=1` (or the
RUT956 spooler pointed at the endpoints), enqueue a job → confirm it prints to a
real/emulated `:9100` printer and flips to **completed**; a printer that's off
flips it to **failed**. With the gates unset (default/Workers), nothing runs and
the app boots clean.
