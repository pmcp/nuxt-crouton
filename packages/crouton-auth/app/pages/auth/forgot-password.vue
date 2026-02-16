<script setup lang="ts">
/**
 * Forgot Password Page
 *
 * Beautiful, modern forgot password page using UAuthForm.
 * Allows users to request a password reset email.
 */
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { t } = useT()
const toast = useToast()

const { forgotPassword } = useAuth()

// Track if email was sent
const emailSent = ref(false)
const sentEmail = ref('')

// Local submitting state
const submitting = ref(false)

// Form fields
const fields = computed<AuthFormField[]>(() => [{
  name: 'email',
  type: 'email',
  label: t('auth.email'),
  placeholder: 'you@example.com',
  required: true
}])

// Submit button config
const submitButton = computed(() => ({
  label: t('auth.sendResetLink'),
  loading: submitting.value,
  block: true
}))

// Handle form submission
async function onSubmit(event: FormSubmitEvent<{ email: string }>) {
  submitting.value = true
  try {
    await forgotPassword(event.data.email)
    emailSent.value = true
    sentEmail.value = event.data.email
    toast.add({
      title: 'Email sent',
      description: 'Check your inbox for a password reset link.',
      color: 'success'
    })
  } catch {
    // Don't reveal if email exists or not for security
    // Still show success message
    emailSent.value = true
    sentEmail.value = event.data.email
    toast.add({
      title: 'Email sent',
      description: 'If an account exists with this email, you will receive a reset link.',
      color: 'success'
    })
  } finally {
    submitting.value = false
  }
}

// Reset form state
function handleReset() {
  emailSent.value = false
  sentEmail.value = ''
}
</script>

<template>
  <UPageCard>
    <!-- Email sent confirmation -->
    <div
      v-if="emailSent"
      class="space-y-6"
    >
      <div class="text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <UIcon
            name="i-lucide-mail-check"
            class="h-6 w-6 text-success"
          />
        </div>
        <h2 class="mt-4 text-xl font-semibold text-highlighted">
          {{ t('auth.checkYourInbox') }}
        </h2>
        <p class="mt-2 text-muted">
          We sent a password reset link to
          <span class="font-medium text-highlighted">{{ sentEmail }}</span>
        </p>
      </div>

      <div class="space-y-3">
        <UButton
          variant="ghost"
          block
          @click="handleReset"
        >
          Try another email
        </UButton>
        <NuxtLink to="/auth/login">
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

    <!-- Forgot Password Form -->
    <UAuthForm
      v-else
      :fields="fields"
      :submit="submitButton"
      :disabled="submitting"
      :title="t('auth.resetYourPassword')"
      icon="i-lucide-key-round"
      @submit="onSubmit"
    >
      <template #description>
        {{ t('auth.resetPasswordDescription') }}
      </template>

      <template #footer>
        <NuxtLink
          to="/auth/login"
          class="text-primary font-medium"
        >
          {{ t('auth.backToSignIn') }}
        </NuxtLink>
      </template>
    </UAuthForm>
  </UPageCard>
</template>
