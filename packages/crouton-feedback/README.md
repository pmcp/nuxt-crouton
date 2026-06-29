# @fyit/crouton-feedback

> 🚧 **Early scaffold** — the runtime tools land across epic
> [#960](https://github.com/FriendlyInternet/nuxt-crouton/issues/960). This shell
> installs cleanly but does not render the launcher yet.

A **drop-in in-page feedback toolkit for any Nuxt + Nuxt UI 4 app**. It adds one
neutral **glasses** launcher in the bottom-right corner with two toggleable tools:

- **Console** — an in-page mobile devtools console (eruda), lazy-loaded on demand.
- **Annotate** — click any element on the page, write a comment, and send it to
  wherever you want feedback to go.

The send destination is a **pluggable sink** you pick in config:

| Sink | Where feedback lands |
|------|----------------------|
| `webhook` | A generic JSON `POST` to any URL (n8n, Zapier, your own endpoint) |
| `slack` / `discord` | A formatted message in a channel via an incoming webhook |
| `github` | A comment on a GitHub issue / PR |

No `@fyit/crouton-core` required — the only peers are `nuxt` and `@nuxt/ui`.

## Install

```bash
pnpm add -D @fyit/crouton-feedback
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@fyit/crouton-feedback']
})
```

Configuration (the `croutonFeedback.feedback` block, env vars, and the full sink
list) is documented as it lands — see epic #960.

## License

MIT
