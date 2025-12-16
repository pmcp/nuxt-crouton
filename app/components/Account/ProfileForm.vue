<script setup lang="ts">
/**
 * Profile Form Component
 *
 * Form for updating user profile information (name, avatar).
 *
 * @example
 * ```vue
 * <AccountProfileForm @saved="onSaved" />
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
  /** Emitted when profile is saved */
  saved: []
}>()

const { user, refreshSession } = useAuth()
const toast = useToast()

// Get auth client for update operations
function useAuthClient() {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$authClient as ReturnType<typeof import('better-auth/client').createAuthClient>
}
const authClient = useAuthClient()

// Form state (populated from current user)
const state = reactive({
  name: '',
  image: '',
})

// Populate form when user changes
watch(
  () => user.value,
  (u) => {
    if (u) {
      state.name = u.name ?? ''
      state.image = u.image ?? ''
    }
  },
  { immediate: true },
)

// Track if form has changes
const hasChanges = computed(() => {
  if (!user.value) return false
  return (
    state.name !== (user.value.name ?? '') ||
    state.image !== (user.value.image ?? '')
  )
})

// Validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []

  if (!formState.name?.trim()) {
    errors.push({ name: 'name', message: 'Name is required' })
  } else if (formState.name.length < 2) {
    errors.push({ name: 'name', message: 'Name must be at least 2 characters' })
  } else if (formState.name.length > 100) {
    errors.push({ name: 'name', message: 'Name must be less than 100 characters' })
  }

  if (formState.image && !/^https?:\/\//.test(formState.image)) {
    errors.push({ name: 'image', message: 'Avatar must be a valid URL' })
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
    const result = await authClient.updateUser({
      name: event.data.name,
      image: event.data.image || undefined,
    })

    if (result.error) {
      throw new Error(result.error.message ?? 'Update failed')
    }

    await refreshSession()

    toast.add({
      title: 'Profile updated',
      description: 'Your profile has been saved.',
      color: 'success',
    })

    emit('saved')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update profile'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    internalLoading.value = false
  }
}

// Reset form to current user values
function resetForm() {
  if (user.value) {
    state.name = user.value.name ?? ''
    state.image = user.value.image ?? ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold">Profile</h3>
      <p class="text-sm text-muted mt-1">
        Update your personal information.
      </p>
    </div>

    <UForm
      :validate="validate"
      :state="state"
      class="space-y-6"
      @submit="onSubmit"
    >
      <!-- Avatar Preview -->
      <div class="flex items-center gap-4">
        <UAvatar
          v-if="state.image"
          :src="state.image"
          :alt="state.name"
          size="xl"
        />
        <div
          v-else
          class="flex items-center justify-center size-16 rounded-full bg-muted"
        >
          <UIcon
            name="i-lucide-user"
            class="size-8 text-muted-foreground"
          />
        </div>
        <div class="flex-1">
          <p class="font-medium">{{ state.name || 'Your Name' }}</p>
          <p class="text-sm text-muted">{{ user?.email }}</p>
        </div>
      </div>

      <USeparator />

      <UFormField label="Display name" name="name" required>
        <UInput
          v-model="state.name"
          placeholder="John Doe"
          icon="i-lucide-user"
          :disabled="isLoading"
        />
      </UFormField>

      <UFormField label="Avatar URL" name="image">
        <template #hint>
          <span class="text-xs text-muted">Optional. Enter a URL to your profile picture.</span>
        </template>
        <UInput
          v-model="state.image"
          placeholder="https://example.com/avatar.png"
          icon="i-lucide-image"
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
          :disabled="isLoading || !hasChanges"
          @click="resetForm"
        >
          Reset
        </UButton>
        <UButton
          type="submit"
          :loading="isLoading"
          :disabled="!hasChanges"
        >
          Save changes
        </UButton>
      </div>
    </UForm>
  </div>
</template>
