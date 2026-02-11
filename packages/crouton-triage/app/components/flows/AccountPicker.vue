<script setup lang="ts">
import type { ConnectedAccount, AccountProvider } from '~/layers/triage/types'

interface Props {
  modelValue?: string
  provider: AccountProvider
  teamId: string
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

onMounted(() => {
  fetchAccounts()
})

const filteredAccounts = computed(() =>
  accounts.value.filter(a => a.provider === props.provider),
)

const selectedAccount = computed(() =>
  accounts.value.find(a => a.id === props.modelValue),
)

const hasAccounts = computed(() => filteredAccounts.value.length > 0)

function getStatusColor(status: string): string {
  switch (status) {
    case 'connected': return 'success'
    case 'expired': return 'warning'
    case 'revoked':
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

watch(() => props.teamId, () => {
  fetchAccounts()
})

defineExpose({ fetchAccounts })
</script>

<template>
  <div class="space-y-1.5">
    <!-- Selected account display -->
    <div v-if="selectedAccount" class="flex items-center gap-2 p-2 rounded-md border border-(--ui-border-accented) bg-(--ui-bg-muted)">
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
        <p v-if="selectedAccount.accessTokenHint" class="text-xs text-(--ui-text-muted) font-mono truncate">
          {{ selectedAccount.accessTokenHint }}
        </p>
      </div>
      <UButton
        icon="i-heroicons-x-mark"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="clearSelection"
      />
    </div>

    <!-- Account selector dropdown (only if there are accounts to pick from) -->
    <UDropdownMenu
      v-else-if="hasAccounts"
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
        color="neutral"
        variant="outline"
        class="w-full justify-start"
        trailing-icon="i-heroicons-chevron-down"
      />
    </UDropdownMenu>

    <!-- No accounts — show connect button -->
    <div v-else>
      <UButton
        label="Connect new account"
        icon="i-heroicons-plus"
        color="neutral"
        variant="outline"
        size="sm"
        @click="emit('connect-new')"
      />
    </div>
  </div>
</template>
