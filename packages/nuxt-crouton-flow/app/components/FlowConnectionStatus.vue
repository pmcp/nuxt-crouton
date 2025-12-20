<script setup lang="ts">
defineProps<{
  connected: boolean
  synced: boolean
  error: Error | null
}>()
</script>

<template>
  <div class="flow-connection-status">
    <div
      class="flow-connection-indicator"
      :class="{
        connected: connected && synced,
        connecting: connected && !synced,
        disconnected: !connected
      }"
    />
    <span
      v-if="error"
      class="flow-connection-error"
    >
      {{ error.message }}
    </span>
  </div>
</template>

<style scoped>
.flow-connection-status {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
}

.flow-connection-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.flow-connection-indicator.connected {
  background-color: #22c55e;
}

.flow-connection-indicator.connecting {
  background-color: #eab308;
  animation: pulse 1s infinite;
}

.flow-connection-indicator.disconnected {
  background-color: #ef4444;
}

.flow-connection-error {
  font-size: 12px;
  color: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
