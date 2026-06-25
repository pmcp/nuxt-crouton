<script setup lang="ts">
/**
 * CroutonLayoutComposePane (WS4, #873) — an *editable* recursive pane for the compose
 * canvas: like `CroutonLayoutRenderer`, but every leaf carries a small handle so a pane
 * that's been snapped into a group (or dropped INSIDE one as a nested app) can be pulled
 * back out (detach) or removed.
 *
 * Addressing crosses the WS2 nested boundary: a `nested` node has its OWN path space, so
 * a leaf reports `{ inner, nestedAt }` — `inner` is its path within the current tree, and
 * `nestedAt` is the outer path of the enclosing nested node (or null at the piece's top
 * level). The canvas uses that to edit either the piece tree or the nested sub-layout.
 *
 * Kept separate from the read-only `CroutonLayoutRenderer` so that stays chrome-free.
 */
import { computed } from 'vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'
import type { NodePath } from '../utils/layout-edit'

export interface ComposeAddr { inner: NodePath, nestedAt: NodePath | null }

const props = withDefaults(defineProps<{ node: LayoutNode, path?: NodePath, nestedAt?: NodePath | null }>(), {
  path: () => [],
  nestedAt: null,
})
const emit = defineEmits<{ detach: [addr: ComposeAddr], remove: [addr: ComposeAddr] }>()

const { resolveComponentName, sanitizeConfig } = useCroutonLayoutBlocks()

const componentName = computed<string | null>(() =>
  props.node.type === 'leaf' ? resolveComponentName(props.node.blockId) : null,
)
const safeConfig = computed<Record<string, unknown>>(() =>
  props.node.type === 'leaf' ? sanitizeConfig(props.node.blockId, props.node.config) : {},
)

// Detachable if it lives inside a group (path non-empty) OR inside a nested app
// (nestedAt set) — a lone top-level leaf is already its own free piece.
const canDetach = computed(() => props.path.length > 0 || props.nestedAt !== null)
const addr = computed<ComposeAddr>(() => ({ inner: props.path, nestedAt: props.nestedAt }))
// When recursing into a nested node, reset into its own path space and remember its
// outer path (one level; deeper nesting detaches the inner app as a unit).
const childNestedAt = computed<NodePath | null>(() => props.nestedAt ?? props.path)
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

    <!-- Per-leaf handle — always visible (touch has no hover); brightens on hover. -->
    <div
      class="absolute left-1 top-1 z-20 flex items-center gap-0.5 rounded-md border border-default bg-default/90 px-1 py-0.5 opacity-80 shadow-sm backdrop-blur transition-opacity group-hover/pane:opacity-100"
    >
      <UIcon
        name="i-lucide-grip-vertical"
        class="size-4 text-muted"
      />
      <button
        v-if="canDetach"
        type="button"
        title="Detach this pane"
        aria-label="Detach this pane"
        class="grid size-7 place-items-center rounded text-muted hover:text-primary"
        @pointerdown.stop
        @click.stop="emit('detach', addr)"
      >
        <UIcon
          name="i-lucide-package-open"
          class="size-4"
        />
      </button>
      <button
        type="button"
        title="Remove this pane"
        aria-label="Remove this pane"
        class="grid size-7 place-items-center rounded text-muted hover:text-error"
        @pointerdown.stop
        @click.stop="emit('remove', addr)"
      >
        <UIcon
          name="i-lucide-trash-2"
          class="size-4"
        />
      </button>
    </div>
  </div>

  <!-- Nested sub-layout → recurse into its root in a FRESH path space (nestedAt = this node) -->
  <div
    v-else-if="node.type === 'nested'"
    class="croutonpane h-full w-full"
  >
    <CroutonLayoutComposePane
      :node="node.layout.root"
      :path="[]"
      :nested-at="childNestedAt"
      @detach="(a: ComposeAddr) => emit('detach', a)"
      @remove="(a: ComposeAddr) => emit('remove', a)"
    />
  </div>

  <!-- Split → reka-ui group, recursing with each child's path (nestedAt forwarded) -->
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
          :nested-at="nestedAt"
          @detach="(a: ComposeAddr) => emit('detach', a)"
          @remove="(a: ComposeAddr) => emit('remove', a)"
        />
      </SplitterPanel>
    </template>
  </SplitterGroup>
</template>
