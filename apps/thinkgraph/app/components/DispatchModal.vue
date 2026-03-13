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
  decisionIds?: string[]
  decisionContent?: string
}>()

const emit = defineEmits<{
  dispatched: [nodeId: string]
  close: []
}>()

const open = defineModel<boolean>('open', { default: false })

const { teamId } = useTeamContext()

// State
const step = ref<'pick' | 'configure' | 'result'>('pick')
const selectedService = ref<DispatchServiceInfo | null>(null)
const customPrompt = ref('')
const variationCount = ref(1)
const serviceOptions = ref<Record<string, string>>({})
const result = ref<{ artifacts: Artifact[]; content: string } | null>(null)
const error = ref<string | null>(null)

// Fetch available services (lazy — triggered when modal opens)
const { data: services, execute: fetchServices } = useLazyFetch<DispatchServiceInfo[]>(
  () => `/api/teams/${teamId.value}/thinkgraph-decisions/dispatch/services`,
  { immediate: false, default: () => [] }
)

watch(open, (isOpen) => {
  if (isOpen) fetchServices()
})

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

const toast = useToast()

const isMulti = computed(() => props.decisionIds && props.decisionIds.length > 1)

async function dispatch() {
  if (!selectedService.value) return
  if (!isMulti.value && !props.decisionId) return

  const service = selectedService.value
  const toastId = `dispatch-${props.decisionId || 'multi'}`

  // Close modal immediately and show toast
  open.value = false
  toast.add({
    id: toastId,
    title: `Generating with ${service.name}...`,
    description: isMulti.value ? `Combining ${props.decisionIds!.length} nodes` : undefined,
    icon: 'i-lucide-loader-2',
    color: 'info' as any,
    duration: 0,
  })

  try {
    let response: any

    if (isMulti.value) {
      // Multi-node dispatch
      response = await $fetch<any>(
        `/api/teams/${teamId.value}/thinkgraph-decisions/dispatch-multi`,
        {
          method: 'POST',
          body: {
            nodeIds: props.decisionIds,
            serviceId: service.id,
            prompt: customPrompt.value || undefined,
            options: Object.keys(serviceOptions.value).length > 0 ? serviceOptions.value : undefined,
            count: variationCount.value > 1 ? variationCount.value : undefined,
          },
        },
      )
    } else {
      // Single-node dispatch
      response = await $fetch<any>(
        `/api/teams/${teamId.value}/thinkgraph-decisions/${props.decisionId}/dispatch`,
        {
          method: 'POST',
          body: {
            serviceId: service.id,
            prompt: customPrompt.value || undefined,
            options: Object.keys(serviceOptions.value).length > 0 ? serviceOptions.value : undefined,
            count: variationCount.value > 1 ? variationCount.value : undefined,
          },
        },
      )
    }

    toast.remove(toastId)
    toast.add({
      title: `${service.name} complete`,
      icon: 'i-lucide-check-circle',
      color: 'success' as any,
      duration: 3000,
    })

    emit('dispatched', response.id)
  }
  catch (e: any) {
    toast.remove(toastId)
    toast.add({
      title: `${service.name} failed`,
      description: e.data?.statusText || e.message || 'Unknown error',
      icon: 'i-lucide-alert-circle',
      color: 'error' as any,
      duration: 5000,
    })
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
    variationCount.value = 1
    serviceOptions.value = {}
    result.value = null
    error.value = null
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'sm:max-w-xl' }">
    <template #content="{ close }">
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-5">
          <button
            v-if="step !== 'pick'"
            class="text-muted hover:text-default transition-colors cursor-pointer"
            @click="goBack"
          >
            <UIcon name="i-lucide-arrow-left" class="size-5" />
          </button>
          <UIcon name="i-lucide-send" class="size-5 text-primary-500" />
          <h3 class="text-lg font-semibold">
            {{ step === 'pick' ? 'Send to...' : step === 'result' ? 'Result' : selectedService?.name }}
          </h3>
          <button
            class="ml-auto text-muted hover:text-default transition-colors cursor-pointer"
            @click="close"
          >
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
        </div>

        <!-- Node context chip -->
        <div v-if="step !== 'result'" class="mb-4 px-3 py-2 rounded-lg bg-elevated text-sm text-muted">
          <template v-if="isMulti">
            <span class="font-medium">{{ decisionIds!.length }} nodes selected</span> — combined context will be sent
          </template>
          <template v-else-if="decisionContent">
            <span class="truncate block">{{ decisionContent }}</span>
          </template>
        </div>

        <!-- Step: Pick service -->
        <div v-if="step === 'pick'" class="space-y-5">
          <div v-for="(groupServices, type) in servicesByType" :key="type">
            <div class="flex items-center gap-2 mb-2">
              <UIcon :name="typeLabels[type]?.icon || 'i-lucide-box'" class="size-4 text-neutral-400" />
              <span class="text-xs font-medium text-muted uppercase tracking-wide">
                {{ typeLabels[type]?.label || type }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="service in groupServices"
                :key="service.id"
                class="flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer"
                :class="service.available
                  ? 'border-default hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/50 dark:hover:bg-primary-950/20'
                  : 'border-default opacity-40 cursor-not-allowed'"
                :disabled="!service.available"
                @click="service.available && selectService(service)"
              >
                <UIcon :name="service.icon" class="size-5 text-primary-500 shrink-0 mt-0.5" />
                <div class="min-w-0">
                  <div class="text-sm font-medium">{{ service.name }}</div>
                  <div class="text-xs text-muted">{{ service.description }}</div>
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
            <label class="block text-sm font-medium text-default mb-1">{{ opt.label }}</label>
            <USelect
              v-if="opt.type === 'select' && opt.choices"
              v-model="serviceOptions[opt.key]"
              :items="opt.choices"
              class="w-full"
            />
            <UInput
              v-else
              v-model="serviceOptions[opt.key]"
              class="w-full"
            />
          </div>

          <!-- Variations count -->
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Variations
            </label>
            <div class="flex items-center gap-2">
              <button
                v-for="n in [1, 2, 3, 4]"
                :key="n"
                class="w-9 h-9 rounded-lg border text-sm font-medium transition-all cursor-pointer"
                :class="variationCount === n
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400'
                  : 'border-default text-muted hover:border-stone-300 dark:hover:border-stone-600'"
                @click="variationCount = n"
              >
                {{ n }}
              </button>
              <span class="text-xs text-muted ml-1">
                {{ variationCount > 1 ? `${variationCount} different versions` : 'single result' }}
              </span>
            </div>
          </div>

          <!-- Custom prompt -->
          <div>
            <label class="block text-sm font-medium text-default mb-1">
              Custom prompt <span class="text-muted font-normal">(optional)</span>
            </label>
            <UTextarea
              v-model="customPrompt"
              placeholder="Override the default prompt with your own instructions..."
              :rows="3"
              class="w-full"
            />
          </div>

          <!-- Dispatch button -->
          <div class="flex justify-end gap-2 pt-2">
            <UButton variant="ghost" color="neutral" @click="goBack">Cancel</UButton>
            <UButton
              :icon="selectedService?.icon"
              :label="variationCount > 1 ? `Generate ${variationCount} versions` : `Send to ${selectedService?.name}`"
              @click="dispatch"
            />
          </div>
        </div>

        <!-- Step: Result (shown when modal is re-opened after generation) -->
        <div v-else-if="step === 'result' && result" class="space-y-4">
          <div v-for="(artifact, i) in result.artifacts" :key="i" class="space-y-3">
            <!-- Image result -->
            <div v-if="artifact.type === 'image' && artifact.url" class="space-y-2">
              <img
                :src="artifact.url"
                :alt="artifact.prompt || 'Generated image'"
                class="w-full rounded-lg border border-default"
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
              <pre class="p-4 rounded-lg bg-stone-900 text-stone-100 text-sm overflow-x-auto max-h-80"><code>{{ artifact.content }}</code></pre>
              <UButton
                icon="i-lucide-copy"
                label="Copy code"
                size="sm"
                variant="outline"
                color="neutral"
                @click="copyContent(artifact.content!)"
              />
            </div>

            <!-- Prototype result with iframe preview -->
            <div v-else-if="artifact.type === 'prototype' && artifact.url" class="space-y-2">
              <iframe
                :src="artifact.url"
                class="w-full h-80 rounded-lg border border-default bg-white"
                sandbox="allow-scripts"
              />
              <div class="flex gap-2">
                <UButton
                  icon="i-lucide-external-link"
                  label="Open full size"
                  size="sm"
                  @click="openExternal(artifact.url!)"
                />
                <UButton
                  v-if="artifact.content"
                  icon="i-lucide-copy"
                  label="Copy HTML"
                  size="sm"
                  variant="outline"
                  color="neutral"
                  @click="copyContent(artifact.content!)"
                />
              </div>
            </div>

            <!-- Prototype result (prompt-only, no URL) -->
            <div v-else-if="artifact.type === 'prototype' && artifact.content" class="space-y-2">
              <pre class="p-4 rounded-lg bg-elevated text-sm overflow-x-auto max-h-60 whitespace-pre-wrap">{{ artifact.content }}</pre>
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
              <div class="p-4 rounded-lg bg-elevated text-sm prose dark:prose-invert max-h-80 overflow-y-auto">
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
