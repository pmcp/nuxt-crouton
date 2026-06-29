<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'

/**
 * SpikePagePreview (#953) — assembles the page from its REGIONS and shows it as a real running page.
 *
 * The "expressiveness boundary" in action: a node pinned `top`/`bottom` renders as a sticky pill/bar at
 * that edge; everything else flows in a scrolling MAIN area between them — the review-flow + pill-top +
 * pill-bottom shape — without any free-floating / absolute positioning. Pure composition over the
 * existing CroutonLayoutRenderer; regions are a bounded enum an agent could equally assemble.
 *
 * Read-only: this is "what the page looks like", not an editor. A device frame keeps it phone-shaped so
 * the pinned pills read right; ✕ / scrim / Esc close it.
 */
interface PreviewNode { id: string, data: { node: LayoutNode, label?: string } }
const props = defineProps<{
  top: PreviewNode[]
  main: PreviewNode[]
  bottom: PreviewNode[]
  label?: string
}>()
const emit = defineEmits<{ close: [] }>()

const hasContent = computed(() => props.top.length || props.main.length || props.bottom.length)
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 p-3 backdrop-blur-sm" @click.self="emit('close')">
      <!-- Top bar: device label + close -->
      <div class="mb-2 flex w-full max-w-sm items-center gap-2">
        <UIcon name="i-lucide-smartphone" class="size-4 text-white/70" />
        <span class="text-sm font-medium text-white/90">{{ label || 'Page' }} · preview</span>
        <UButton icon="i-lucide-x" size="xs" color="neutral" variant="solid" class="ml-auto" aria-label="Close preview" @click="emit('close')" />
      </div>

      <!-- Phone frame: pinned top region · scrolling main · pinned bottom region -->
      <div class="relative flex h-[78vh] w-full max-w-sm flex-col overflow-hidden rounded-[2rem] border-4 border-default bg-default shadow-2xl">
        <!-- Pinned TOP region (sticky pill/bar) — hugs the block's intrinsic height (#954): a Top bar
             block is ~56px, so the bar is short, not a tall panel. -->
        <div v-if="top.length" class="z-10 shrink-0 border-b border-default bg-default/95 backdrop-blur">
          <div v-for="n in top" :key="n.id" class="spike-preview-region spike-region-pinned">
            <CroutonLayoutRenderer :node="n.data.node" />
          </div>
        </div>

        <!-- MAIN (scrolls) -->
        <div class="min-h-0 flex-1 overflow-auto">
          <div v-if="main.length" class="flex min-h-full flex-col">
            <div v-for="n in main" :key="n.id" class="spike-preview-region min-h-0 flex-1">
              <CroutonLayoutRenderer :node="n.data.node" />
            </div>
          </div>
          <div v-else class="grid h-full place-items-center p-6 text-center text-sm text-muted">
            No main content — pin some blocks to an edge, or set a page, then preview.
          </div>
        </div>

        <!-- Pinned BOTTOM region — hugs the block's intrinsic height (#954). -->
        <div v-if="bottom.length" class="z-10 shrink-0 border-t border-default bg-default/95 backdrop-blur">
          <div v-for="n in bottom" :key="n.id" class="spike-preview-region spike-region-pinned">
            <CroutonLayoutRenderer :node="n.data.node" />
          </div>
        </div>

        <div v-if="!hasContent" class="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
          Nothing to preview yet.
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Give each region's rendered layout a sensible intrinsic height so pinned bars hug their content
   while the main area fills. The renderer's panes are h-full; the region wrapper bounds that. */
.spike-preview-region {
  container-type: inline-size;
}
.spike-preview-region :deep(.croutonpane) {
  min-height: 0;
}
/* Pinned bars HUG their block's intrinsic height (#954) — the renderer's panes are `h-full`, which
   would otherwise stretch the bar to fill; auto lets a ~56px Top bar / 64px Nav stay short. */
.spike-region-pinned :deep(.croutonpane) {
  height: auto;
}
</style>
