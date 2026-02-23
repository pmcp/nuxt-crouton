<script setup lang="ts">
import type { AppIdentity } from '../types/blocks'

interface Props {
  identity: AppIdentity
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [partial: Partial<AppIdentity>]
}>()

const collapsed = ref(false)
</script>

<template>
  <div class="identity-form">
    <!-- Mobile: collapsible card -->
    <div class="md:hidden">
      <button
        class="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium"
        @click="collapsed = !collapsed"
      >
        <UIcon name="i-lucide-pencil" class="w-4 h-4 text-muted" />
        <span class="flex-1 text-left truncate">
          {{ identity.name || 'App identity' }}
        </span>
        <UIcon
          :name="collapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
          class="w-4 h-4 text-muted"
        />
      </button>
    </div>

    <div
      :class="{ 'hidden': collapsed }"
      class="md:block space-y-3 px-1 pb-3 md:pb-0"
    >
      <UFormField label="App name">
        <UInput
          :model-value="identity.name"
          placeholder="My awesome app"
          @update:model-value="emit('update', { name: $event as string })"
        />
      </UFormField>

      <UFormField label="Description">
        <UTextarea
          :model-value="identity.description"
          placeholder="What does your app do?"
          :rows="2"
          autoresize
          @update:model-value="emit('update', { description: $event as string })"
        />
      </UFormField>
    </div>
  </div>
</template>
