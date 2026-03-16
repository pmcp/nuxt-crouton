<script setup lang="ts">
/**
 * Email Templates Page
 *
 * Customize auth email content per email type.
 * Only accessible by team admins/owners.
 *
 * @route /admin/[team]/team/email-templates
 */
const { teamSlug, teamId } = useTeamContext()
const { t } = useT()
const { isAdmin } = useTeam()
const notify = useNotify()

// Email types with metadata
const emailTypes = [
  {
    key: 'password-reset' as const,
    label: 'Password Reset',
    icon: 'i-lucide-key-round',
    description: 'Sent when a user requests a password reset.',
    variables: ['{{name}}', '{{brandName}}', '{{minutes}}'],
    defaults: {
      greeting: 'Hi {{name}}',
      body: 'Someone requested a password reset for your account. Click the link below to choose a new password.',
      buttonText: 'Reset password',
      footer: 'This link expires in {{minutes}} minutes. If you didn\'t request this, you can safely ignore this email.'
    }
  },
  {
    key: 'verification' as const,
    label: 'Email Verification',
    icon: 'i-lucide-mail-check',
    description: 'Sent when a user needs to verify their email.',
    variables: ['{{name}}', '{{brandName}}', '{{minutes}}'],
    defaults: {
      greeting: 'Hi {{name}}',
      body: 'Please verify your email address by clicking the link below.',
      buttonText: 'Verify email',
      footer: 'This link expires in {{minutes}} minutes. If you didn\'t create an account, you can safely ignore this email.'
    }
  },
  {
    key: 'magic-link' as const,
    label: 'Magic Link',
    icon: 'i-lucide-wand-sparkles',
    description: 'Sent when a user requests a magic link sign-in.',
    variables: ['{{name}}', '{{brandName}}', '{{minutes}}'],
    defaults: {
      greeting: 'Hi {{name}}',
      body: 'Click the link below to sign in to your {{brandName}} account.',
      buttonText: 'Sign in',
      footer: 'This link expires in {{minutes}} minutes. If you didn\'t request this, you can safely ignore this email.'
    }
  },
  {
    key: 'team-invite' as const,
    label: 'Team Invitation',
    icon: 'i-lucide-user-plus',
    description: 'Sent when a team member is invited.',
    variables: ['{{inviterName}}', '{{teamName}}', '{{role}}', '{{brandName}}'],
    defaults: {
      body: '{{inviterName}} has invited you to join {{teamName}} on {{brandName}}.',
      buttonText: 'Join {{teamName}}',
      footer: 'If you weren\'t expecting this invitation, you can safely ignore this email.'
    }
  },
  {
    key: 'welcome' as const,
    label: 'Welcome',
    icon: 'i-lucide-party-popper',
    description: 'Sent after a user creates their account.',
    variables: ['{{name}}', '{{brandName}}'],
    defaults: {
      greeting: 'Welcome aboard, {{name}}',
      body: 'Your account is ready. Here\'s how to get started:',
      buttonText: 'Get Started',
      footer: 'Questions? Just reply to this email — we\'re here to help.'
    }
  }
]

type EmailTypeKey = typeof emailTypes[number]['key']
type OverrideFields = { subject?: string, greeting?: string, body?: string, buttonText?: string, footer?: string }
type EmailSettings = Partial<Record<EmailTypeKey, OverrideFields>>

const isLoading = ref(true)
const isSaving = ref(false)
const activeType = ref<EmailTypeKey>('password-reset')
const settings = ref<EmailSettings>({})

// Current type metadata
const currentType = computed(() => emailTypes.find(t => t.key === activeType.value)!)

// Current form values (reactive proxy into settings)
const form = computed({
  get: () => settings.value[activeType.value] || {},
  set: (val: OverrideFields) => { settings.value[activeType.value] = val }
})

function updateField(field: keyof OverrideFields, value: string) {
  if (!settings.value[activeType.value]) {
    settings.value[activeType.value] = {}
  }
  settings.value[activeType.value]![field] = value || undefined
}

function getFieldValue(field: keyof OverrideFields): string {
  return form.value[field] || ''
}

function getPlaceholder(field: keyof OverrideFields): string {
  return currentType.value.defaults[field as keyof typeof currentType.value.defaults] || ''
}

// Whether current type has any overrides
function hasOverrides(key: EmailTypeKey): boolean {
  const overrides = settings.value[key]
  if (!overrides) return false
  return Object.values(overrides).some(v => v && v.trim())
}

