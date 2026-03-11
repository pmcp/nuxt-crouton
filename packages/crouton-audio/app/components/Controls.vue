<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** Player ID to control */
  playerId?: string
  /** Show zoom buttons */
  showZoom?: boolean
  /** Show duration display */
  showDuration?: boolean
}>(), {
  playerId: 'default',
  showZoom: true,
  showDuration: true,
})

const player = useAudioPlayer(props.playerId)
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Zoom out -->
    <UButton
      v-if="showZoom"
      icon="i-lucide-minus"
      variant="ghost"
      size="xs"
      :disabled="!player.isReady.value || player.zoom.value <= 0"
      @click="player.setZoom('-')"
    />

    <!-- Play/Pause -->
    <UButton
      :icon="player.isPlaying.value ? 'i-lucide-pause' : 'i-lucide-play'"
      variant="soft"
      size="sm"
      :disabled="!player.isReady.value"
      class="rounded-full"
      @click="player.playPause()"
    />

    <!-- Zoom in -->
    <UButton
      v-if="showZoom"
      icon="i-lucide-plus"
      variant="ghost"
      size="xs"
      :disabled="!player.isReady.value || player.zoom.value >= 300"
      @click="player.setZoom('+')"
    />

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Duration -->
    <span
      v-if="showDuration && player.isReady.value"
      class="text-xs text-[var(--ui-text-muted)] tabular-nums font-mono"
    >
      {{ player.currentTimeFormatted.value }} / {{ player.durationFormatted.value }}
    </span>

    <!-- Extra controls slot -->
    <slot :player="player" />
  </div>
</template>
