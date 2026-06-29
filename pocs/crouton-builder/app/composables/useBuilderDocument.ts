import type { LayoutDocument, LayoutDocumentPage } from '@fyit/crouton-layout/app/utils/layout-serialize'
import { serializeLayoutDocument } from '@fyit/crouton-layout/app/utils/layout-serialize'
import type { LayoutNode, LayoutTree } from '@fyit/crouton-core/app/types/layout'

/**
 * The builder's single shared artifact (#988) — one `LayoutDocument` (pages + the flow
 * between them) held in `useState`, so the Site flow (`/builder`) and each board
 * (`/builder/[pageId]`) read/write the SAME tree across real route navigations. This is
 * the agent⇄human interchange format: it serialises to the canonical string the #974
 * round-trip posts onto a ticket, and an agent's edit comes back as the same shape.
 */
const leaf = (blockId: string, config: Record<string, unknown>, defaultSize?: number): LayoutNode => ({
  type: 'leaf', blockId, config, ...(defaultSize !== undefined ? { defaultSize } : {}),
})

function seed(): LayoutDocument {
  const dashboard: LayoutDocumentPage = {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    isHome: true,
    status: 'published',
    visibility: 'public',
    layout: 'default',
    inNav: true,
    tree: {
      renderer: 'panes',
      root: {
        type: 'split',
        direction: 'vertical',
        children: [
          leaf('top-bar', { label: 'Acme Admin', kind: 'bar', icon: 'i-lucide-panel-top' }),
          {
            type: 'split',
            direction: 'horizontal',
            children: [
              leaf('artists-list', { label: 'Artists', kind: 'panel', variant: 'rows', icon: 'i-lucide-list' }, 58),
              {
                type: 'split',
                direction: 'vertical',
                defaultSize: 42,
                children: [
                  leaf('overview', { label: 'Overview', kind: 'panel', icon: 'i-lucide-layout-dashboard' }),
                  leaf('artists-form', { label: 'New artist', kind: 'panel', icon: 'i-lucide-square-pen' }),
                ],
              },
            ],
          },
          leaf('bottom-nav', { label: 'Nav', kind: 'nav', icon: 'i-lucide-panel-bottom' }),
        ],
      },
    },
  }

  const settings: LayoutDocumentPage = {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    parentId: 'dashboard',
    status: 'draft',
    visibility: 'admin',
    layout: 'default',
    inNav: true,
    tree: {
      renderer: 'panes',
      root: {
        type: 'split',
        direction: 'horizontal',
        children: [
          leaf('artists-list', { label: 'Members', kind: 'panel', variant: 'table', icon: 'i-lucide-table' }, 60),
          leaf('artists-form', { label: 'Invite', kind: 'panel', icon: 'i-lucide-user-plus' }, 40),
        ],
      },
    },
  }

  return { version: 1, pages: [dashboard, settings] }
}

export function useBuilderDocument() {
  const doc = useState<LayoutDocument>('builder-document', seed)

  const pages = computed(() => doc.value.pages)
  const homePage = computed(() => doc.value.pages.find(p => p.isHome) ?? doc.value.pages[0])

  function getPage(id: string): LayoutDocumentPage | undefined {
    return doc.value.pages.find(p => p.id === id)
  }

  /** Replace one page's composed tree (the board's edit), keeping the rest of the doc. */
  function setPageTree(id: string, root: LayoutNode) {
    const next = doc.value.pages.map(p =>
      p.id === id ? { ...p, tree: { ...p.tree, root } satisfies LayoutTree } : p,
    )
    doc.value = { ...doc.value, pages: next }
  }

  /** The canonical, diffable string the #974 round-trip posts onto a ticket. */
  function serialize(): string {
    return serializeLayoutDocument(doc.value)
  }

  return { doc, pages, homePage, getPage, setPageTree, serialize }
}
