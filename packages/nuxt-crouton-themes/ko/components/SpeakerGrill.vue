<script setup lang="ts">
interface Props {
  rows?: number
  cols?: number
}

const props = withDefaults(defineProps<Props>(), {
  rows: 12,
  cols: 8
})

const holes = computed(() => {
  const result = []
  for (let r = 0; r < props.rows; r++) {
    for (let c = 0; c < props.cols; c++) {
      result.push({ r, c })
    }
  }
  return result
})
</script>

<template>
  <div
    class="ko-speaker-grill"
    :style="{
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gridTemplateColumns: `repeat(${cols}, 1fr)`
    }"
  >
    <div
      v-for="hole in holes"
      :key="`${hole.r}-${hole.c}`"
      class="ko-speaker-grill__hole"
    />
  </div>
</template>

<style scoped>
.ko-speaker-grill {
  display: grid;
  gap: 4px;
  padding: 8px;
  background-color: var(--ko-surface-mid);
  border-radius: 4px;
}

.ko-speaker-grill__hole {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--ko-surface-dark);
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.5);
}
</style>
