<script setup lang="ts">
/**
 * CroutonLayoutCollapseHandle (WS6, #875) — the resting handle a pane collapses *into*
 * when an in-place collapse style is active, plus its signature collapse/restore motion.
 * It replaces a collapsed leaf's block inside the renderer, sits in the pane's own slot
 * (so the collapse reads as "in place"), and is the restore affordance — click it to ask
 * the host to expand the pane back.
 *
 * Three distinct, size-proof resting forms (from the gallery, `layout-collapse-concepts.md`).
 * Each settles in with a SUBTLE fade + small scale nudge — the loud motion is the pane's
 * own shrink (LayoutRenderer flex-grow); this handle is the quiet endpoint, not the show:
 *  - `spring-drawer` — a thin labeled spine; faint settle along its axis.
 *  - `crt-power-down` — a phosphor line softly fades into a standby dot.
 *  - `iris-portal` — a ring + glowing seed at the pane's center; eases in, no zoom/spin.
 *
 * Purely presentational: the host owns the collapsed set, so this only renders + emits.
 * The motion is CSS (`prefers-reduced-motion`-aware) so it needs no JS animation loop.
 */
import type { LayoutCollapseStyle } from '@fyit/crouton-core/app/types/layout'

const props = defineProps<{
  /** The in-place motion to render (never `gutter-tabs` — that path is the rail). */
  collapseStyle: LayoutCollapseStyle
  /** The collapsed block's id (shown on the handle + announced for a11y). */
  blockId: string
  /** The enclosing nested-app label, when the block lives inside a `nested` node. */
  label?: string
}>()

const emit = defineEmits<{ expand: [] }>()

const title = computed(() => `Expand ${props.label ? props.label + ' · ' : ''}${props.blockId}`)
const caption = computed(() => props.label || props.blockId)
</script>

<template>
  <button
    type="button"
    :title="title"
    :aria-label="title"
    :data-collapse-style="collapseStyle"
    class="crouton-collapse-handle group relative grid h-full w-full place-items-center overflow-hidden border border-default bg-elevated/60 text-muted transition-colors hover:border-primary hover:text-primary"
    @click="emit('expand')"
  >
    <!-- spring-drawer: a thin labeled spine flush in the pane; springs in. -->
    <template v-if="collapseStyle === 'spring-drawer'">
      <span class="crouton-spine flex h-full w-full flex-col items-center justify-center gap-2 py-2">
        <UIcon
          name="i-lucide-chevrons-left"
          class="size-4 shrink-0"
        />
        <span class="[writing-mode:vertical-rl] rotate-180 truncate text-[11px] font-medium uppercase tracking-wider">{{ caption }}</span>
      </span>
    </template>

    <!-- crt-power-down: a standby dot; the phosphor line crushes into it on collapse. -->
    <template v-else-if="collapseStyle === 'crt-power-down'">
      <span class="crouton-crt grid place-items-center">
        <span class="crouton-crt-dot size-2.5 rounded-full bg-primary shadow-[0_0_5px_0_var(--ui-primary)]" />
        <span class="crouton-crt-line absolute h-px w-2/3 bg-primary" />
      </span>
      <span class="absolute bottom-1.5 max-w-full truncate px-1 text-[10px] uppercase tracking-wide opacity-0 transition-opacity group-hover:opacity-100">{{ caption }}</span>
    </template>

    <!-- iris-portal: an iris of blades closes to a glowing seed at the pane center. -->
    <template v-else>
      <span class="crouton-iris relative grid size-10 place-items-center">
        <span class="crouton-iris-ring absolute inset-0 rounded-full border-2 border-primary/70" />
        <span class="crouton-iris-seed size-2 rounded-full bg-primary shadow-[0_0_6px_0_var(--ui-primary)]" />
      </span>
      <span class="absolute bottom-1.5 max-w-full truncate px-1 text-[10px] uppercase tracking-wide opacity-0 transition-opacity group-hover:opacity-100">{{ caption }}</span>
    </template>
  </button>
</template>

<style scoped>
/* Each style plays a SUBTLE settle-in on mount — a gentle fade with a small scale
   nudge, just enough to read as "this style's resting form arrived" without a loud
   flourish. The big motion is the pane's own shrink (LayoutRenderer flex-grow); this
   handle is the quiet endpoint, not the show. GPU-friendly (transform/opacity only). */

@keyframes crouton-handle-fade { from { opacity: 0; } to { opacity: 1; } }

/* spring-drawer — a faint settle along the spine axis. */
.crouton-collapse-handle[data-collapse-style='spring-drawer'] {
  animation: crouton-spring-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes crouton-spring-in {
  0% { transform: scaleX(1.05); opacity: 0; }
  100% { transform: scaleX(1); opacity: 1; }
}

/* crt-power-down — the line just fades softly into the standby dot. */
.crouton-collapse-handle[data-collapse-style='crt-power-down'] {
  animation: crouton-handle-fade 220ms ease-out both;
}
.crouton-crt-line {
  animation: crouton-crt-line 300ms ease-out both;
}
.crouton-crt-dot {
  animation: crouton-crt-dot 300ms ease-out both;
}
@keyframes crouton-crt-line {
  0% { opacity: 0.6; transform: scaleX(1); }
  100% { opacity: 0; transform: scaleX(0.2); }
}
@keyframes crouton-crt-dot {
  0% { opacity: 0; transform: scale(0.6); }
  100% { opacity: 1; transform: scale(1); }
}

/* iris-portal — the ring eases in from a hair larger; no zoom/spin. */
.crouton-collapse-handle[data-collapse-style='iris-portal'] {
  animation: crouton-handle-fade 260ms cubic-bezier(0.4, 0, 0.2, 1) both;
}
.crouton-iris-ring {
  animation: crouton-iris-ring 300ms cubic-bezier(0.4, 0, 0.2, 1) both;
}
.crouton-iris-seed {
  animation: crouton-iris-seed 300ms ease-out both;
}
@keyframes crouton-iris-ring {
  0% { transform: scale(1.12); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes crouton-iris-seed {
  0% { opacity: 0; transform: scale(0.6); }
  100% { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .crouton-collapse-handle,
  .crouton-crt-line,
  .crouton-crt-dot,
  .crouton-iris-ring,
  .crouton-iris-seed {
    animation: none;
  }
}
</style>
