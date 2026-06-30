<script setup lang="ts">
import { computed, markRaw, provide } from 'vue'
import PageNode from './PageNode.vue'

/**
 * CroutonFlowSiteFlow — the Site level of the Crouton Builder (WS3 #872, epic
 * #868). The "only floating level": a Vue Flow canvas of page-cards wired into a
 * sitemap.
 *
 * It is *another view of the existing `pages` collection*, not a new data model:
 *  - each page row is a draggable card (`CroutonFlowPageNode`),
 *  - the lines between cards are the same `parentId` hierarchy (CroutonFlow
 *    PATCHes the parent field when you connect two cards),
 *  - card positions persist to `flow_configs` (pass `flowId`), and `sync` turns
 *    on the existing Yjs multiplayer — all for free from `crouton-flow`.
 *
 * A thin preset over `CroutonFlow`: it injects the page card via
 * `defaultNodeComponent`, provides the `croutonSiteFlowZoom` descend-function the
 * card calls, and re-emits `zoomIntoPage` with the original page row so the host
 * (the zoom shell's `#site` slot) can drop into that page's layout.
 */

interface Props {
  /** Page rows — the same rows the pages collection / tree view uses. */
  pages: Record<string, unknown>[]
  /** Collection name (drives edge persistence via the parent field). */
  collection?: string
  /** Field holding the parent page id — the wiring. */
  parentField?: string
  /** Field to label the card with. */
  labelField?: string
  /** flow_configs id — set it to persist card positions (and required for sync). */
  flowId?: string
  /** Enable real-time multiplayer (Yjs). */
  sync?: boolean
  /** Pre-loaded positions from flow_configs (avoids an extra fetch). */
  savedPositions?: Record<string, { x: number, y: number }> | null
  /** Show the minimap (handy for large sitemaps). */
  minimap?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collection: 'pages',
  parentField: 'parentId',
  labelField: 'label',
  sync: false,
  savedPositions: null,
  minimap: false,
})

const emit = defineEmits<{
  /** A page card was activated (zoom button or double-click) — descend into it. */
  zoomIntoPage: [page: Record<string, unknown>]
  /** A page card was single-clicked. */
  pageClick: [pageId: string, page: Record<string, unknown>]
}>()

const pageNode = markRaw(PageNode)

/** Resolve a page id back to its original row (so the host gets the exact object). */
function pageById(id: string): Record<string, unknown> | undefined {
  return props.pages.find(p => String((p as { id?: unknown }).id ?? '') === id)
}

function zoomTo(pageId: string, fallback?: Record<string, unknown>) {
  const page = pageById(pageId) ?? fallback
  if (page) emit('zoomIntoPage', page)
}

// The page card injects + calls this to descend the zoom shell into a page.
provide('croutonSiteFlowZoom', (pageId: string) => zoomTo(pageId))

function onNodeDblClick(pageId: string, data: Record<string, unknown>) {
  zoomTo(pageId, data)
}

function onNodeClick(pageId: string, data: Record<string, unknown>) {
  emit('pageClick', pageId, pageById(pageId) ?? data)
}

const hasPages = computed(() => props.pages.length > 0)
</script>

<template>
  <div class="crouton-site-flow relative h-full w-full">
    <CroutonFlow
      :rows="props.pages"
      :collection="props.collection"
      :parent-field="props.parentField"
      :label-field="props.labelField"
      :flow-id="props.flowId"
      :sync="props.sync"
      :saved-positions="props.savedPositions"
      :default-node-component="pageNode"
      :minimap="props.minimap"
      background-pattern="dots"
      @node-dbl-click="onNodeDblClick"
      @node-click="onNodeClick"
    />

    <!-- Empty state: no pages yet -->
    <div
      v-if="!hasPages"
      class="pointer-events-none absolute inset-0 grid place-items-center"
    >
      <p class="rounded-xl border border-dashed border-default px-6 py-4 text-center text-sm text-muted">
        No pages yet — add a page to start wiring your sitemap.
      </p>
    </div>
  </div>
</template>
