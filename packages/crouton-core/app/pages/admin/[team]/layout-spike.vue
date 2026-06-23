<script setup lang="ts">
/**
 * Layout spike harness (#713 → #704).
 *
 * Renders a hand-written layout *data tree* into resizable, nestable panes,
 * resolving each leaf's `blockId` through the `croutonLayoutBlocks` registry
 * (#704), persists the arrangement to the team-scoped `layout_configs` table,
 * and restores it on reload. The `totally-not-a-real-block` leaf proves the
 * allowlist fallback. Throwaway — delete after sign-off.
 */
import { reactive, onMounted } from 'vue'
import type { LayoutTree, LayoutSplit } from '../../../types/layout'

definePageMeta({ layout: 'admin', middleware: ['auth'] })

const LAYOUT_ID = 'spike-default'

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
              config: { heading: 'Bookings' },
            },
            { type: 'leaf', blockId: 'stats', defaultSize: 40, minSize: 15 },
          ],
        },
        {
          type: 'split',
          direction: 'vertical',
          defaultSize: 35,
          minSize: 25,
          children: [
            { type: 'leaf', blockId: 'entity-form', defaultSize: 80, minSize: 30 },
            // Untrusted-input demo: id NOT in the registry → safe fallback.
            { type: 'leaf', blockId: 'totally-not-a-real-block', defaultSize: 20, minSize: 10 },
          ],
        },
      ],
    },
  }
}

const tree = reactive<LayoutTree>(defaultTree())

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
})
</script>

<template>
  <UDashboardPanel id="layout-spike">
    <template #header>
      <UDashboardNavbar title="Layout spike (#704)">
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
          @layout-change="applyLayout"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
