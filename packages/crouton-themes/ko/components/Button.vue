<script setup lang="ts">
type ButtonVariant = 'default' | 'orange' | 'dark' | 'red' | 'pink' | 'blue'
type ButtonShape = 'square' | 'rect' | 'wide'
type ButtonAlign = 'center' | 'top' | 'left'

interface Props {
  variant?: ButtonVariant
  shape?: ButtonShape
  align?: ButtonAlign
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  shape: 'square',
  align: 'center',
  disabled: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const shapeClasses = {
  square: 'ko-btn--square',
  rect: 'ko-btn--rect',
  wide: 'ko-btn--wide'
}
</script>

<template>
  <div
    class="ko-btn-wrapper"
    :class="shapeClasses[props.shape]"
  >
    <button
      class="ko-btn"
      :class="[
        `ko-btn--${props.variant}`,
        `ko-btn--align-${props.align}`,
        { 'ko-btn--disabled': props.disabled }
      ]"
      :disabled="props.disabled"
      @click="emit('click', $event)"
    >
      <span class="ko-btn__text">
        <slot />
      </span>
      <div
        v-if="$slots.led"
        class="ko-btn__led"
      >
        <slot name="led" />
      </div>
    </button>
  </div>
</template>

<style scoped>
.ko-btn-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ko-surface-panel);
  border-radius: var(--ko-wrapper-radius);
}

/* === SHAPES === */
.ko-btn--square {
  width: var(--ko-button-size);
  height: var(--ko-button-size);
}

.ko-btn--rect {
  width: var(--ko-button-size);
  height: 2em;
}

.ko-btn--wide {
  width: calc(var(--ko-button-size) * 2 + 0.5em);
  height: 2em;
}

/* === BUTTON BASE === */
.ko-btn {
  width: 94%;
  height: 94%;
  border-radius: var(--ko-button-radius);
  border: none;
  outline: none;
  cursor: pointer;
  transition: all 0.1s ease-in-out;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'ko-tech', sans-serif;
  letter-spacing: 0.075em;
  font-size: 0.7em;
  text-transform: uppercase;
}

.ko-btn__text {
  transition: transform 0.1s ease-in-out;
}

/* === VARIANTS === */
.ko-btn--default {
  color: var(--ko-text-dark);
  background-color: var(--ko-surface-light);
  box-shadow:
    var(--ko-shadow-drop),
    var(--ko-highlight-light) 1.5px 1.5px 2px 0px inset,
    var(--ko-surface-light) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--default:active {
  box-shadow:
    var(--ko-shadow-pressed),
    inset 0.5px 0.5px 4px #000000,
    var(--ko-surface-light) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--orange {
  color: var(--ko-text-light);
  background-color: var(--ko-accent-orange);
  box-shadow:
    var(--ko-shadow-drop),
    var(--ko-highlight-orange) 1.5px 1.5px 1px 0px inset,
    var(--ko-accent-orange) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--orange:active {
  box-shadow:
    var(--ko-shadow-pressed),
    inset 0.5px 0.5px 4px #000000,
    var(--ko-accent-orange-dark) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--dark {
  color: var(--ko-text-light);
  background-color: var(--ko-surface-dark);
  box-shadow:
    var(--ko-shadow-drop),
    var(--ko-highlight-dark) 1.5px 1.5px 1px 0px inset,
    var(--ko-surface-dark) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--dark:active {
  box-shadow:
    var(--ko-shadow-pressed),
    inset 0.5px 0.5px 4px #000000,
    var(--ko-surface-dark) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--red {
  color: var(--ko-text-light);
  background-color: var(--ko-accent-red);
  box-shadow:
    var(--ko-shadow-drop),
    var(--ko-highlight-red) 1.5px 1.5px 1px 0px inset,
    var(--ko-accent-red) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--red:active {
  box-shadow:
    var(--ko-shadow-pressed),
    inset 0.5px 0.5px 4px #000000,
    var(--ko-accent-red) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--pink {
  color: var(--ko-text-light);
  background-color: var(--ko-accent-pink);
  box-shadow:
    var(--ko-shadow-drop),
    var(--ko-highlight-pink) 1.5px 1.5px 1px 0px inset,
    var(--ko-accent-pink) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--pink:active {
  box-shadow:
    var(--ko-shadow-pressed),
    inset 0.5px 0.5px 4px #000000,
    var(--ko-accent-pink) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--blue {
  color: var(--ko-text-light);
  background-color: var(--ko-accent-blue);
  box-shadow:
    var(--ko-shadow-drop),
    var(--ko-highlight-blue) 1.5px 1.5px 1px 0px inset,
    var(--ko-accent-blue) -3.2px -3.2px 8px 0px inset;
}

.ko-btn--blue:active {
  box-shadow:
    var(--ko-shadow-pressed),
    inset 0.5px 0.5px 4px #000000,
    var(--ko-accent-blue) -3.2px -3.2px 8px 0px inset;
}

/* === ALIGNMENT === */
.ko-btn--align-top {
  padding-top: 0.6em;
  align-items: flex-start;
}

.ko-btn--align-left {
  align-items: flex-start;
  justify-content: start;
  padding-top: 6px;
  padding-left: 10px;
  font-size: 1.4em;
}

/* === LED SLOT === */
.ko-btn__led {
  position: absolute;
  bottom: 10px;
  right: 11px;
}

/* === STATES === */
.ko-btn:active .ko-btn__text {
  transform: translateY(0.5px);
}

.ko-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
