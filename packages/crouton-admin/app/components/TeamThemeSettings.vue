<script setup lang="ts">
/**
 * Team Theme Settings Component
 *
 * Form for customizing team visual appearance (primary color, neutral color, radius).
 */
import {
  PRIMARY_COLORS,
  NEUTRAL_COLORS,
  DEFAULT_THEME,
  type TeamThemeSettings
} from '../composables/useTeamTheme'

const emit = defineEmits<{
  saved: [settings: TeamThemeSettings]
}>()

const { t } = useT()
const { isAdmin } = useTeam()
const toast = useToast()
const { theme, isLoading, updateTheme, applyTheme } = useTeamTheme()

// Local form state for live preview
const localTheme = reactive<TeamThemeSettings>({
  primary: undefined,
  neutral: undefined,
  radius: undefined
})

// Sync local state with fetched theme
watch(theme, (newTheme) => {
  localTheme.primary = newTheme.primary
  localTheme.neutral = newTheme.neutral
  localTheme.radius = newTheme.radius
}, { immediate: true })

// Track if form has changes
const hasChanges = computed(() => {
  return (
    localTheme.primary !== theme.value.primary
    || localTheme.neutral !== theme.value.neutral
    || localTheme.radius !== theme.value.radius
  )
})

// Saving state
const isSaving = ref(false)

// Apply live preview when local theme changes
watch(localTheme, (newTheme) => {
  applyTheme(newTheme)
}, { deep: true })

// Handle save
async function handleSave() {
  if (!isAdmin.value) {
    toast.add({
      title: 'Permission denied',
      description: 'Only team admins can update theme settings.',
      color: 'error'
    })
    return
  }

  isSaving.value = true
  try {
    const saved = await updateTheme({
      primary: localTheme.primary,
      neutral: localTheme.neutral,
      radius: localTheme.radius
    })

    toast.add({
      title: t('common.saved') || 'Saved',
      description: 'Theme settings have been updated.',
      color: 'primary'
    })

    emit('saved', saved)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to save theme settings'
    toast.add({
      title: t('common.error') || 'Error',
      description: message,
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

// Handle reset to defaults
function handleReset() {
  localTheme.primary = DEFAULT_THEME.primary
  localTheme.neutral = DEFAULT_THEME.neutral
  localTheme.radius = DEFAULT_THEME.radius
}

// Revert to saved values
function revertChanges() {
  localTheme.primary = theme.value.primary
  localTheme.neutral = theme.value.neutral
  localTheme.radius = theme.value.radius
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold">Theme Settings</h3>
      <p class="text-sm text-muted mt-1">
        Customize your team's visual appearance. Changes preview in real-time.
      </p>
    </div>

    <USeparator />

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <template v-else>
      <!-- Live Preview Section -->
      <div class="space-y-3">
        <label class="text-sm font-medium text-default">Live Preview</label>
        <div class="p-4 border border-muted rounded-lg bg-muted/10 space-y-4">
          <div class="flex flex-wrap gap-2">
            <UButton color="primary">Primary Button</UButton>
            <UButton color="primary" variant="outline">Outline</UButton>
            <UButton color="primary" variant="soft">Soft</UButton>
            <UButton color="primary" variant="ghost">Ghost</UButton>
          </div>
          <div class="flex flex-wrap gap-2">
            <UBadge color="primary">Badge</UBadge>
            <UBadge color="primary" variant="outline">Outline</UBadge>
            <UBadge color="primary" variant="soft">Soft</UBadge>
          </div>
          <div class="max-w-xs">
            <UInput placeholder="Sample input..." icon="i-lucide-search" />
          </div>
        </div>
      </div>

      <USeparator />

      <!-- Primary Color Picker -->
      <TeamColorSwatchPicker
        v-model="localTheme.primary"
        :colors="PRIMARY_COLORS"
        label="Primary Color"
        :disabled="!isAdmin || isSaving"
      />

      <!-- Neutral Color Picker -->
      <TeamColorSwatchPicker
        v-model="localTheme.neutral"
        :colors="NEUTRAL_COLORS"
        label="Neutral Color"
        :disabled="!isAdmin || isSaving"
      />

      <!-- Border Radius Picker -->
      <TeamRadiusPicker
        v-model="localTheme.radius"
        :disabled="!isAdmin || isSaving"
      />

      <USeparator />

      <!-- Actions -->
      <div class="flex justify-between items-center">
        <UButton
          variant="ghost"
          color="neutral"
          :disabled="isSaving"
          @click="handleReset"
        >
          Reset to Defaults
        </UButton>

        <div class="flex gap-3">
          <UButton
            variant="ghost"
            :disabled="isSaving || !hasChanges"
            @click="revertChanges"
          >
            {{ t('common.cancel') || 'Cancel' }}
          </UButton>
          <UButton
            color="primary"
            :loading="isSaving"
            :disabled="!hasChanges || !isAdmin"
            @click="handleSave"
          >
            {{ t('common.saveChanges') || 'Save Changes' }}
          </UButton>
        </div>
      </div>

      <!-- Admin Warning -->
      <UAlert
        v-if="!isAdmin"
        color="warning"
        icon="i-lucide-shield-alert"
        title="Admin access required"
        description="Only team admins and owners can modify theme settings."
      />
    </template>
  </div>
</template>
