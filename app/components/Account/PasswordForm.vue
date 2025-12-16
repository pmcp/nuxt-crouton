<script setup lang="ts">
/**
 * Password Form Component
 *
 * Form for changing user password.
 * Requires current password and new password confirmation.
 *
 * @example
 * ```vue
 * <AccountPasswordForm @saved="onSaved" />
 * ```
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'

interface Props {
  /** External loading state */
  loading?: boolean
  /** External error message */
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
})

const emit = defineEmits<{
  /** Emitted when password is changed */
  saved: []
}>()

const toast = useToast()

// Get auth client for password change
function useAuthClient() {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$authClient as ReturnType<typeof import('better-auth/client').createAuthClient>
}
const authClient = useAuthClient()

// Form state
const state = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// Validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []

  if (!formState.currentPassword?.trim()) {
    errors.push({ name: 'currentPassword', message: 'Current password is required' })
  }

  if (!formState.newPassword?.trim()) {
    errors.push({ name: 'newPassword', message: 'New password is required' })
  } else if (formState.newPassword.length < 8) {
    errors.push({ name: 'newPassword', message: 'Password must be at least 8 characters' })
  }

  if (!formState.confirmPassword?.trim()) {
    errors.push({ name: 'confirmPassword', message: 'Please confirm your new password' })
  } else if (formState.newPassword !== formState.confirmPassword) {
    errors.push({ name: 'confirmPassword', message: 'Passwords do not match' })
  }

  return errors
}

// Internal loading state
const internalLoading = ref(false)
const isLoading = computed(() => props.loading || internalLoading.value)

// Handle form submission
async function onSubmit(event: FormSubmitEvent<typeof state>) {
  internalLoading.value = true
  try {
    const result = await authClient.changePassword({
      currentPassword: event.data.currentPassword,
      newPassword: event.data.newPassword,
    })

    if (result.error) {
      throw new Error(result.error.message ?? 'Password change failed')
    }

    toast.add({
      title: 'Password updated',
      description: 'Your password has been changed successfully.',
      color: 'success',
    })

    // Clear form
    state.currentPassword = ''
    state.newPassword = ''
    state.confirmPassword = ''

    emit('saved')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to change password'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    internalLoading.value = false
  }
}

// Reset form
function resetForm() {
  state.currentPassword = ''
  state.newPassword = ''
  state.confirmPassword = ''
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold">Change Password</h3>
      <p class="text-sm text-muted mt-1">
        Update your password to keep your account secure.
      </p>
    </div>

    <UForm
      :validate="validate"
      :state="state"
      class="space-y-6"
      @submit="onSubmit"
    >
      <UFormField label="Current password" name="currentPassword" required>
        <UInput
          v-model="state.currentPassword"
          type="password"
          placeholder="Enter current password"
          icon="i-lucide-lock"
          :disabled="isLoading"
        />
      </UFormField>

      <USeparator />

      <UFormField label="New password" name="newPassword" required>
        <template #hint>
          <span class="text-xs text-muted">Minimum 8 characters</span>
        </template>
        <UInput
          v-model="state.newPassword"
          type="password"
          placeholder="Enter new password"
          icon="i-lucide-key"
          :disabled="isLoading"
        />
      </UFormField>

      <UFormField label="Confirm new password" name="confirmPassword" required>
        <UInput
          v-model="state.confirmPassword"
          type="password"
          placeholder="Confirm new password"
          icon="i-lucide-key"
          :disabled="isLoading"
        />
      </UFormField>

      <!-- Error Alert -->
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-alert-circle"
        :title="error"
      />

      <div class="flex justify-end gap-3">
        <UButton
          variant="ghost"
          :disabled="isLoading"
          @click="resetForm"
        >
          Clear
        </UButton>
        <UButton
          type="submit"
          :loading="isLoading"
        >
          Update password
        </UButton>
      </div>
    </UForm>
  </div>
</template>
