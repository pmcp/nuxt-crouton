<script setup lang="ts">
/**
 * KrSpeakerGrill - Speaker grill pattern component
 * Horizontal slot pattern like on the KR-11
 */
interface Props {
  slots?: number
}

const props = withDefaults(defineProps<Props>(), {
  slots: 8
})
</script>

<template>
  <div class="kr-grill">
    <div class="kr-grill-slots">
      <div
        v-for="i in slots"
        :key="i"
        class="kr-grill-slot"
      />
    </div>
  </div>
</template>
