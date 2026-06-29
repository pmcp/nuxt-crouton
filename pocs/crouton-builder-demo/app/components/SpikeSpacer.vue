<script setup lang="ts">
/**
 * SpikeSpacer (#952) — a layout primitive that renders nothing but empty SPACE. It's a real block
 * (registered as `spacer` in app.config croutonLayoutBlocks), so it snaps, reorders and resizes
 * exactly like any other block — you add it to push neighbours around or hold a gap in a layout.
 *
 * In the BUILDER it shows a faint dashed hint (so you can see + grab + resize it); in a real rendered
 * app it would just be blank space. Deliberately low-contrast so it reads as "intentional empty space",
 * not content. A small minWidth (set in the registry) lets it be a thin gutter.
 */
</script>

<template>
  <div class="spike-spacer grid h-full w-full place-items-center rounded-lg">
    <div class="flex flex-col items-center gap-1 text-muted/40">
      <UIcon name="i-lucide-square-dashed" class="size-4" />
      <span class="text-[10px] font-medium uppercase tracking-wide">Spacer</span>
    </div>
  </div>
</template>

<style scoped>
/* A barely-there dashed outline so the empty space is visible/grabbable in the builder without
   looking like content. */
.spike-spacer {
  border: 1px dashed var(--ui-border);
  background: repeating-linear-gradient(
    45deg,
    color-mix(in oklab, var(--ui-border) 14%, transparent),
    color-mix(in oklab, var(--ui-border) 14%, transparent) 6px,
    transparent 6px,
    transparent 12px
  );
}
</style>