async function loadSettings() {
  if (!teamId.value) return
  isLoading.value = true
  try {
    const data = await $fetch<EmailSettings>(`/api/teams/${teamId.value}/settings/email`)
    settings.value = data || {}
  } catch {
    // Settings may not exist yet
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (!teamId.value) return
  isSaving.value = true
  try {
    // Clean empty strings before saving
    const cleaned: EmailSettings = {}
    for (const [key, overrides] of Object.entries(settings.value)) {
      if (!overrides) continue
      const cleanedOverrides: OverrideFields = {}
      let hasValue = false
      for (const [field, value] of Object.entries(overrides)) {
        if (value && value.trim()) {
          (cleanedOverrides as any)[field] = value.trim()
          hasValue = true
        }
      }
      if (hasValue) {
        (cleaned as any)[key] = cleanedOverrides
      }
    }

    await $fetch(`/api/teams/${teamId.value}/settings/email`, {
      method: 'PATCH',
      body: cleaned
    })
    settings.value = cleaned
    notify.success('Saved', { description: 'Email template settings updated.' })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to save'
    notify.error('Error', { description: message })
  } finally {
    isSaving.value = false
  }
}

function resetType() {
  delete settings.value[activeType.value]
  settings.value = { ...settings.value }
}

onMounted(loadSettings)
</script>

<template>
  <div class="p-6">
    <!-- Not a team admin -->
    <div
      v-if="!isAdmin"
      class="text-center py-8"
    >
      <UIcon
        name="i-lucide-shield-alert"
        class="size-12 mx-auto mb-4 text-muted opacity-50"
      />
      <h3 class="text-lg font-medium">{{ t('common.accessRestricted') || 'Access Restricted' }}</h3>
      <p class="text-muted mt-2 max-w-md mx-auto">{{ t('teams.adminAccessRequired') || 'Admin access required' }}</p>
      <NuxtLink :to="`/admin/${teamSlug}/team`">
        <UButton
          :label="t('navigation.backToTeam') || 'Back to Team'"
          variant="outline"
          class="mt-4"
        />
      </NuxtLink>
    </div>

    <div v-else-if="isLoading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <div v-else class="space-y-6">
      <!-- Header -->
      <div>
        <h3 class="text-lg font-semibold">Email Templates</h3>
        <p class="text-sm text-muted mt-1">
          Customize the content of auth emails sent to your users. Leave fields empty to use defaults.
        </p>
      </div>

      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Email type selector (sidebar) -->
        <div class="lg:w-56 shrink-0">
          <nav class="flex lg:flex-col gap-1">
            <button
              v-for="type in emailTypes"
              :key="type.key"
              class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left w-full transition-colors"
              :class="[
                activeType === type.key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted hover:bg-elevated hover:text-default'
              ]"
              @click="activeType = type.key"
            >
              <UIcon :name="type.icon" class="size-4 shrink-0" />
              <span class="truncate">{{ type.label }}</span>
              <span
                v-if="hasOverrides(type.key)"
                class="size-1.5 rounded-full bg-primary ml-auto shrink-0"
              />
            </button>
          </nav>
        </div>

        <!-- Edit form -->
        <div class="flex-1 space-y-5">
          <!-- Type description -->
          <div class="flex items-start gap-3 p-3 rounded-lg bg-elevated">
            <UIcon :name="currentType.icon" class="size-5 text-muted mt-0.5 shrink-0" />
            <div>
              <p class="text-sm font-medium">{{ currentType.label }}</p>
              <p class="text-xs text-muted mt-0.5">{{ currentType.description }}</p>
            </div>
          </div>

          <!-- Available variables -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-xs text-muted">Variables:</span>
            <code
              v-for="v in currentType.variables"
              :key="v"
              class="text-xs px-1.5 py-0.5 rounded bg-elevated text-default font-mono"
            >{{ v }}</code>
          </div>

          <!-- Fields -->
          <div class="space-y-4">
            <UFormField label="Subject">
              <UInput
                :model-value="getFieldValue('subject')"
                placeholder="Leave empty for default"
                class="w-full"
                @update:model-value="updateField('subject', $event as string)"
              />
            </UFormField>

            <UFormField
              v-if="'greeting' in currentType.defaults"
              label="Greeting"
            >
              <UInput
                :model-value="getFieldValue('greeting')"
                :placeholder="getPlaceholder('greeting')"
                class="w-full"
                @update:model-value="updateField('greeting', $event as string)"
              />
            </UFormField>

            <UFormField label="Body">
              <UTextarea
                :model-value="getFieldValue('body')"
                :placeholder="getPlaceholder('body')"
                :rows="3"
                class="w-full"
                @update:model-value="updateField('body', $event as string)"
              />
            </UFormField>

            <UFormField
              v-if="'buttonText' in currentType.defaults"
              label="Button Text"
            >
              <UInput
                :model-value="getFieldValue('buttonText')"
                :placeholder="getPlaceholder('buttonText')"
                class="w-full"
                @update:model-value="updateField('buttonText', $event as string)"
              />
            </UFormField>

            <UFormField label="Footer">
              <UTextarea
                :model-value="getFieldValue('footer')"
                :placeholder="getPlaceholder('footer')"
                class="w-full"
                :rows="2"
                @update:model-value="updateField('footer', $event as string)"
              />
            </UFormField>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-2">
            <UButton
              v-if="hasOverrides(activeType)"
              label="Reset to defaults"
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-lucide-rotate-ccw"
              @click="resetType"
            />
            <div v-else />

            <UButton
              label="Save"
              :loading="isSaving"
              @click="save"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
