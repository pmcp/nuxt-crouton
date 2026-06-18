# CLAUDE.md - @fyit/crouton-printing

## Package Purpose

Domain-agnostic **printing** layer for Nuxt Crouton. Provides a shared print-job
queue, the ESC/POS engine, output drivers, and the on-site transport that any
domain package (`crouton-sales`, `crouton-bookings`, …) prints through.

This package owns **how things get printed**; domain packages own **what** to
print. It deliberately knows nothing about orders or bookings — the domain is
carried by a `source` discriminator and an opaque `refType`/`refId`
back-reference, and the ticket content is an opaque `payload`.

> Extracted from `crouton-sales` (epic #325). The forcing function: a second
> consumer (`crouton-bookings`) wanted to print without depending on the whole
> POS. See the epic for the full rationale and the split boundary (cloud-sync /
> Pi-mirror stays in `crouton-sales` — it is NOT here).

## Architecture (the seam)

```
domain package (sales / bookings)         crouton-printing
  render order/booking → payload  ──────▶  enqueuePrintJob(db, …)  → print_jobs
  subscribe to job lifecycle hooks ◀─────  transport drains + delivers, emits hooks
```

- **Generic job table + opaque payload** is the core invariant. Never leak a
  domain type (order/booking) into this package.
- **Dependency direction:** `crouton-printing` depends only on `crouton-core`.
  `crouton-sales` / `crouton-bookings` depend on `crouton-printing`. Never the
  reverse — if you need to react to a job finishing, use the lifecycle hook
  (#329), don't import a domain util.

## Key Files

| File | Purpose |
|------|---------|
| `server/database/schema.ts` | Package-owned `printers` + `print_jobs` tables (generic; opaque payload + `source`/`refType`/`refId`). The crouton-flow infra-table pattern — NOT `crouton config`. |
| `server/db/schema.ts` | Re-export so NuxtHub auto-discovers the tables in `db:generate`. |
| `server/utils/print-job-queue.ts` | The queue API: `enqueuePrintJob` / `enqueuePrintJobs` + `PRINT_STATUS`. Auto-imported into the merged nitro context. `db` is passed in by the caller (decoupled from any one db util). |
| `crouton.manifest.ts` | Registers as the `printing` croutonApp (`hasApp('printing')`). |
| `app/app.config.ts` | `croutonApps.printing` registration (headless — no admin routes of its own). |

## Status codes

`PRINT_STATUS` — text values matching the on-site spooler contract:
`'0'` PENDING · `'1'` PRINTING · `'2'` COMPLETED · `'9'` FAILED.

## Common Tasks

### Print something from a domain package
1. Render your ticket to an opaque `payload` (the engine helps — #327).
2. `await enqueuePrintJob(db, { source, printerId, driver, payload, refType, refId, eventId, teamId })`.
3. React to completion via the job-lifecycle hook (#329), not by polling a domain table.

### Add a new printer driver
Register it in the driver registry (#327, `print-queue-service`) — `network-escpos`
and `browser-print` ship today; `serial`/`usb` are the intended future additions.
A driver that needs a Workers-incompatible native dep belongs in its own optional
add-on, not here (keep this layer Workers-safe; Node-only transport stays
env-gated).

## Roadmap (epic #325)

- #326 ✅ scaffold + generic queue (`enqueuePrintJob`)
- #327 move the engine (ESC/POS formatter + driver registry)
- #328 move the transport (spooler endpoints + drainer + RUT956 script)
- #329 lifecycle hooks + invert the sales sync coupling
- #330 migrate `crouton-sales` to consume this
- #331 data migration (`salesPrinters`/`salesPrintqueues` → generic tables)
- #332 bookings print flow (proves the second consumer)

## Testing

```bash
pnpm --filter @fyit/crouton-printing build   # unbuild the server utils
pnpm -r --filter './apps/*' typecheck        # never `npx nuxt typecheck` from root
```
