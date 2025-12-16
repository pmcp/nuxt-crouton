<script setup lang="ts">
/**
 * Team Create Form Component
 *
 * Form to create a new team/organization.
 * Only shown in multi-tenant mode when user can create teams.
 *
 * @example
 * ```vue
 * <TeamCreateForm @success="onTeamCreated" @cancel="closeModal" />
 * ```
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'
import type { Team } from '../../../types'

interface Props {
  /** Show loading state */
  loading?: boolean
  /** External error message to display */
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
})

const emit = defineEmits<{
  /** Emitted when team is successfully created */
  success: [team: Team]
  /** Emitted when form is submitted */
  submit: [data: { name: string, slug: string }]
  /** Emitted when cancel is clicked */
  cancel: []
}>()

const { createTeam, canCreateTeam } = useTeam()
const toast = useToast()

// Form state
const state = reactive({
  name: '',
  slug: '',
})

// Auto-generate slug from name
const autoSlug = ref(true)
watch(
  () => state.name,
  (name) => {
    if (autoSlug.value) {
      state.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }
  },
)

// When user manually edits slug, stop auto-generating
function onSlugInput() {
  autoSlug.value = false
}

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
  } else if (formState.slug.length < 2) {
    errors.push({ name: 'slug', message: 'Slug must be at least 2 characters' })
  } else if (formState.slug.length > 30) {
    errors.push({ name: 'slug', message: 'Slug must be less than 30 characters' })
  }

  return errors
}

// Internal loading state
const internalLoading = ref(false)
const isLoading = computed(() => props.loading || internalLoading.value)

// Handle form submission
async function onSubmit(event: FormSubmitEvent<typeof state>) {
  emit('submit', { name: event.data.name, slug: event.data.slug })

  if (!canCreateTeam.value) {
    toast.add({
      title: 'Cannot create team',
      description: 'You have reached the maximum number of teams.',
      color: 'error',
    })
    return
  }

  internalLoading.value = true
  try {
    const team = await createTeam({
      name: event.data.name,
      slug: event.data.slug,
    })

    toast.add({
      title: 'Team created',
      description: `${team.name} has been created successfully.`,
      color: 'success',
    })

    emit('success', team)

    // Reset form
    state.name = ''
    state.slug = ''
    autoSlug.value = true
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create team'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    internalLoading.value = false
  }
}
</script>

<template>
  <UForm
    :validate="validate"
    :state="state"
    class="space-y-6"
    @submit="onSubmit"
  >
    <UFormField label="Team name" name="name" required>
      <UInput
        v-model="state.name"
        placeholder="My Team"
        icon="i-lucide-building-2"
        :disabled="isLoading"
      />
    </UFormField>

    <UFormField label="URL slug" name="slug" required>
      <template #hint>
        <span class="text-xs text-muted">
          Your team URL will be: /dashboard/<strong>{{ state.slug || 'your-slug' }}</strong>
        </span>
      </template>
      <UInput
        v-model="state.slug"
        placeholder="my-team"
        icon="i-lucide-link"
        :disabled="isLoading"
        @input="onSlugInput"
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
        @click="emit('cancel')"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        :loading="isLoading"
      >
        Create team
      </UButton>
    </div>
  </UForm>
</template>
