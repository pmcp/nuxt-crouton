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
  error: null
})

const emit = defineEmits<{
  /** Emitted when settings are saved */
  saved: [team: Team]
  /** Emitted when delete is requested */
  delete: []
}>()

const { t } = useT()
const { currentTeam, updateTeam, isOwner, isAdmin } = useTeam()
const notify = useNotify()

// Form state (populated from current team)
const state = reactive({
  name: '',
  slug: '',
  logo: ''
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
  { immediate: true }
)

// Track if form has changes
const hasChanges = computed(() => {
  if (!currentTeam.value) return false
  return (
    state.name !== currentTeam.value.name
    || state.slug !== currentTeam.value.slug
    || state.logo !== (currentTeam.value.logo ?? '')
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
    notify.error('Permission denied', { description: 'Only team owners and admins can update settings.' })
    return
  }

  internalLoading.value = true
  try {
    const team = await updateTeam({
      name: event.data.name,
      slug: event.data.slug,
      logo: event.data.logo || undefined
    })

    notify.success('Settings saved', { description: 'Team settings have been updated.' })

    emit('saved', team)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to save settings'
    notify.error('Error', { description: message })
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
  <div class="space-y-8">
    <!-- Header -->
    <div>
      <h3 class="text-lg font-semibold">
        {{ t('teams.teamSettings') }}
      </h3>
      <p class="text-sm text-muted mt-1">
        {{ t('teams.teamSettingsDescription') }}
      </p>
    </div>

    <!-- Team Identity Preview -->
    <div class="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border border-default">
      <UAvatar
        v-if="state.logo"
        :src="state.logo"
        :alt="state.name"
        size="xl"
      />
      <div
        v-else
        class="flex items-center justify-center size-14 rounded-full bg-muted shrink-0"
      >
        <UIcon
          name="i-lucide-building-2"
          class="size-7 text-muted-foreground"
        />
      </div>
      <div>
        <p class="font-semibold">
          {{ state.name || t('teams.teamName') }}
        </p>
        <p class="text-sm text-muted">
          /{{ state.slug || 'your-slug' }}
        </p>
      </div>
    </div>

    <UForm
      :validate="validate"
      :state="state"
      class="space-y-0 divide-y divide-default"
      @submit="onSubmit"
    >
      <!-- Team Name -->
      <div class="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 sm:gap-8">
        <div>
          <p class="font-medium text-sm">
            {{ t('teams.teamName') }} <span class="text-error">*</span>
          </p>
          <p class="text-sm text-muted mt-0.5">
            {{ t('teams.teamNamePlaceholder') }}
          </p>
        </div>
        <UFormField name="name" class="flex items-start">
          <UInput
            v-model="state.name"
            :placeholder="t('teams.teamNamePlaceholder')"
            icon="i-lucide-building-2"
            :disabled="isLoading || !isAdmin"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- URL Slug -->
      <div class="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 sm:gap-8">
        <div>
          <p class="font-medium text-sm">
            {{ t('teams.urlSlug') }} <span class="text-error">*</span>
          </p>
          <p class="text-sm text-muted mt-0.5">
            {{ t('teams.urlSlugHint') }}
          </p>
        </div>
        <UFormField name="slug" class="flex items-start">
          <UInput
            v-model="state.slug"
            placeholder="my-team"
            icon="i-lucide-link"
            :disabled="isLoading || !isAdmin"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- Logo URL -->
      <div class="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 sm:gap-8">
        <div>
          <p class="font-medium text-sm">
            {{ t('teams.logoUrl') }}
          </p>
          <p class="text-sm text-muted mt-0.5">
            {{ t('teams.logoUrlHint') }}
          </p>
        </div>
        <UFormField name="logo" class="flex items-start">
          <UInput
            v-model="state.logo"
            placeholder="https://example.com/logo.png"
            icon="i-lucide-image"
            :disabled="isLoading || !isAdmin"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-alert-circle"
        :title="error"
        class="mt-4"
      />

      <!-- Actions -->
      <div class="flex justify-between items-center pt-6">
        <UButton
          v-if="isOwner"
          variant="ghost"
          color="error"
          icon="i-lucide-trash-2"
          :disabled="isLoading"
          @click="emit('delete')"
        >
          {{ t('teams.deleteTeam') }}
        </UButton>
        <div v-else />

        <div class="flex gap-3">
          <UButton
            variant="ghost"
            :disabled="isLoading || !hasChanges"
            @click="resetForm"
          >
            {{ t('common.reset') }}
          </UButton>
          <UButton
            type="submit"
            :loading="isLoading"
            :disabled="!hasChanges || !isAdmin"
          >
            {{ t('common.saveChanges') }}
          </UButton>
        </div>
      </div>
    </UForm>
  </div>
</template>
