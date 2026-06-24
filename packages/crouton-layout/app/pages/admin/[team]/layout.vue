<script setup lang="ts">
/**
 * CroutonLayout harness (#706) — the editable panes surface end to end.
 *
 * Loads a team-scoped layout from `layout_configs`, edits it through
 * `CroutonLayout` (drag blocks from the palette into panes, resize, nest, swap,
 * configure), and saves every change back (debounced) so a reload restores the
 * arrangement. Starts empty when nothing is saved yet, so the compose loop is
 * demonstrable from scratch. Replaces the throwaway spike harness.
 */
import { ref, watch, onMounted } from 'vue'
import type { LayoutTree } from '@fyit/crouton-core/app/types/layout'

definePageMeta({ layout: 'admin', middleware: ['auth'] })

const LAYOUT_ID = 'default'

const tree = ref<LayoutTree | null>(null)
const { load, save, saving } = useCroutonLayoutStore()

// Persist every edit (the store debounces the flurry of drag/resize changes).
watch(tree, (v) => { if (v) save(LAYOUT_ID, v) })

onMounted(async () => {
  tree.value = await load(LAYOUT_ID)
})
</script>

<template>
  <UDashboardPanel id="crouton-layout">
    <template #header>
      <UDashboardNavbar title="Layout">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <span v-if="saving" class="text-xs text-muted">Saving…</span>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="h-full w-full">
        <CroutonLayout v-model="tree" />
      </div>
    </template>
  </UDashboardPanel>
</template>
