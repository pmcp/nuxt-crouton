<script setup lang="ts">
/**
 * Account Settings Modal
 *
 * Wraps AccountSettings in a UModal for use in public pages nav.
 * Opens via useAccountSettingsModal() composable.
 */
const { isOpen, defaultTab } = useAccountSettingsModal()
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #content="{ close }">
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div />
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="close"
          />
        </div>
        <AccountSettings :default-tab="defaultTab" />
      </div>
    </template>
  </UModal>
</template>
