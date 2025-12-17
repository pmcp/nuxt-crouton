<script setup lang="ts">
/**
 * MagicLinkSent Component
 *
 * "Check your email for magic link" message with resend option.
 * Shows email address with option to change and resend functionality.
 *
 * @example
 * ```vue
 * <EmailMagicLinkSent
 *   :email="userEmail"
 *   @resend="handleResend"
 *   @change-email="handleChangeEmail"
 * />
 * ```
 */
import { ref } from 'vue'

interface Props {
  /** Email address where magic link was sent */
  email: string
  /** Resend cooldown in seconds (default: 60) */
  resendCooldown?: number
  /** Loading state while resending */
  loading?: boolean
  /** External error message */
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  resendCooldown: 60,
  loading: false,
  error: '',
})

const emit = defineEmits<{
  /** Emitted when resend is requested */
  resend: []
  /** Emitted when user wants to change email */
  'change-email': []
}>()

// Local state
const isResending = ref(false)

// Handle resend
async function handleResend() {
  isResending.value = true
  emit('resend')
  // Reset resending state after a short delay
  setTimeout(() => {
    isResending.value = false
  }, 1000)
}

// Handle change email
function handleChangeEmail() {
  emit('change-email')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with email icon -->
    <div class="text-center">
      <div class="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <UIcon name="i-lucide-wand-2" class="w-8 h-8 text-primary" />
      </div>
      <h2 class="text-xl font-semibold text-default">Check your email</h2>
      <p class="text-sm text-muted mt-2">
        We sent a magic link to
      </p>
    </div>

    <!-- Email display -->
    <div class="bg-muted/50 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <UIcon name="i-lucide-mail" class="w-5 h-5 text-primary" />
          </div>
          <span class="font-medium text-default">{{ email }}</span>
        </div>
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-pencil"
          @click="handleChangeEmail"
        >
          Edit
        </UButton>
      </div>
    </div>

    <!-- Error message -->
    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
    />

    <!-- Instructions -->
    <div class="space-y-3">
      <p class="text-sm text-muted text-center">
        Click the link in the email to sign in. The link will expire in 10 minutes.
      </p>

      <!-- Resend section -->
      <div class="flex items-center justify-center gap-1 text-sm text-muted">
        <span>Didn't receive the email?</span>
        <EmailResendButton
          :cooldown="resendCooldown"
          :loading="loading || isResending"
          @resend="handleResend"
        />
      </div>
    </div>

    <!-- Help tips -->
    <div class="bg-muted/30 rounded-lg p-4 space-y-2">
      <p class="text-xs font-medium text-default">Tips:</p>
      <ul class="text-xs text-muted space-y-1 list-disc list-inside">
        <li>Check your spam or junk folder</li>
        <li>Make sure the email address is correct</li>
        <li>The link expires after 10 minutes</li>
      </ul>
    </div>

    <!-- Back button -->
    <UButton
      block
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-left"
      @click="handleChangeEmail"
    >
      Try a different email
    </UButton>
  </div>
</template>
