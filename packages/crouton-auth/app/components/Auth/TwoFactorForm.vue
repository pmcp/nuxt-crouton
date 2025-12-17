<script setup lang="ts">
/**
 * TwoFactorForm Component
 *
 * Form for two-factor authentication verification.
 * Supports TOTP codes and backup codes.
 *
 * @example
 * ```vue
 * <AuthTwoFactorForm @success="onVerified" />
 * ```
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'

interface Props {
  /** Show loading state */
  loading?: boolean
  /** External error message to display */
  error?: string | null
  /** Show trust device option */
  showTrustDevice?: boolean
  /** Initial mode */
  initialMode?: 'totp' | 'backup'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  showTrustDevice: true,
  initialMode: 'totp',
})

const emit = defineEmits<{
  /** Emitted when TOTP code is submitted */
  submitTotp: [data: { code: string, trustDevice: boolean }]
  /** Emitted when backup code is submitted */
  submitBackup: [code: string]
}>()

// Current mode
const mode = ref<'totp' | 'backup'>(props.initialMode)

// Form state
const state = reactive({
  code: '',
  trustDevice: false,
})

// Validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []
  if (!formState.code) {
    errors.push({ name: 'code', message: 'Code is required' })
  } else if (mode.value === 'totp' && !/^\d{6}$/.test(formState.code)) {
    errors.push({ name: 'code', message: 'Enter a 6-digit code' })
  } else if (mode.value === 'backup' && formState.code.length < 8) {
    errors.push({ name: 'code', message: 'Enter a valid backup code' })
  }
  return errors
}

// Handle form submission
function onSubmit(event: FormSubmitEvent<typeof state>) {
  if (mode.value === 'totp') {
    emit('submitTotp', {
      code: event.data.code,
      trustDevice: event.data.trustDevice,
    })
  } else {
    emit('submitBackup', event.data.code)
  }
}

// Toggle mode
function toggleMode() {
  mode.value = mode.value === 'totp' ? 'backup' : 'totp'
  state.code = ''
}
</script>

<template>
  <div>
    <UForm
      :validate="validate"
      :state="state"
      class="space-y-6"
      @submit="onSubmit"
    >
      <!-- TOTP Mode -->
      <template v-if="mode === 'totp'">
        <UFormField label="Authentication code" name="code">
          <UInput
            v-model="state.code"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="6"
            placeholder="000000"
            autocomplete="one-time-code"
            icon="i-lucide-key-round"
            class="font-mono tracking-widest"
          />
        </UFormField>
        <p class="text-sm text-muted">
          Enter the 6-digit code from your authenticator app.
        </p>

        <UCheckbox
          v-if="showTrustDevice"
          v-model="state.trustDevice"
          label="Trust this device for 30 days"
        />
      </template>

      <!-- Backup Code Mode -->
      <template v-else>
        <UFormField label="Backup code" name="code">
          <UInput
            v-model="state.code"
            type="text"
            placeholder="Enter backup code"
            autocomplete="off"
            icon="i-lucide-shield"
            class="font-mono"
          />
        </UFormField>
        <p class="text-sm text-muted">
          Enter one of your backup codes. Each code can only be used once.
        </p>
      </template>

      <!-- Error Alert -->
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-alert-circle"
        :title="error"
      />

      <UButton
        type="submit"
        block
        :loading="loading"
      >
        Verify
      </UButton>

      <!-- Toggle Mode -->
      <div class="text-center">
        <button
          type="button"
          class="text-sm font-medium text-primary hover:text-primary/80"
          @click="toggleMode"
        >
          {{ mode === 'totp' ? 'Use backup code instead' : 'Use authenticator app' }}
        </button>
      </div>
    </UForm>
  </div>
</template>
