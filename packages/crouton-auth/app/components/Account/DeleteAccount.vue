<script setup lang="ts">
/**
 * Delete Account Component
 *
 * Allows users to permanently delete their account.
 * Requires password confirmation and typing to confirm.
 *
 * @example
 * ```vue
 * <AccountDeleteAccount />
 * ```
 */
interface Props {
  /** External loading state */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  /** Emitted when account is deleted */
  deleted: []
}>()

const { user, logout } = useAuth()
const toast = useToast()

// Get auth client
function useAuthClient() {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$authClient as ReturnType<typeof import('better-auth/client').createAuthClient>
}
const authClient = useAuthClient()

// Modal state
const showModal = ref(false)

// Form state
const password = ref('')
const confirmText = ref('')

// Loading state
const deleteLoading = ref(false)
const isLoading = computed(() => props.loading || deleteLoading.value)

// Confirmation text required
const confirmationRequired = 'delete my account'
const isConfirmed = computed(() => {
  return confirmText.value.toLowerCase() === confirmationRequired
})

// Handle delete
async function handleDelete() {
  if (!isConfirmed.value || !password.value) return

  deleteLoading.value = true
  try {
    const result = await authClient.deleteUser({
      password: password.value,
    })

    if (result.error) {
      throw new Error(result.error.message ?? 'Failed to delete account')
    }

    toast.add({
      title: 'Account deleted',
      description: 'Your account has been permanently deleted.',
      color: 'success',
    })

    // Sign out and redirect
    await logout()
    emit('deleted')
    await navigateTo('/')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to delete account'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    deleteLoading.value = false
  }
}

// Reset form on modal close
watch(showModal, (open) => {
  if (!open) {
    password.value = ''
    confirmText.value = ''
  }
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold text-error">Delete Account</h3>
      <p class="text-sm text-muted mt-1">
        Permanently delete your account and all associated data.
      </p>
    </div>

    <UAlert
      color="error"
      variant="soft"
      icon="i-lucide-alert-triangle"
    >
      <template #title>This action cannot be undone</template>
      <template #description>
        <p>Deleting your account will:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Permanently remove all your personal data</li>
          <li>Cancel any active subscriptions</li>
          <li>Remove you from all teams</li>
          <li>Delete any content you've created</li>
        </ul>
      </template>
    </UAlert>

    <UButton
      color="error"
      variant="soft"
      icon="i-lucide-trash-2"
      @click="showModal = true"
    >
      Delete my account
    </UButton>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showModal">
      <template #content>
        <div class="p-6 space-y-6">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center size-10 rounded-full bg-error/10">
              <UIcon
                name="i-lucide-alert-triangle"
                class="size-5 text-error"
              />
            </div>
            <div>
              <h3 class="text-lg font-semibold">Delete Account</h3>
              <p class="text-sm text-muted">
                This action is permanent and cannot be undone.
              </p>
            </div>
          </div>

          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
          >
            <template #description>
              <p>You are about to permanently delete your account:</p>
              <p class="font-semibold mt-1">{{ user?.email }}</p>
            </template>
          </UAlert>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">
                Enter your password:
              </label>
              <UInput
                v-model="password"
                type="password"
                placeholder="Your password"
                icon="i-lucide-lock"
                :disabled="isLoading"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">
                Type <strong class="font-mono text-error">{{ confirmationRequired }}</strong> to confirm:
              </label>
              <UInput
                v-model="confirmText"
                :placeholder="confirmationRequired"
                :disabled="isLoading"
                class="font-mono"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <UButton
              variant="ghost"
              :disabled="isLoading"
              @click="showModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="isLoading"
              :disabled="!isConfirmed || !password"
              icon="i-lucide-trash-2"
              @click="handleDelete"
            >
              Delete account
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
