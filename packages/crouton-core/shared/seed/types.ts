/**
 * The seed contract shared by every package that ships demo data.
 *
 * A package exports a {@link SeedProvider} from its `./seed` entry. An app's
 * seed runner discovers the providers of its extended packages, orders them by
 * `dependsOn`, and calls each `seed(ctx)` with a {@link SeedContext}. Providers
 * describe rows declaratively through `ctx.upsert(...)`; the runner turns those
 * into idempotent SQL and executes it via `wrangler d1`.
 *
 * Providers reference table/column *names as strings* — they never import the
 * app's generated layer schema, so they stay pure (no Nuxt runtime) and load
 * cleanly under jiti.
 */
import type { SqlRaw } from './sql'

/** A single CMS block as stored in a page's `content` doc (TipTap JSON). */
export interface PageBlock {
  type: string
  attrs?: Record<string, unknown>
  content?: unknown[]
}

export interface CreatePageWithBlocksOptions {
  /** URL slug for the page (unique per team). */
  slug: string
  /** Locale the title/slug/content are authored in (e.g. `nl`). */
  locale: string
  /** Human-readable page title. */
  title: string
  /** Blocks to embed in the page's `content` doc. */
  blocks: PageBlock[]
  /** Page visibility — `scoped` gates behind a redeemable credential. */
  visibility?: 'public' | 'scoped' | 'members' | 'admin' | 'hidden'
  /** Publish status; defaults to `published`. */
  status?: string
  /** Page type; defaults to `pages:regular` (renders block content). */
  pageType?: string
  /** Optional page `config` JSON (e.g. `{ requiredScope, hideNav }`). */
  config?: Record<string, unknown>
  /** Show in the site navigation; defaults to `false` for demo pages. */
  showInNavigation?: boolean
  /** Sort order among siblings; defaults to `0`. */
  order?: number
  /** Override the derived stable id (advanced; defaults to `seed:page:…`). */
  id?: string
}

/** Creates/updates a page embedding the given blocks; returns the page id. */
export type CreatePageWithBlocksFn = (options: CreatePageWithBlocksOptions) => string

/** Idempotent upsert: conflict-target columns in `byId`, rest in `values`. */
export type UpsertFn = (
  table: string,
  byId: Record<string, unknown>,
  values?: Record<string, unknown>
) => void

export interface SeedContext {
  /** The team (organization) id every domain row hangs off. */
  teamId: string
  /** The team slug (e.g. `test1`) — what appears in URLs. */
  teamSlug: string
  /** Locale demo content is authored in (e.g. `nl`). */
  locale: string
  /** Whether to seed optional staff/login accounts (opt-in). */
  withStaff: boolean
  /** A SQL expression for the current time in unix seconds (`unixepoch()`). */
  now: SqlRaw
  /** Queue an idempotent upsert (see {@link UpsertFn}). */
  upsert: UpsertFn
  /** Queue a raw SQL statement (escape hatch). */
  raw: (sql: string) => void
  /**
   * Create a demo page embedding blocks — present only when crouton-pages is
   * part of the app. Block-contributing packages guard on this before seeding
   * their demo page, so the domain seed stays usable without crouton-pages.
   */
  createPageWithBlocks?: CreatePageWithBlocksFn
}

export interface SeedProvider {
  /** Stable provider id used for ordering (e.g. `auth`, `sales`, `pages`). */
  id: string
  /** Other provider ids that must run first (missing ones are ignored). */
  dependsOn?: string[]
  /** Describe this package's demo rows via `ctx`. */
  seed: (ctx: SeedContext) => void | Promise<void>
}
