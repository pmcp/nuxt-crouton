<script setup lang="ts">
import type { Artifact } from '../../layers/thinkgraph/collections/decisions/types'

interface DispatchServiceInfo {
  id: string
  name: string
  description: string
  type: 'image' | 'code' | 'prototype' | 'text'
  icon: string
  options: Array<{
    key: string
    label: string
    type: 'select' | 'text'
    choices?: string[]
    default?: string
  }>
  available: boolean
}

const props = defineProps<{
  decisionId: string | null
  decisionContent?: string
}>()

const emit = defineEmits<{
  dispatched: [nodeId: string]
  close: []
}>()

const open = defineModel<boolean>('open', { default: false })

const { teamId } = useTeamContext()

// State
const step = ref<'pick' | 'configure' | 'loading' | 'result'>('pick')
const selectedService = ref<DispatchServiceInfo | null>(null)
const customPrompt = ref('')
const serviceOptions = ref<Record<string, string>>({})
const result = ref<{ artifacts: Artifact[]; content: string } | null>(null)
const error = ref<string | null>(null)

// Fetch available services
const { data: services } = await useFetch<DispatchServiceInfo[]>(
  () => `/api/teams/${teamId.value}/thinkgraph-decisions/dispatch/services`,
  { default: () => [] }
)

const servicesByType = computed(() => {
  const groups: Record<string, DispatchServiceInfo[]> = {}
  for (const s of services.value || []) {
    if (!groups[s.type]) groups[s.type] = []
    groups[s.type].push(s)
  }
  return groups
})

const typeLabels: Record<string, { label: string; icon: string }> = {
  image: { label: 'Image Generation', icon: 'i-lucide-image' },
  prototype: { label: 'Prototyping', icon: 'i-lucide-layout-template' },
  code: { label: 'Code', icon: 'i-lucide-code' },
  text: { label: 'Text', icon: 'i-lucide-text' },
}

function selectService(service: DispatchServiceInfo) {
  selectedService.value = service
  serviceOptions.value = {}
  for (const opt of service.options) {
    serviceOptions.value[opt.key] = opt.default || ''
  }
  step.value = 'configure'
}

function goBack() {
  if (step.value === 'configure') {
    step.value = 'pick'
    selectedService.value = null
  } else if (step.value === 'result') {
    step.value = 'pick'
    selectedService.value = null
    result.value = null
    error.value = null
  }
}

async function dispatch() {
  if (!props.decisionId || !selectedService.value) return
  step.value = 'loading'
  error.value = null

  try {
    const response = await $fetch<any>(
      `/api/teams/${teamId.value}/thinkgraph-decisions/${props.decisionId}/dispatch`,
      {
        method: 'POST',
        body: {
          serviceId: selectedService.value.id,
          prompt: customPrompt.value || undefined,
          options: Object.keys(serviceOptions.value).length > 0 ? serviceOptions.value : undefined,
        },
      }
    )

    result.value = {
      artifacts: response.artifacts || [],
      content: response.content,
    }
    step.value = 'result'
    emit('dispatched', response.id)
  } catch (e: any) {
    error.value = e.data?.statusText || e.message || 'Dispatch failed'
    step.value = 'configure'
  }
}

function copyContent(text: string) {
  navigator.clipboard.writeText(text)
}

function openExternal(url: string) {
  window.open(url, '_blank')
}

