/**
 * crouton-pages seed provider + page-seeding helper (#85).
 *
 * Exposes `createPageWithBlocks` — the helper the runner injects onto
 * `ctx.createPageWithBlocks` so any block-contributing package can seed a page
 * that shows off its block. Also ships crouton-pages' own demo page and a small
 * registry block packages can use to declare demo pages.
 *
 * Pure module: references the `pages_pages` table/columns by name, so it never
 * imports the app's generated schema and loads cleanly under jiti.
 */
import type {
  SeedProvider,
  SeedContext,
  CreatePageWithBlocksOptions
} from '@fyit/crouton-core/shared/seed'
import { seedId } from '@fyit/crouton-core/shared/seed'

/**
 * Upsert a `pages_pages` row whose `content` is a TipTap doc embedding the
 * given blocks. Idempotent by a stable id derived from team + slug. The block
 * content is mirrored into `translations.<locale>.content` (and base `content`)
 * so both the renderer (reads the locale translation) and the scoped-access
 * derive-scope hook (reads base content first) see the blocks.
 */
export function createPageWithBlocks(
  ctx: SeedContext,
  options: CreatePageWithBlocksOptions
): string {
  const id = options.id ?? seedId('page', ctx.teamSlug, options.slug)
  const doc = JSON.stringify({ type: 'doc', content: options.blocks })
  const translations = {
    [options.locale]: {
      title: options.title,
      slug: options.slug,
      content: doc
    }
  }

  ctx.upsert('pages_pages', { id }, {
    teamId: ctx.teamId,
    owner: 'seed',
    parentId: null,
    // Root page: path is `/<id>/` to match the app's path convention.
    path: `/${id}/`,
    depth: 0,
    order: options.order ?? 0,
    title: options.title,
    slug: options.slug,
    pageType: options.pageType ?? 'pages:regular',
    content: doc,
    config: options.config ?? {},
    status: options.status ?? 'published',
    visibility: options.visibility ?? 'public',
    publishedAt: ctx.now,
    showInNavigation: options.showInNavigation ?? false,
    translations,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    createdBy: 'seed',
    updatedBy: 'seed'
  })

  return id
}

/**
 * Optional demo-page registry. A block-contributing package may push a builder
 * here (at module load) to declare a demo page; the pages provider materializes
 * them. Most packages instead seed their demo page directly via
 * `ctx.createPageWithBlocks` inside their own provider — both are supported.
 */
type DemoPageBuilder = (ctx: SeedContext) => void
const demoPageBuilders: DemoPageBuilder[] = []

export function registerDemoPage(builder: DemoPageBuilder): void {
  demoPageBuilders.push(builder)
}

export const provider: SeedProvider = {
  id: 'pages',
  dependsOn: ['auth'],
  seed(ctx) {
    // crouton-pages' own demo: a plain content page so a fresh install has at
    // least one public, clickable page.
    createPageWithBlocks(ctx, {
      slug: 'welcome',
      locale: ctx.locale,
      title: 'Welkom',
      visibility: 'public',
      showInNavigation: true,
      blocks: [
        {
          type: 'richTextBlock',
          attrs: {
            content:
              '<h1>Welkom</h1><p>Dit is een demo-pagina, aangemaakt door <code>pnpm db:seed</code>.</p>'
          }
        }
      ]
    })

    for (const build of demoPageBuilders) build(ctx)
  }
}

export default provider
