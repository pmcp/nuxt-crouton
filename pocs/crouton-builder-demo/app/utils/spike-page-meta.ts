/**
 * Spike page-model meta (#940) — the page's status / visibility / layout enums plus
 * their display chrome (icon · label · color), copied verbatim from crouton-pages'
 * Editor/Toolbar so the Site flow and the page board read identically. Auto-imported
 * (app/utils) so the board page-shell (spike-app.vue) AND the Site-flow page card
 * (SpikePageCard.vue) share ONE source of truth — no drift between the condensed card
 * and the full page header. On graduation these are REPLACED by the real crouton-pages
 * toolbar/settings (this view is just another view of the same pages collection).
 *
 * Class strings are LITERAL (not `bg-${x}`) so Tailwind's JIT keeps them.
 */
export type PageStatus = 'draft' | 'published' | 'archived'
export type PageVisibility = 'public' | 'members' | 'admin' | 'scoped' | 'hidden'
export type PageLayout = 'default' | 'full-height' | 'full-screen'

export const STATUS_META: Record<PageStatus, { icon: string, label: string, dot: string, text: string }> = {
  draft: { icon: 'i-lucide-pencil', label: 'Draft', dot: 'bg-warning', text: 'text-warning' },
  published: { icon: 'i-lucide-check', label: 'Published', dot: 'bg-success', text: 'text-success' },
  archived: { icon: 'i-lucide-archive', label: 'Archived', dot: 'bg-error', text: 'text-error' },
}

export const VISIBILITY_META: Record<PageVisibility, { icon: string, label: string }> = {
  public: { icon: 'i-lucide-globe', label: 'Public' },
  members: { icon: 'i-lucide-users', label: 'Members' },
  admin: { icon: 'i-lucide-shield', label: 'Admin only' },
  scoped: { icon: 'i-lucide-key-round', label: 'Scoped' },
  hidden: { icon: 'i-lucide-eye-off', label: 'Hidden' },
}

export const LAYOUT_META: Record<PageLayout, { icon: string, label: string }> = {
  default: { icon: 'i-lucide-panels-top-left', label: 'Default' },
  'full-height': { icon: 'i-lucide-rectangle-vertical', label: 'Full height' },
  'full-screen': { icon: 'i-lucide-maximize', label: 'Full screen' },
}
