<script setup lang="ts">
/**
 * Team Settings Component
 *
 * Form to update team settings (name, slug, logo).
 * Only accessible to team owners and admins.
 *
 * @example
 * ```vue
 * <TeamSettings @saved="onSaved" />
 * ```
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'
import type { Team } from '../../../types'

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
  /** Emitted when settings are saved */
  saved: [team: Team]
  /** Emitted when delete is requested */
  delete: []
}>()

const { currentTeam, updateTeam, isOwner, isAdmin } = useTeam()
const toast = useToast()

// Form state (populated from current team)
const state = reactive({
  name: '',
  slug: '',
  logo: '',
})

// Populate form when team changes
watch(
  currentTeam,
  (team) => {
    if (team) {
      state.name = team.name
      state.slug = team.slug
      state.logo = team.logo ?? ''
    }
  },
  { immediate: true },
)

// Track if form has changes
const hasChanges = computed(() => {
  if (!currentTeam.value) return false
  return (
    state.name !== currentTeam.value.name ||
    state.slug !== currentTeam.value.slug ||
    state.logo !== (currentTeam.value.logo ?? '')
  )
})

// Validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []

  if (!formState.name?.trim()) {
    errors.push({ name: 'name', message: 'Team name is required' })
  } else if (formState.name.length < 2) {
    errors.push({ name: 'name', message: 'Team name must be at least 2 characters' })
  } else if (formState.name.length > 50) {
    errors.push({ name: 'name', message: 'Team name must be less than 50 characters' })
  }

  if (!formState.slug?.trim()) {
    errors.push({ name: 'slug', message: 'URL slug is required' })
  } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(formState.slug)) {
    errors.push({ name: 'slug', message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  }

  if (formState.logo && !/^https?:\/\//.test(formState.logo)) {
    errors.push({ name: 'logo', message: 'Logo must be a valid URL' })
  }

  return errors
}

// Internal loading state
const internalLoading = ref(false)
const isLoading = computed(() => props.loading || internalLoading.value)

// Handle form submission
async function onSubmit(event: FormSubmitEvent<typeof state>) {
  if (!isAdmin.value) {
    toast.add({
      title: 'Permission denied',
      description: 'Only team owners and admins can update settings.',
      color: 'error',
    })
    return
  }

  internalLoading.value = true
  try {
    const team = await updateTeam({
      name: event.data.name,
      slug: event.data.slug,
      logo: event.data.logo || undefined,
    })

    toast.add({
      title: 'Settings saved',
      description: 'Team settings have been updated.',
      color: 'success',
    })

    emit('saved', team)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to save settings'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    internalLoading.value = false
  }
}

// Reset form to current team values
function resetForm() {
  if (currentTeam.value) {
    state.name = currentTeam.value.name
    state.slug = currentTeam.value.slug
    state.logo = currentTeam.value.logo ?? ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold">Team Settings</h3>
      <p class="text-sm text-muted mt-1">
        Manage your team's profile and settings.
      </p>
    </div>

    <UForm
      :validate="validate"
      :state="state"
      class="space-y-6"
      @submit="onSubmit"
    >
      <!-- Team Logo Preview -->
      <div class="flex items-center gap-4">
        <UAvatar
          v-if="state.logo"
          :src="state.logo"
          :alt="state.name"
          size="xl"
        />
        <div
          v-else
          class="flex items-center justify-center size-16 rounded-full bg-muted"
        >
          <UIcon
            name="i-lucide-building-2"
            class="size-8 text-muted-foreground"
          />
        </div>
        <div class="flex-1">
          <p class="font-medium">{{ state.name || 'Team Name' }}</p>
          <p class="text-sm text-muted">/dashboard/{{ state.slug || 'your-slug' }}</p>
        </div>
      </div>

      <USeparator />

      <UFormField label="Team name" name="name" required>
        <UInput
          v-model="state.name"
          placeholder="My Team"
          icon="i-lucide-building-2"
          :disabled="isLoading || !isAdmin"
        />
      </UFormField>

      <UFormField label="URL slug" name="slug" required>
        <template #hint>
          <span class="text-xs text-muted">
            Changing the slug will update all team URLs.
          </span>
        </template>
        <UInput
          v-model="state.slug"
          placeholder="my-team"
          icon="i-lucide-link"
          :disabled="isLoading || !isAdmin"
        />
      </UFormField>

      <UFormField label="Logo URL" name="logo">
        <template #hint>
          <span class="text-xs text-muted">Optional. Enter a URL to your team's logo.</span>
        </template>
        <UInput
          v-model="state.logo"
          placeholder="https://example.com/logo.png"
          icon="i-lucide-image"
          :disabled="isLoading || !isAdmin"
        />
      </UFormField>

      <!-- Error Alert -->
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-alert-circle"
        :title="error"
      />

      <div class="flex justify-between items-center">
        <UButton
          v-if="isOwner"
          variant="ghost"
          color="error"
          icon="i-lucide-trash-2"
          :disabled="isLoading"
          @click="emit('delete')"
        >
          Delete team
        </UButton>
        <div v-else />

        <div class="flex gap-3">
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
            :disabled="!hasChanges || !isAdmin"
          >
            Save changes
          </UButton>
        </div>
      </div>
    </UForm>
  </div>
</template>
