<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()
const croutonConfig = computed(() => runtimeConfig.public.croutonConfig as Record<string, any> | null)

const hasConfig = computed(() => !!croutonConfig.value && Object.keys(croutonConfig.value).length > 0)

const formattedConfig = computed(() => {
  if (!croutonConfig.value) return ''
  return JSON.stringify(croutonConfig.value, null, 2)
})

const isOpen = ref(false)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-settings-2" class="w-5 h-5 text-gray-500" />
          <span class="font-semibold">{{ $t('setup.generatorConfig') }}</span>
        </div>
        <UBadge
          v-if="hasConfig"
          label="crouton.config.js"
          color="success"
          variant="subtle"
          size="xs"
        />
        <UBadge
          v-else
          :label="$t('setup.notConfigured')"
          color="warning"
          variant="subtle"
          size="xs"
        />
      </div>
    </template>

    <div v-if="hasConfig">
      <UCollapsible v-model:open="isOpen" class="flex flex-col gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="w-full justify-between"
          :trailing-icon="isOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          :ui="{ trailingIcon: 'transition-transform duration-200' }"
          block
        >
          {{ isOpen ? $t('setup.hideConfig') : $t('setup.showConfig') }}
        </UButton>

        <template #content>
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
            <pre class="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ formattedConfig }}</pre>
          </div>
        </template>
      </UCollapsible>
    </div>

    <div
      v-else
      class="text-sm text-gray-500 dark:text-gray-400"
    >
      <p>{{ $t('setup.noConfigFile', { file: 'crouton.config.js' }) }}</p>
      <p class="mt-2">{{ $t('setup.configDescription') }}</p>
    </div>
  </UCard>
</template>
