# pocs/ — the package incubator

This folder holds **real, working crouton Nuxt apps that double as proving grounds for new packages.**

## The idea

New crouton capabilities are not designed as packages up front. They start life as
ordinary feature code **inside a real app here** — built against a concrete use case,
with real data, real UI, real deploys. Only once a capability is *proven in an app*
(it works, the API has settled, the pattern is worth reusing) do we **extract it into
a `packages/@fyit/crouton-*` layer** and have apps consume it from there.

```
build it in a poc app  →  prove it against a real use case  →  extract into packages/  →  apps/ consume the package
```

So a poc is allowed to contain code that *will eventually live in a package* but
doesn't yet. That's the point. The messiness is intentional — it's where we learn the
right shape before committing to a shared API.

## How pocs differ from the rest of the monorepo

| | `pocs/` | `apps/` | `fixtures/` |
|---|---|---|---|
| Purpose | Incubate + prove new packages | Maintained production apps | e2e smoke harness |
| Stability | Experimental, churny | Production rigor | Throwaway, generated |
| Package code | May hold *pre-extraction* feature code | Only consumes packages | Only consumes packages |
| CI / deploy / issue rigor | Looser | Full (see root `CLAUDE.md`) | N/A |

## Working in here

- A poc may legitimately contain feature code destined for a package — that's not a
  layering violation here the way it would be in `apps/`. The `packages/` hard gate
  still applies to actual `packages/` edits; building the *precursor* inside a poc is
  how we avoid premature package changes.
- These apps are **not held to the production CI / two-domain deploy / issue-first
  standards** that `apps/` are. Treat them as experiments.
- When a capability graduates, the extraction into `packages/` **is** real package
  work — follow the normal package rules (issue first, approval gate, `pnpm typecheck`
  across apps) at that point.

## What lives here right now

A mix of two things:

1. **Crouton consumer apps** — real/client-ish Nuxt apps (assets, pages, maps, i18n,
   three, email, PDF/signature flows, etc.) that exercise packages and surface gaps.
2. **The ThinkGraph stack** — an experimental canvas/agent project: a Nuxt app, a Node
   Pi-agent worker, and a Yjs collab Cloudflare Worker.

Each app carries its own `crouton.config.js`, `schemas/`, layers and `wrangler.*` —
look there for per-app specifics rather than enumerating them here.