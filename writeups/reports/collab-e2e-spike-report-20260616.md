# Spike report — e2e coverage for `@fyit/crouton-collab` (#210)

**Date:** 2026-06-16
**Epic:** #204 (harden the e2e fixture harness)
**Outcome:** Ship single-client mount coverage. Two-client realtime assertion **deferred** (rationale below).

## The question

`@fyit/crouton-collab` is the hardest surface to smoke: realtime/Yjs over
WebSockets, normally needing two clients to prove anything. The spike's job was
to find the *minimum* that proves the package boots and its UI mounts, and to
decide whether a two-context test earns its complexity.

## What shipped (Step 1 — the issue's bar)

A new `fixtures/with-collab` (cloned from `minimal`, extends
`@fyit/crouton-collab`) with:

- The generic `items` collection → boot + full CRUD + invalid-submit, same as
  every fixture.
- `app/pages/admin/[team]/collab-check.vue`: a **single-client** mount of the
  realtime stack. `useCollabSync({ roomType: 'generic', structure: 'map' })`
  opens a real WebSocket room (client-only via `tryOnMounted`, SSR-safe) and
  `CollabStatus` renders its live connection state.
- A manifest `surface` asserting `[data-testid='collab-check'] .collab-status-dot`
  is visible.

Local run (chromium, cold dev server): **5/5 green**, the collab surface in 3.8s.

### Why this is enough to catch regressions

Mounting `useCollabSync` + `CollabStatus` exercises, on a single client:

- the collab layer loading (auto-imported components/composables/plugins),
- `nitro.experimental.websocket` being enabled and the local
  `/api/collab/[roomId]/ws` crossws route booting,
- the realtime composable chain (`useCollabSync` → `useCollabConnection` → Yjs)
  initialising without throwing.

A scaffolder/boot regression in any of those fails the surface. That's the same
"does the package's own UI actually mount" guarantee the other fixtures give.

### Why the assertion is robust (not flaky)

The status dot renders for **any** connection state (synced/syncing/
disconnected/error). The local WS handler rejects a connection without a
team-scoped session (close `4401`), so single-client `connected` may stay
false — but the dot still renders, so the assertion does **not** depend on a
live realtime connection. No realtime timing → no flake. Because of this it was
safe to add `with-collab` to the CI matrix.

## What was deferred (Step 2 — two-client)

A two-`browser.newContext()` test (client A mutates → client B observes via the
WS broadcast) was **not** added. Rationale:

- **Local broadcast is feasible** — the dev WS handler keeps an in-process
  `rooms` Map with a `peers` Set, so two clients in the same room would
  broadcast to each other in one Nitro process. So it *could* be written.
- **But its cost/flake profile is bad for a smoke.** It would assert on realtime
  propagation *timing* across two contexts, layered on top of the harness's
  already-cold on-demand route compiles (25–35s/route) and the WS auth/reconnect
  backoff. That's exactly the kind of timing-dependent assertion the epic's
  guidance warns against — a fragile test that goes red for reasons unrelated to
  the thing under test.
- **Marginal extra signal.** Single-client mount already catches the realistic
  regressions (package fails to boot, scaffolder emits broken code, the WS route
  disappears). Two-client mainly re-tests Yjs/crossws themselves, which aren't
  ours to regress.

**Recommendation:** keep Step 1. Revisit a two-client test only if a real
cross-client sync regression slips through single-client mount — and if so,
write it as a dedicated, generously-timed spec (not a manifest surface), gated
so its flakiness can't block unrelated fixtures.
