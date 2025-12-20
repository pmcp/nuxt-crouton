<script setup lang="ts">
/**
 * KrLed - LED indicator component
 * Small status LEDs like on the KR-11
 */
interface Props {
  state?: 'off' | 'on' | 'blink'
  color?: 'yellow' | 'green'
}

const props = withDefaults(defineProps<Props>(), {
  state: 'off',
  color: 'yellow'
})

const ledClasses = computed(() => {
  const classes = ['kr-led']

  if (props.state === 'on') {
    classes.push(`kr-led--${props.color}`)
  }
  else if (props.state === 'blink') {
    classes.push('kr-led--blink')
  }

  return classes
})
</script>

<template>
  <div :class="ledClasses" />
</template>
