<script setup lang="ts">
import type { ConnectedAccount, AccountProvider } from '~/layers/triage/types'

/**
 * AccountPicker - Dropdown to select a connected account
 *
 * Shows available accounts for a given provider with status badges.
 * Includes a "Connect new" action at the bottom.
 */

interface Props {
  /** Selected account ID */
  modelValue?: string
  /** Filter by provider */
  provider: AccountProvider
  /** Team ID */
  teamId: string
  /** Placeholder text */
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  placeholder: 'Select account...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'connect-new': []
}>()

const { accounts, fetchAccounts } = useTriageConnectedAccounts(props.teamId)

// Fetch accounts on mount
onMounted(() => {
  fetchAccounts()
})

const filteredAccounts = computed(() =>
  accounts.value.filter(a => a.provider === props.provider),
)

const selectedAccount = computed(() =>
  accounts.value.find(a => a.id === props.modelValue),
)

function getStatusColor(status: string): string {
  switch (status) {
    case 'connected': return 'success'
    case 'expired': return 'warning'
    case 'revoked': return 'error'
    case 'error': return 'error'
    default: return 'neutral'
  }
}

function selectAccount(account: ConnectedAccount) {
  emit('update:modelValue', account.id)
}

function clearSelection() {
  emit('update:modelValue', undefined)
}

// Refresh accounts when teamId changes
watch(() => props.teamId, () => {
  fetchAccounts()
})
</script>

<template>
  <div class="space-y-2">
    <!-- Selected account display -->
    <div v-if="selectedAccount" class="flex items-center gap-2 p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium truncate">{{ selectedAccount.label }}</span>
          <UBadge
            :color="getStatusColor(selectedAccount.status)"
            size="xs"
            variant="subtle"
          >
            {{ selectedAccount.status }}
          </UBadge>
        </div>
        <p v-if="selectedAccount.accessTokenHint" class="text-xs text-gray-500 font-mono truncate">
          {{ selectedAccount.accessTokenHint }}
        </p>
      </div>
      <UButton
        icon="i-heroicons-x-mark"
        color="gray"
        variant="ghost"
        size="xs"
        @click="clearSelection"
      />
    </div>

    <!-- Account selector dropdown -->
    <UDropdownMenu
      v-if="!selectedAccount"
      :items="[
        filteredAccounts.map(account => ({
          label: account.label,
          description: account.accessTokenHint || account.providerAccountId,
          icon: account.status === 'connected' ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle',
          onSelect: () => selectAccount(account),
        })),
        [{
          label: 'Connect new account',
          icon: 'i-heroicons-plus',
          onSelect: () => emit('connect-new'),
        }],
      ]"
    >
      <UButton
        :label="placeholder"
        icon="i-heroicons-link"
        color="gray"
        variant="outline"
        class="w-full justify-start"
        trailing-icon="i-heroicons-chevron-down"
      />
    </UDropdownMenu>

    <!-- No accounts hint -->
    <p v-if="filteredAccounts.length === 0 && !selectedAccount" class="text-xs text-gray-500">
      No {{ provider }} accounts connected yet.
    </p>
  </div>
</template>
