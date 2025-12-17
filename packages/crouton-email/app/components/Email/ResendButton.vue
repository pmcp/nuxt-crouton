<script setup lang="ts">
/**
 * ResendButton Component
 *
 * Timer-based resend button with cooldown functionality.
 * Shows countdown during cooldown, then allows resend.
 *
 * @example
 * ```vue
 * <EmailResendButton
 *   :cooldown="60"
 *   :loading="isResending"
 *   @resend="handleResend"
 * />
 * ```
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  /** Cooldown duration in seconds (default: 60) */
  cooldown?: number
  /** Loading state during resend */
  loading?: boolean
  /** Disabled state */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  cooldown: 60,
  loading: false,
  disabled: false,
})

const emit = defineEmits<{
  /** Emitted when button clicked and cooldown complete */
  resend: []
}>()

// Timer state
const remainingSeconds = ref(props.cooldown)
const isOnCooldown = computed(() => remainingSeconds.value > 0)

// Interval reference
let timerInterval: ReturnType<typeof setInterval> | null = null

// Start countdown timer
function startTimer() {
  remainingSeconds.value = props.cooldown

  timerInterval = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--
    } else {
      stopTimer()
    }
  }, 1000)
}

// Stop countdown timer
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

// Handle resend click
function handleResend() {
  if (isOnCooldown.value || props.loading || props.disabled) return
  emit('resend')
  startTimer()
}

// Start timer on mount
onMounted(() => {
  startTimer()
})

// Cleanup on unmount
onUnmounted(() => {
  stopTimer()
})

// Restart timer when cooldown prop changes
watch(() => props.cooldown, () => {
  stopTimer()
  startTimer()
})

// Format remaining time
const formattedTime = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60)
  const seconds = remainingSeconds.value % 60
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  return `${seconds}s`
})

// Button text
const buttonText = computed(() => {
  if (props.loading) return 'Sending...'
  if (isOnCooldown.value) return `Resend in ${formattedTime.value}`
  return 'Resend'
})

// Expose reset method for parent components
function reset() {
  stopTimer()
  remainingSeconds.value = 0
}

defineExpose({ reset, startTimer })
</script>

<template>
  <UButton
    variant="ghost"
    color="neutral"
    :loading="loading"
    :disabled="isOnCooldown || disabled"
    icon="i-lucide-refresh-cw"
    @click="handleResend"
  >
    {{ buttonText }}
  </UButton>
</template>
