# @fyit/crouton-printing

Domain-agnostic **printing** layer for Nuxt Crouton. A shared print-job queue,
ESC/POS engine, output drivers, and on-site transport that any package can print
through — so `crouton-sales`, `crouton-bookings`, and friends don't each
reinvent (or depend on each other for) printing.

> Extracted from `crouton-sales` (epic #325). This package owns *how things get
> printed*; domain packages own *what* to print.

## What's here

- **A generic print-job queue** — `printers` + `print_jobs` tables (package-owned
  infra, NuxtHub-discovered). Jobs carry an opaque `payload`, a `driver`, and a
  `source` + `refType`/`refId` back-reference, so multiple domains share one queue
  without this package knowing what an "order" or "booking" is.
- **`enqueuePrintJob(db, …)`** — the one entry point a domain calls to print.
- *(landing across epic #325)* the ESC/POS engine + driver registry (#327), the
  on-site transport: spooler endpoints + drainer + RUT956 script (#328), and
  job-lifecycle hooks (#329).

## Usage

Extend it as a layer (before the domain layers that print):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@fyit/crouton-core', '@fyit/crouton-printing', '@fyit/crouton-sales']
})
```

Then, from any server route in a consuming domain, render your ticket and enqueue:

```ts
const jobId = await enqueuePrintJob(db, {
  source: 'bookings',
  printerId,
  driver: 'network-escpos',
  payload,                 // opaque: base64 ESC/POS, or JSON for browser-print
  refType: 'booking',
  refId: bookingId,
  eventId, teamId
})
```

## Status codes

`PRINT_STATUS` — `'0'` pending · `'1'` printing · `'2'` done · `'9'` error
(text, matching the on-site spooler contract).

## License

MIT
