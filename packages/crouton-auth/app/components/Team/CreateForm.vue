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

const { t } = useT()

interface Props {
  /** Show loading state */
  loading?: boolean
  /** External error message to display */
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null
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
  slug: ''
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
  }
)

// When user manually edits slug, stop auto-generating
function onSlugInput() {
  autoSlug.value = false
}

// Validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []

  if (!formState.name?.trim()) {
    errors.push({ name: 'name', message: t('errors.requiredField') })
  } else if (formState.name.length < 2) {
    errors.push({ name: 'name', message: t('errors.minLength', { min: 2 }) })
  } else if (formState.name.length > 50) {
    errors.push({ name: 'name', message: t('errors.maxLength', { max: 50 }) })
  }

  if (!formState.slug?.trim()) {
    errors.push({ name: 'slug', message: t('errors.requiredField') })
  } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(formState.slug)) {
    errors.push({ name: 'slug', message: t('teams.slugValidation') })
  } else if (formState.slug.length < 2) {
    errors.push({ name: 'slug', message: t('errors.minLength', { min: 2 }) })
  } else if (formState.slug.length > 30) {
    errors.push({ name: 'slug', message: t('errors.maxLength', { max: 30 }) })
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
      title: t('teams.cannotCreateTeam'),
      description: t('teams.maxTeamsReached'),
      color: 'error'
    })
    return
  }

  internalLoading.value = true
  try {
    const team = await createTeam({
      name: event.data.name,
      slug: event.data.slug
    })

    toast.add({
      title: t('teams.teamCreated'),
      description: t('teams.teamCreatedDescription', { name: team.name }),
      color: 'success'
    })

    emit('success', team)

    // Reset form
    state.name = ''
    state.slug = ''
    autoSlug.value = true
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('teams.failedToCreateTeam')
    toast.add({
      title: t('errors.generic'),
      description: message,
      color: 'error'
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
    <UFormField
      :label="t('teams.teamName')"
      name="name"
      required
    >
      <UInput
        v-model="state.name"
        placeholder="My Team"
        icon="i-lucide-building-2"
        :disabled="isLoading"
      />
    </UFormField>

    <UFormField
      :label="t('teams.urlSlug')"
      name="slug"
      required
    >
      <template #hint>
        <span class="text-xs text-muted">
          {{ t('teams.urlSlugHintPrefix') }} /<strong>{{ state.slug || t('teams.yourSlug') }}</strong>
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
        {{ t('common.cancel') }}
      </UButton>
      <UButton
        type="submit"
        :loading="isLoading"
      >
        {{ t('teams.createTeam') }}
      </UButton>
    </div>
  </UForm>
</template>
