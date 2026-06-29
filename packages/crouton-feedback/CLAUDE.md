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

🚧 **Annotate + sink dispatcher landed (WS3 / #963).** Both tools (Console +
Annotate) work; a sent annotation is dispatched to a pluggable sink — the
**webhook** sink ships now (verified end-to-end against a real URL). Workstreams:

| Issue | Brings in | State |
|-------|-----------|-------|
| [#962](https://github.com/FriendlyInternet/nuxt-crouton/issues/962) | Launcher + tool registry + mount + Console (eruda) | ✅ |
| [#963](https://github.com/FriendlyInternet/nuxt-crouton/issues/963) | `FeedbackSink` dispatcher + Annotate + source-stamp transform (webhook sink) | ✅ |
| [#964](https://github.com/FriendlyInternet/nuxt-crouton/issues/964) | The slack / discord / github sinks — test-first (#774) | ⏳ |
| [#965](https://github.com/FriendlyInternet/nuxt-crouton/issues/965) | Module-option + env config surface for sink selection | ⏳ |

**Gating:** the launcher + tools register only in local dev or when a build sets
`NUXT_PUBLIC_CROUTON_FEEDBACK=true` (→ `runtimeConfig.public.croutonFeedback`);
the client plugins re-check at runtime, so production ships nothing. The
source-stamp transform + `/api/_feedback` handler register under the same gate.

## Feedback flow (Annotate → sink)

```
Annotate tool → click element → useAnnotate.buildAnnotation()  (capture.ts, pure)
  → POST /api/_feedback         (server/api/feedback.post.ts — the dispatcher)
    → formatAnnotationMarkdown() + resolveSink(config.sink)
      → webhook sink            (server/sinks/webhook.ts — POST {annotation, markdown})
```

A click resolves to its source file via the nearest `data-feedback-src` ancestor,
stamped at build time by the compiler transform (`transform/sourceStamp.ts`). The
sink is chosen by `croutonFeedback.sink` (env `NUXT_CROUTON_FEEDBACK_SINK`); the
webhook destination is `NUXT_CROUTON_FEEDBACK_WEBHOOK_URL`. Credentials/URLs stay
in **server** `runtimeConfig.croutonFeedback`, never the client bundle.

## Key Files

| File | Purpose |
|------|---------|
| `src/module.ts` | Nuxt module entry — `configKey: croutonFeedback`; registers the launcher + Console plugins under the gate. |
| `src/runtime/composables/useFeedbackTools.ts` | Tool **registry** — `registerTool()` + reactive `tools`/`toggle` the launcher reads. Unit-tested. |
| `src/runtime/components/FeedbackLauncher.vue` | The glasses launcher — Nuxt UI `UPopover` of toggleable tool rows. |
| `src/runtime/overlay/mount.ts` | `mountOverlayInBody()` — appContext-mount helper (launcher + future overlays). |
| `src/runtime/tools/console.ts` | **Console** tool factory — eruda, lazy-loaded on toggle; injectable loader (unit-tested). |
| `src/runtime/tools/annotate.ts` | **Annotate** tool factory — maps activate/deactivate → select-mode start/stop. |
| `src/runtime/composables/useAnnotate.ts` | Annotate state + DOM select/highlight + POST to `/api/_feedback`. |
| `src/runtime/components/AnnotateOverlay.vue` | Annotate overlay — highlight + Nuxt UI comment panel. |
| `src/runtime/overlay/capture.ts` | Pure capture helpers + `formatAnnotationMarkdown` (selector / source-file / Markdown). Unit-tested. |
| `src/runtime/transform/sourceStamp.ts` | Build-time `data-feedback-src` stamper (compiler transform). Unit-tested. |
| `src/runtime/server/api/feedback.post.ts` | `POST /api/_feedback` → validates + dispatches to the configured sink. |
| `src/runtime/server/sinks/` | `types.ts` (`FeedbackSink` interface), `webhook.ts` (the webhook sink), `index.ts` (`resolveSink`). |
| `src/runtime/plugins/feedback.client.ts` | Mounts the launcher into the host app's `<body>` context. |
| `src/runtime/plugins/tools/console.client.ts` · `annotate.client.ts` | Register the two tools (Annotate also mounts its overlay). |
| `module.mjs` | Build-less dev entry (re-exports `src/module.ts`). |
| `build.config.ts` | unbuild config — module entry + per-dir mkdist runtime entries. |
| `playground/` | Plain Nuxt UI app (no crouton-core) that installs the module + wires Nuxt UI CSS. |

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
