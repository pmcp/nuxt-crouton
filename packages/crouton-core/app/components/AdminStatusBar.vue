<script setup lang="ts">
const { currentMessage, lastMessage } = useAdminStatusBar()
const statusBarActive = useState<boolean>('crouton-status-bar-active', () => false)

onMounted(() => { statusBarActive.value = true })
onUnmounted(() => { statusBarActive.value = false })

// Relative time for the last message (updates every 10s)
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 10_000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

function timeAgo(ts: number): string {
  const diff = Math.floor((now.value - ts) / 1000)
  if (diff < 10) return 'just now'
  if (diff < 60) return `${diff}s ago`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}
</script>

<template>
  <div
    class="h-7 shrink-0 border-t flex items-center px-4 gap-2 text-sm overflow-hidden transition-colors duration-300"
    :class="currentMessage
      ? currentMessage.type === 'error'
        ? 'bg-error/8 border-error/20 text-error'
        : currentMessage.type === 'warning'
          ? 'bg-warning/8 border-warning/20 text-warning'
          : 'bg-primary/8 border-primary/20 text-primary'
      : 'bg-default border-default text-muted'"
  >
    <TransitionGroup name="ticker" tag="div" class="relative flex items-center gap-2 min-w-0 flex-1 h-full overflow-hidden">
      <div
        v-if="currentMessage"
        :key="currentMessage.id"
        class="absolute inset-0 flex items-center justify-center gap-2"
      >
        <UIcon
          :name="currentMessage.icon"
          class="size-3 shrink-0"
        />
        <span class="truncate">{{ currentMessage.text }}</span>
      </div>
      <div v-else key="idle" class="absolute inset-0 flex items-center justify-center gap-1.5">
        <template v-if="lastMessage">
          <UIcon :name="lastMessage.icon" class="size-3 shrink-0 opacity-40" />
          <span class="opacity-60">{{ lastMessage.text }}</span>
          <span class="opacity-30">&middot;</span>
          <span class="opacity-30">{{ timeAgo(lastMessage.timestamp) }}</span>
        </template>
        <span v-else class="text-dimmed">Ready</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.ticker-enter-active,
.ticker-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.ticker-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.ticker-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.ticker-leave-active {
  position: absolute;
}
</style>