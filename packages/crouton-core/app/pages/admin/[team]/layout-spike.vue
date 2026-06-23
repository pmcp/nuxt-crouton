<script setup lang="ts">
/**
 * Layout spike harness (#713) — the Sprint 0 kill-test.
 *
 * Renders a hand-written layout *data tree* into resizable, nestable panes with
 * three real blocks, persists the arrangement to the team-scoped `layout_configs`
 * table, and restores it on reload. Includes one unknown block id to prove the
 * allowlist fallback. Throwaway — delete after the go/no-go finding.
 *
 * NOTE: blocks here are in-core components so the spike typechecks within
 * crouton-core. Cross-package blocks (e.g. the bookings calendar) plug into the
 * exact same `blocks` map via the Sprint 1 registry (#704) — same mechanism.
 */
import { reactive, ref, onMounted } from 'vue'
import type { Component } from 'vue'
import { CroutonCollection, CroutonLayoutSpikeForm, CroutonLayoutSpikeStats } from '#components'
import type { LayoutTree, LayoutSplit } from '../../../types/layout'

definePageMeta({ layout: 'admin', middleware: ['auth'] })

const LAYOUT_ID = 'spike-default'

// Allowlisted registry map: block id → component (the Sprint 1 registry stands in here).
const blocks: Record<string, Component> = {
  'collection-list': CroutonCollection,
  'entity-form': CroutonLayoutSpikeForm,
  'stats': CroutonLayoutSpikeStats,
}

const sampleRows = [
  { id: '1', title: 'Court A — Morning', subtitle: 'Tennis', status: 'confirmed' },
  { id: '2', title: 'Court B — Noon', subtitle: 'Padel', status: 'pending' },
  { id: '3', title: 'Studio — Evening', subtitle: 'Yoga', status: 'confirmed' },
]

function defaultTree(): LayoutTree {
  return {
    renderer: 'panes',
    root: {
      type: 'split',
      direction: 'horizontal',
      children: [
        {
          type: 'split',
          direction: 'vertical',
          defaultSize: 65,
          children: [
            {
              type: 'leaf',
              blockId: 'collection-list',
              defaultSize: 60,
              minSize: 20,
              config: { collection: 'bookings', layout: 'grid', rows: sampleRows, stateless: true },
            },
            { type: 'leaf', blockId: 'stats', defaultSize: 40, minSize: 15 },
          ],
        },
        // Right column: form on top, an UNKNOWN block below (allowlist fallback demo)
        {
          type: 'split',
          direction: 'vertical',
          defaultSize: 35,
          minSize: 25,
          children: [
            { type: 'leaf', blockId: 'entity-form', defaultSize: 80, minSize: 30 },
            { type: 'leaf', blockId: 'totally-not-a-real-block', defaultSize: 20, minSize: 10 },
          ],
        },
      ],
    },
  }
}

const tree = reactive<LayoutTree>(defaultTree())
const loaded = ref(false)

const { load, save, saving } = useLayoutSpikeStore()

function applyLayout(node: LayoutSplit, sizes: number[]) {
  sizes.forEach((s, i) => {
    const child = node.children[i]
    if (child) child.defaultSize = s
  })
  save(LAYOUT_ID, tree)
}

async function reset() {
  tree.root = defaultTree().root
  await save(LAYOUT_ID, tree)
}

onMounted(async () => {
  const saved = await load(LAYOUT_ID)
  if (saved?.root) tree.root = saved.root
  loaded.value = true
})
</script>

<template>
  <UDashboardPanel id="layout-spike">
    <template #header>
      <UDashboardNavbar title="Layout spike (#713)">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <span v-if="saving" class="text-xs text-muted">Saving…</span>
          <UButton
            size="xs"
            variant="ghost"
            icon="i-lucide-rotate-ccw"
            @click="reset"
          >
            Reset
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="h-full w-full">
        <CroutonLayoutRenderer
          :node="tree.root"
          :blocks="blocks"
          @layout-change="applyLayout"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