// Reset on close
watch(open, (isOpen) => {
  if (!isOpen) {
    step.value = 'pick'
    selectedService.value = null
    customPrompt.value = ''
    serviceOptions.value = {}
    result.value = null
    error.value = null
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'sm:max-w-xl' }">
    <template #content="{ close }">
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-5">
          <button
            v-if="step !== 'pick'"
            class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
            @click="goBack"
          >
            <UIcon name="i-lucide-arrow-left" class="size-5" />
          </button>
          <UIcon name="i-lucide-send" class="size-5 text-primary-500" />
          <h3 class="text-lg font-semibold">
            {{ step === 'pick' ? 'Send to...' : step === 'loading' ? 'Generating...' : step === 'result' ? 'Result' : selectedService?.name }}
          </h3>
          <button
            class="ml-auto text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
            @click="close"
          >
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>

        <!-- Node context chip -->
        <div v-if="decisionContent && step !== 'result'" class="mb-4 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-sm text-neutral-600 dark:text-neutral-400 truncate">
          {{ decisionContent }}
        </div>

        <!-- Step: Pick service -->
        <div v-if="step === 'pick'" class="space-y-5">
          <div v-for="(groupServices, type) in servicesByType" :key="type">
            <div class="flex items-center gap-2 mb-2">
              <UIcon :name="typeLabels[type]?.icon || 'i-lucide-box'" class="size-4 text-neutral-400" />
              <span class="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                {{ typeLabels[type]?.label || type }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="service in groupServices"
                :key="service.id"
                class="flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer"
                :class="service.available
                  ? 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/50 dark:hover:bg-primary-950/20'
                  : 'border-neutral-100 dark:border-neutral-800 opacity-40 cursor-not-allowed'"
                :disabled="!service.available"
                @click="service.available && selectService(service)"
              >
                <UIcon :name="service.icon" class="size-5 text-primary-500 shrink-0 mt-0.5" />
                <div class="min-w-0">
                  <div class="text-sm font-medium">{{ service.name }}</div>
                  <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ service.description }}</div>
                  <span v-if="!service.available" class="text-[10px] text-amber-500 mt-1 block">API key not configured</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Step: Configure -->
        <div v-else-if="step === 'configure'" class="space-y-4">
          <!-- Error banner -->
          <div v-if="error" class="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400">
            {{ error }}
          </div>

          <!-- Service options -->
          <div v-for="opt in selectedService?.options" :key="opt.key">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{{ opt.label }}</label>
            <USelect
              v-if="opt.type === 'select' && opt.choices"
              v-model="serviceOptions[opt.key]"
              :items="opt.choices"
            />
            <UInput
              v-else
              v-model="serviceOptions[opt.key]"
            />
          </div>

          <!-- Custom prompt -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Custom prompt <span class="text-neutral-400 font-normal">(optional)</span>
            </label>
            <UTextarea
              v-model="customPrompt"
              placeholder="Override the default prompt with your own instructions..."
              :rows="3"
            />
          </div>

          <!-- Dispatch button -->
          <div class="flex justify-end gap-2 pt-2">
            <UButton variant="ghost" color="neutral" @click="goBack">Cancel</UButton>
            <UButton
              :icon="selectedService?.icon"
              :label="`Send to ${selectedService?.name}`"
              @click="dispatch"
            />
          </div>
        </div>

        <!-- Step: Loading -->
        <div v-else-if="step === 'loading'" class="flex flex-col items-center justify-center py-12">
          <UIcon name="i-lucide-loader-2" class="size-8 text-primary-500 animate-spin mb-4" />
          <p class="text-sm text-neutral-500">Generating with {{ selectedService?.name }}...</p>
        </div>

        <!-- Step: Result -->
        <div v-else-if="step === 'result' && result" class="space-y-4">
          <div v-for="(artifact, i) in result.artifacts" :key="i" class="space-y-3">
            <!-- Image result -->
            <div v-if="artifact.type === 'image' && artifact.url" class="space-y-2">
              <img
                :src="artifact.url"
                :alt="artifact.prompt || 'Generated image'"
                class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700"
              />
              <div class="flex gap-2">
                <UButton
                  icon="i-lucide-external-link"
                  label="Open full size"
                  size="sm"
                  variant="outline"
                  color="neutral"
                  @click="openExternal(artifact.url!)"
                />
              </div>
            </div>

            <!-- Code result -->
            <div v-else-if="artifact.type === 'code' && artifact.content" class="space-y-2">
              <pre class="p-4 rounded-lg bg-neutral-900 text-neutral-100 text-sm overflow-x-auto max-h-80"><code>{{ artifact.content }}</code></pre>
              <UButton
                icon="i-lucide-copy"
                label="Copy code"
                size="sm"
                variant="outline"
                color="neutral"
                @click="copyContent(artifact.content!)"
              />
            </div>

            <!-- Prototype result -->
            <div v-else-if="artifact.type === 'prototype' && artifact.content" class="space-y-2">
              <pre class="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-sm overflow-x-auto max-h-60 whitespace-pre-wrap">{{ artifact.content }}</pre>
              <div class="flex gap-2">
                <UButton
                  icon="i-lucide-copy"
                  label="Copy prompt"
                  size="sm"
                  variant="outline"
                  color="neutral"
                  @click="copyContent(artifact.content!)"
                />
                <UButton
                  v-if="artifact.metadata?.openUrl"
                  icon="i-lucide-external-link"
                  :label="`Open ${artifact.provider}`"
                  size="sm"
                  @click="openExternal(artifact.metadata!.openUrl as string)"
                />
              </div>
            </div>

            <!-- Text result -->
            <div v-else-if="artifact.type === 'text' && artifact.content" class="space-y-2">
              <div class="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-sm prose dark:prose-invert max-h-80 overflow-y-auto">
                {{ artifact.content }}
              </div>
              <UButton
                icon="i-lucide-copy"
                label="Copy text"
                size="sm"
                variant="outline"
                color="neutral"
                @click="copyContent(artifact.content!)"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton variant="ghost" color="neutral" @click="goBack">Generate another</UButton>
            <UButton label="Done" @click="close" />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
