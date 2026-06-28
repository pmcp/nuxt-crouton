<script setup lang="ts">
/**
 * SpikeGhostPane (#946) — the placeholder pane spliced into a layout while an internal insert is
 * armed, so the real panes ease apart to open its slot (renderer FLIP, #943). A translucent dashed
 * emerald slab that fills its pane and names the incoming item (injected, since the renderer doesn't
 * thread arbitrary config through). Registered as the `__dropghost__` layout block in app.config.
 */
const label = inject(SPIKE_GHOST_LABEL_KEY, null)
</script>

<template>
  <div class="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-400/15 p-2 text-center text-emerald-100 shadow-[0_0_16px_3px_rgba(16,185,129,0.4)]">
    <div class="flex flex-col items-center gap-1">
      <UIcon name="i-lucide-plus" class="size-4" />
      <span class="max-w-full truncate text-[10px] font-semibold">{{ label ?? 'Drops here' }}</span>
    </div>
  </div>
</template>
