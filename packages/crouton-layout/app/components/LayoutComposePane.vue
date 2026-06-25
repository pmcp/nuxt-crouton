<script setup lang="ts">
/**
 * CroutonLayoutComposePane (WS4, #873) — an *editable* recursive pane for the compose
 * canvas: like `CroutonLayoutRenderer`, but every leaf carries a small hover handle so a
 * pane that's been snapped into a group can be pulled back out (detach) or removed. Each
 * leaf is addressed by its `NodePath`; actions bubble up as `detach`/`remove` with that
 * path, and the canvas applies the pure `layout-edit` transforms.
 *
 * Kept separate from the read-only `CroutonLayoutRenderer` so the plain renderer stays
 * chrome-free; this one is only used inside the compose canvas.
 */
import { computed } from 'vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'
import type { NodePath } from '../utils/layout-edit'

const props = withDefaults(defineProps<{ node: LayoutNode, path?: NodePath, depth?: number }>(), {
  path: () => [],
  depth: 0,
})
const emit = defineEmits<{ detach: [path: NodePath], remove: [path: NodePath] }>()

const { resolveComponentName, sanitizeConfig } = useCroutonLayoutBlocks()

const componentName = computed<string | null>(() =>
  props.node.type === 'leaf' ? resolveComponentName(props.node.blockId) : null,
)
const safeConfig = computed<Record<string, unknown>>(() =>
  props.node.type === 'leaf' ? sanitizeConfig(props.node.blockId, props.node.config) : {},
)

// A leaf is "detachable" only when it lives inside a group (path non-empty) — a lone
// top-level leaf is already its own free piece, so detach would be a no-op.
const canDetach = computed(() => props.path.length > 0)
</script>

<template>
  <!-- Leaf: block content + a hover handle (detach / remove) -->
  <div
    v-if="node.type === 'leaf'"
    class="croutonpane group/pane relative h-full w-full"
  >
    <component
      :is="componentName"
      v-if="componentName"
      v-bind="safeConfig"
      class="h-full w-full overflow-auto"
    />
    <div
      v-else
      class="flex h-full w-full items-center justify-center p-4 text-center text-sm text-error"
    >
      Unknown block:&nbsp;<code>{{ node.blockId }}</code>
    </div>

    <!-- Per-leaf handle — appears on hover; click an action. -->
    <div
      class="absolute left-1 top-1 z-20 flex items-center gap-0.5 rounded-md border border-default bg-default/90 px-1 py-0.5 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover/pane:opacity-100"
    >
      <UIcon
        name="i-lucide-grip-vertical"
        class="size-3.5 text-muted"
      />
      <button
        v-if="canDetach"
        type="button"
        title="Detach this pane"
        class="grid size-5 place-items-center rounded text-muted hover:text-primary"
        @pointerdown.stop
        @click.stop="emit('detach', path)"
      >
        <UIcon
          name="i-lucide-package-open"
          class="size-3.5"
        />
      </button>
      <button
        type="button"
        title="Remove this pane"
        class="grid size-5 place-items-center rounded text-muted hover:text-error"
        @pointerdown.stop
        @click.stop="emit('remove', path)"
      >
        <UIcon
          name="i-lucide-trash-2"
          class="size-3.5"
        />
      </button>
    </div>
  </div>

  <!-- Nested sub-layout → recurse into its root (same path space boundary as the renderer) -->
  <div
    v-else-if="node.type === 'nested'"
    class="croutonpane h-full w-full"
  >
    <CroutonLayoutComposePane
      :node="node.layout.root"
      :path="path"
      :depth="depth + 1"
      @detach="(p: NodePath) => emit('detach', p)"
      @remove="(p: NodePath) => emit('remove', p)"
    />
  </div>

  <!-- Split → reka-ui group, recursing with each child's path -->
  <SplitterGroup
    v-else-if="node.type === 'split'"
    :direction="node.direction"
    class="h-full w-full"
  >
    <template
      v-for="(child, i) in node.children"
      :key="i"
    >
      <SplitterResizeHandle
        v-if="i > 0"
        class="bg-border transition-colors hover:bg-primary data-[orientation=horizontal]:w-px data-[orientation=vertical]:h-px"
      />
      <SplitterPanel
        :default-size="child.defaultSize ?? (100 / node.children.length)"
        class="overflow-hidden"
      >
        <CroutonLayoutComposePane
          :node="child"
          :path="[...path, i]"
          :depth="depth + 1"
          @detach="(p: NodePath) => emit('detach', p)"
          @remove="(p: NodePath) => emit('remove', p)"
        />
      </SplitterPanel>
    </template>
  </SplitterGroup>
</template>
