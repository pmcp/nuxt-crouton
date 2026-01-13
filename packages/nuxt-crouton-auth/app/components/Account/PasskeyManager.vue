<script setup lang="ts">
/**
 * Passkey Manager Component
 *
 * Lists and manages registered passkeys/WebAuthn credentials.
 * Allows adding new passkeys and removing existing ones.
 *
 * @example
 * ```vue
 * <AccountPasskeyManager />
 * ```
 */
import type { PasskeyInfo } from '../../composables/useAuth'

interface Props {
  /** External loading state */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const { t } = useT()
const {
  hasPasskeys,
  addPasskey,
  listPasskeys,
  deletePasskey,
  isWebAuthnSupported
} = useAuth()
const toast = useToast()

// Passkeys list
const passkeys = ref<PasskeyInfo[]>([])

// Loading states
const listLoading = ref(false)
const addLoading = ref(false)
const deleteLoading = ref<string | null>(null)

const isLoading = computed(() => props.loading || listLoading.value)

// Check browser support
const browserSupported = ref(false)
onMounted(() => {
  browserSupported.value = isWebAuthnSupported()
  if (browserSupported.value && hasPasskeys.value) {
    loadPasskeys()
  }
})

// Load passkeys
async function loadPasskeys() {
  listLoading.value = true
  try {
    passkeys.value = await listPasskeys()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('account.passkey.failedToLoadPasskeys')
    toast.add({
      title: t('errors.generic'),
      description: message,
      color: 'error'
    })
  } finally {
    listLoading.value = false
  }
}

// Add new passkey
async function handleAddPasskey() {
  addLoading.value = true
  try {
    await addPasskey({
      name: t('account.passkey.defaultName', { number: passkeys.value.length + 1 })
    })

    toast.add({
      title: t('account.passkey.passkeyAdded'),
      description: t('account.passkey.passkeyAddedDescription'),
      color: 'success'
    })

    // Reload list
    await loadPasskeys()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('account.passkey.failedToAddPasskey')
    toast.add({
      title: t('errors.generic'),
      description: message,
      color: 'error'
    })
  } finally {
    addLoading.value = false
  }
}

// Delete passkey
async function handleDeletePasskey(id: string) {
  deleteLoading.value = id
  try {
    await deletePasskey(id)

    toast.add({
      title: t('account.passkey.passkeyRemoved'),
      description: t('account.passkey.passkeyRemovedDescription'),
      color: 'success'
    })

    // Remove from local list
    passkeys.value = passkeys.value.filter(p => p.id !== id)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('account.passkey.failedToDeletePasskey')
    toast.add({
      title: t('errors.generic'),
      description: message,
      color: 'error'
    })
  } finally {
    deleteLoading.value = null
  }
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">
          {{ t('account.passkeys') }}
        </h3>
        <p class="text-sm text-muted mt-1">
          {{ t('account.passkeysDescription') }}
        </p>
      </div>

      <UButton
        v-if="browserSupported && hasPasskeys"
        icon="i-lucide-plus"
        :loading="addLoading"
        :disabled="isLoading"
        @click="handleAddPasskey"
      >
        {{ t('account.addPasskey') }}
      </UButton>
    </div>

    <!-- Browser not supported -->
    <UAlert
      v-if="!browserSupported"
      color="warning"
      icon="i-lucide-alert-triangle"
      :title="t('account.browserNotSupported')"
      :description="t('account.browserNotSupportedDesc')"
    />

    <!-- Passkeys disabled -->
    <UAlert
      v-else-if="!hasPasskeys"
      color="info"
      icon="i-lucide-info"
      :title="t('account.passkeysNotEnabled')"
      :description="t('account.passkeysNotEnabledDesc')"
    />

    <!-- Loading skeleton -->
    <div
      v-else-if="listLoading"
      class="space-y-3"
    >
      <div
        v-for="i in 2"
        :key="i"
        class="flex items-center gap-4 p-4 rounded-lg border border-muted"
      >
        <USkeleton class="size-10 rounded-lg" />
        <div class="flex-1 space-y-2">
          <USkeleton class="h-4 w-32" />
          <USkeleton class="h-3 w-48" />
        </div>
        <USkeleton class="h-8 w-20" />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="passkeys.length === 0"
      class="text-center py-8 px-4 rounded-lg border border-dashed border-muted"
    >
      <UIcon
        name="i-lucide-fingerprint"
        class="size-12 text-muted-foreground mx-auto mb-4"
      />
      <p class="font-medium">
        {{ t('account.noPasskeysRegistered') }}
      </p>
      <p class="text-sm text-muted mt-1">
        {{ t('account.noPasskeysRegisteredDesc') }}
      </p>
      <UButton
        class="mt-4"
        icon="i-lucide-plus"
        :loading="addLoading"
        @click="handleAddPasskey"
      >
        {{ t('account.addFirstPasskey') }}
      </UButton>
    </div>

    <!-- Passkeys list -->
    <div
      v-else
      class="space-y-3"
    >
      <div
        v-for="passkey in passkeys"
        :key="passkey.id"
        class="flex items-center gap-4 p-4 rounded-lg border border-muted hover:bg-muted/50 transition-colors"
      >
        <div class="flex items-center justify-center size-10 rounded-lg bg-primary/10">
          <UIcon
            name="i-lucide-fingerprint"
            class="size-5 text-primary"
          />
        </div>

        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">
            {{ passkey.name }}
          </p>
          <p class="text-sm text-muted">
            {{ t('account.addedOn', { date: formatDate(passkey.createdAt) }) }}
          </p>
        </div>

        <UButton
          variant="ghost"
          color="error"
          icon="i-lucide-trash-2"
          size="sm"
          :loading="deleteLoading === passkey.id"
          :disabled="isLoading || deleteLoading !== null"
          @click="handleDeletePasskey(passkey.id)"
        >
          {{ t('common.remove') }}
        </UButton>
      </div>
    </div>

    <!-- Info about passkeys -->
    <UAlert
      v-if="browserSupported && hasPasskeys"
      color="info"
      variant="soft"
      icon="i-lucide-shield"
    >
      <template #title>
        {{ t('account.aboutPasskeys') }}
      </template>
      <template #description>
        {{ t('account.aboutPasskeysDesc') }}
      </template>
    </UAlert>
  </div>
</template>
