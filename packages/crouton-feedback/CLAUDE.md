# CLAUDE.md — @fyit/crouton-feedback

> Folder-specific notes only. For workflow / commit / issue conventions, defer to
> the root `CLAUDE.md` (#507) — don't restate them here.

## Package Purpose

A **drop-in in-page feedback toolkit for any Nuxt + Nuxt UI 4 app** — no
crouton-core dependency. One neutral **glasses** launcher (bottom-right) opens a
dropdown of toggleable tools:

- **Console** — [eruda](https://github.com/liriliri/eruda), a mobile in-page
  devtools console, lazy-loaded on first toggle.
- **Annotate** — pin a comment on any page element; on send it builds a
  structured annotation and POSTs it to a **pluggable feedback sink** (webhook /
  Slack / Discord / GitHub), chosen by config.

This package was extracted from `@fyit/crouton-devtools` (epic
[#960](https://github.com/FriendlyInternet/nuxt-crouton/issues/960)) so the
toolkit is usable outside crouton; `@fyit/crouton-devtools` now consumes it and
adds its crouton-specific tabs on top.

## Status

🚧 **Scaffold (WS1 / #961).** The module shell, playground, and docs exist; no
runtime code is wired yet. Incoming workstreams:

| Issue | Brings in |
|-------|-----------|
| [#962](https://github.com/FriendlyInternet/nuxt-crouton/issues/962) | Launcher + tool registry + mount + Console (eruda) |
| [#963](https://github.com/FriendlyInternet/nuxt-crouton/issues/963) | `FeedbackSink` dispatcher + Annotate + source-stamp transform |
| [#964](https://github.com/FriendlyInternet/nuxt-crouton/issues/964) | The three built-in sinks (webhook / Slack-Discord / GitHub) — test-first (#774) |
| [#965](https://github.com/FriendlyInternet/nuxt-crouton/issues/965) | Module-option + env config surface for sink selection |

## Key Files

| File | Purpose |
|------|---------|
| `src/module.ts` | Nuxt module entry — `configKey: croutonFeedback`. Skeleton until #962. |
| `module.mjs` | Build-less dev entry (re-exports `src/module.ts`). |
| `build.config.ts` | unbuild config — module entry now; runtime entries added per workstream. |
| `playground/` | Plain Nuxt UI app (no crouton-core) that installs the module. |

## Boundaries (what stays OUT of this package)

- **No `@fyit/crouton-core` dependency.** Peer deps are only `nuxt` + `@nuxt/ui`.
- **No DevTools-tab / collections / operations / events code** — that is
  crouton-specific and stays in `@fyit/crouton-devtools`.
- Identifiers are neutral (no `Crouton*` prefixes in moved code) so the module
  reads as a standalone library.

## Development

```bash
pnpm --filter @fyit/crouton-feedback build      # unbuild → dist/
cd packages/crouton-feedback/playground && pnpm dev   # boot the demo app
```
