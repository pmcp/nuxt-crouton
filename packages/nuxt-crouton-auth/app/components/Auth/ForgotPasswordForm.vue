<script setup lang="ts">
/**
 * ForgotPasswordForm Component
 *
 * Form for requesting password reset email.
 * Shows email input and handles sent state.
 *
 * @example
 * ```vue
 * <AuthForgotPasswordForm @success="onSent" />
 * ```
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'

const { t } = useT()

interface Props {
  /** Show loading state */
  loading?: boolean
  /** External error message to display */
  error?: string | null
  /** Whether email has been sent */
  sent?: boolean
  /** Show back to login link */
  showBackLink?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  sent: false,
  showBackLink: true
})

const emit = defineEmits<{
  /** Emitted when form is submitted with valid email */
  submit: [email: string]
  /** Emitted when user clicks to try again */
  reset: []
}>()

// Local sent state (can be overridden by prop)
const localSent = ref(false)
const isSent = computed(() => props.sent || localSent.value)

// Form state
const state = reactive({
  email: ''
})

// Validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []
  if (!formState.email) {
    errors.push({ name: 'email', message: t('errors.requiredField') })
  } else if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(formState.email)) {
    errors.push({ name: 'email', message: t('errors.invalidEmail') })
  }
  return errors
}

// Handle form submission
function onSubmit(event: FormSubmitEvent<typeof state>) {
  emit('submit', event.data.email)
  localSent.value = true
}

// Handle reset
function handleReset() {
  localSent.value = false
  emit('reset')
}
</script>

<template>
  <div>
    <!-- Email sent confirmation -->
    <div v-if="isSent">
      <UAlert
        color="success"
        icon="i-lucide-mail-check"
        :title="t('auth.checkYourInbox')"
        :description="t('auth.resetLinkSentDescription')"
      />

      <div class="mt-6 space-y-3">
        <UButton
          variant="ghost"
          block
          @click="handleReset"
        >
          {{ t('auth.tryAnotherEmail') }}
        </UButton>
        <NuxtLink
          v-if="showBackLink"
          to="/auth/login"
        >
          <UButton
            color="neutral"
            variant="outline"
            block
          >
            {{ t('auth.backToSignIn') }}
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Form -->
    <UForm
      v-else
      :validate="validate"
      :state="state"
      class="space-y-6"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('auth.email')"
        name="email"
      >
        <UInput
          v-model="state.email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          icon="i-lucide-mail"
        />
      </UFormField>

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
        {{ t('auth.sendResetLink') }}
      </UButton>

      <div
        v-if="showBackLink"
        class="text-center"
      >
        <NuxtLink
          to="/auth/login"
          class="text-sm font-medium text-primary hover:text-primary/80"
        >
          {{ t('auth.backToSignIn') }}
        </NuxtLink>
      </div>
    </UForm>
  </div>
</template>
