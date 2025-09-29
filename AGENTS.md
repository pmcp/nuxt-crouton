# Repository Guidelines

## Project Structure & Module Organization
- This pnpm workspace tracks `packages/*` and `examples/*`; install once at the root before touching sub-packages.
- `packages/nuxt-crouton` is the base layer: Nuxt components live in `app/components`, composables and utilities in `app/composables` and `app/utils`, and registry exports in `registry/`.
- `packages/nuxt-crouton-i18n` extends the base layer, bundling locales under `locales/` and additional server handlers under `server/`.
- `packages/nuxt-crouton-editor` supplies the Tiptap-powered editor with global components prefixed `Crouton`.
- `packages/nuxt-crouton-collection-generator` is the CLI; `bin/` hosts the entry point and `schemas/` keeps canonical collection specs such as `test-product-schema.json`.
- `examples/` is intentionally empty; scaffold Nuxt apps here when you need an integration sandbox, then register them in `pnpm-workspace.yaml` automatically.

## Build, Test, and Development Commands
- `pnpm install` — installs workspace dependencies (Node 18+ required per generator `engines`).
- `pnpm --filter @friendlyinternet/nuxt-crouton-collection-generator test` — smoke tests the generator, ensuring the CLI still boots.
- `pnpm dlx nuxi dev --cwd examples/<app>` — run a local Nuxt sandbox that extends the layer you are editing.
- `pnpm publish:dry` and `pnpm publish:all` — verify and release all packages; always run the dry run before publishing.
- `pnpm clean` — drop workspace dependencies when you need a clean install before releases.

## Coding Style & Naming Conventions
- Use 2-space indentation and keep `<script setup>` blocks lean; prefer composables for shared logic.
- TypeScript is expected for composables/utilities; define interfaces in-module and export helpers as named functions.
- Vue components are PascalCase (e.g., `CroutonTable.vue`); composables use the `useX` pattern.
- Global components should keep the `Crouton` prefix to avoid collisions when users extend layers.

## Testing Guidelines
- Generator changes must include fixtures under `packages/nuxt-crouton-collection-generator/schemas` and extend the CLI smoke test when new flags are introduced.
- For layer changes, spin up an `examples/<app>` sandbox and capture regression steps in the PR (e.g., route exercised, data set used).
- Share reusable mock data via `test-product-schema.json` or new files in `examples/fixtures/` so other agents can replay scenarios.
- Document any gaps in automated coverage in the PR while you work toward adding automated Nuxt or Vitest checks.

## Commit & Pull Request Guidelines
- Follow the existing imperative style (`use sqlite as default dialect`); lead with the affected package when possible (`generator: add schema validation`).
- Favor focused commits per package and avoid bundling unrelated layer and CLI changes together.
- Pull requests should include a concise summary, a checklist of commands run, and screenshots or GIFs when UI behavior changes.
- Link related issues or discussions and note any follow-up work so downstream agents can schedule the next tasks efficiently.
