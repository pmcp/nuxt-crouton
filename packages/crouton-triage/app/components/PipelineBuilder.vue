<script setup lang="ts">
import type { Flow, FlowInput, FlowOutput } from '#layers/triage/types'

interface Props {
  flow: Flow | null
  inputs: FlowInput[]
  outputs: FlowOutput[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'edit:source': [input: FlowInput]
  'edit:ai': []
  'edit:output': [output: FlowOutput]
  'add:source': []
  'add:output': []
}>()

// Filter to active items only
const activeInputs = computed(() => props.inputs.filter(i => i.active))
const activeOutputs = computed(() => props.outputs.filter(o => o.active))
const hasFlow = computed(() => !!props.flow)

// Source icon mapping (from FlowPipelineVisual)
function getSourceIcon(sourceType: string): string {
  const icons: Record<string, string> = {
    slack: 'i-lucide-slack',
    figma: 'i-lucide-figma',
    notion: 'i-simple-icons-notion',
    email: 'i-lucide-mail',
  }
  return icons[sourceType] || 'i-lucide-inbox'
}

function getSourceColor(sourceType: string): string {
  const colors: Record<string, string> = {
    slack: 'text-[#4A154B] dark:text-[#E01E5A]',
    figma: 'text-[#F24E1E]',
    notion: 'text-gray-900 dark:text-white',
    email: 'text-blue-500',
  }
  return colors[sourceType] || 'text-gray-500'
}

function getSourceBg(sourceType: string): string {
  const colors: Record<string, string> = {
    slack: 'bg-[#4A154B]/10 dark:bg-[#E01E5A]/10',
    figma: 'bg-[#F24E1E]/10',
    notion: 'bg-gray-900/10 dark:bg-white/10',
    email: 'bg-blue-500/10',
  }
  return colors[sourceType] || 'bg-gray-500/10'
}

function getOutputIcon(outputType: string): string {
  const icons: Record<string, string> = {
    notion: 'i-simple-icons-notion',
    github: 'i-lucide-github',
    linear: 'i-simple-icons-linear',
  }
  return icons[outputType] || 'i-lucide-send'
}

function getOutputColor(outputType: string): string {
  const colors: Record<string, string> = {
    notion: 'text-gray-900 dark:text-white',
    github: 'text-gray-900 dark:text-white',
    linear: 'text-[#5E6AD2]',
  }
  return colors[outputType] || 'text-gray-500'
}

function getOutputBg(outputType: string): string {
  const colors: Record<string, string> = {
    notion: 'bg-gray-900/10 dark:bg-white/10',
    github: 'bg-gray-900/10 dark:bg-white/10',
    linear: 'bg-[#5E6AD2]/10',
  }
  return colors[outputType] || 'bg-gray-500/10'
}

function getInputStatusLabel(input: FlowInput): string {
  if (input.sourceType === 'slack') {
    return input.apiToken ? 'Connected' : 'Not connected'
  }
  return input.active ? 'Active' : 'Inactive'
}

function isInputConnected(input: FlowInput): boolean {
  if (input.sourceType === 'slack') return !!input.apiToken
  return input.active
}

function getWorkspaceName(input: FlowInput): string | null {
  if (input.sourceType === 'slack') {
    return input.sourceMetadata?.slackWorkspaceName || null
  }
  if (input.emailSlug) return input.emailSlug
  return null
}

// AI status helpers
function getAiStatusLabel(): string {
  if (!props.flow) return 'Not configured'
  if (!props.flow.aiEnabled) return 'Disabled'
  return 'Enabled'
}

function getPresetLabel(): string {
  if (!props.flow?.aiSummaryPrompt && !props.flow?.aiTaskPrompt) return 'Default'
  const combined = `${props.flow.aiSummaryPrompt || ''} ${props.flow.aiTaskPrompt || ''}`
  if (/technical|implementation/i.test(combined)) return 'Technical'
  if (/user needs|business value|product/i.test(combined)) return 'Product'
  if (/visual design|user experience/i.test(combined)) return 'Design'
  return 'Custom'
}

function getPersonalityLabel(): string {
  const p = props.flow?.replyPersonality
  if (!p) return 'Default'
  if (p.startsWith('custom:')) return 'Custom'
  const labels: Record<string, string> = {
    professional: 'Professional',
    friendly: 'Friendly',
    concise: 'Concise',
    pirate: 'Pirate',
    robot: 'Robot',
    zen: 'Zen',
  }
  return labels[p] || p
}

function getDomainColor(domain: string): string {
  const colors: Record<string, string> = {
    design: 'text-purple-500',
    frontend: 'text-blue-500',
    backend: 'text-green-500',
    product: 'text-orange-500',
    infrastructure: 'text-amber-700',
    docs: 'text-cyan-500',
  }
  return colors[domain.toLowerCase()] || 'text-gray-400'
}
</script>

<template>
  <div class="flex items-center justify-center gap-2 py-4 flex-wrap">
    <!-- Sources group -->
    <div class="flex items-center gap-1">
      <!-- Existing source icons -->
      <UPopover
        v-for="input in activeInputs"
        :key="input.id"
        :ui="{ content: 'w-64' }"
      >
        <button
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
          :class="getSourceBg(input.sourceType)"
        >
          <UIcon
            :name="getSourceIcon(input.sourceType)"
            :class="['w-5 h-5', getSourceColor(input.sourceType)]"
          />
        </button>

        <template #content>
          <div class="p-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-sm">{{ input.name }}</span>
              <div class="flex items-center gap-1">
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="isInputConnected(input) ? 'bg-green-500' : 'bg-orange-500'"
                />
                <span class="text-xs text-muted-foreground">{{ getInputStatusLabel(input) }}</span>
              </div>
            </div>
            <p v-if="getWorkspaceName(input)" class="text-xs text-muted-foreground">
              {{ getWorkspaceName(input) }}
            </p>
            <div class="flex gap-2 pt-1">
              <UButton size="xs" variant="outline" color="neutral" @click="emit('edit:source', input)">
                Edit
              </UButton>
              <UButton size="xs" variant="outline" color="neutral" @click="emit('add:source')">
                + Add Source
              </UButton>
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Empty/add source placeholder -->
      <button
        v-if="activeInputs.length === 0"
        class="w-10 h-10 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
        @click="emit('add:source')"
      >
        <UIcon name="i-lucide-plus" class="w-4 h-4 text-muted-foreground" />
      </button>
    </div>

    <!-- Arrow separator -->
    <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />

    <!-- AI brain icon -->
    <UPopover :ui="{ content: 'w-64' }">
      <button
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
        :class="flow?.aiEnabled ? 'bg-violet-500/10' : 'bg-gray-500/10'"
      >
        <UIcon
          name="i-lucide-brain"
          :class="[
            'w-5 h-5',
            flow?.aiEnabled ? 'text-violet-500' : 'text-gray-300 dark:text-gray-600'
          ]"
        />
      </button>

      <template #content>
        <div class="p-3 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-sm">AI Analysis</span>
            <div class="flex items-center gap-1">
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="flow?.aiEnabled ? 'bg-green-500' : 'bg-gray-400'"
              />
              <span class="text-xs text-muted-foreground">{{ getAiStatusLabel() }}</span>
            </div>
          </div>
          <div v-if="flow" class="space-y-1 text-xs text-muted-foreground">
            <p>Preset: {{ getPresetLabel() }}</p>
            <p>Personality: {{ getPersonalityLabel() }}</p>
            <p v-if="flow.availableDomains?.length">
              Domains: {{ flow.availableDomains.join(', ') }}
            </p>
          </div>
          <div class="pt-1">
            <UButton size="xs" variant="outline" color="neutral" @click="emit('edit:ai')">
              Configure
            </UButton>
          </div>
        </div>
      </template>
    </UPopover>

    <!-- Arrow separator -->
    <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />

    <!-- Outputs group -->
    <div class="flex items-center gap-1">
      <!-- Existing output icons -->
      <UPopover
        v-for="output in activeOutputs"
        :key="output.id"
        :ui="{ content: 'w-64' }"
      >
        <button
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer relative"
          :class="getOutputBg(output.outputType)"
        >
          <UIcon
            :name="getOutputIcon(output.outputType)"
            :class="['w-5 h-5', getOutputColor(output.outputType)]"
          />
          <!-- Domain dots -->
          <div
            v-if="output.domainFilter?.length"
            class="absolute -bottom-0.5 flex gap-0.5"
          >
            <span
              v-for="domain in output.domainFilter.slice(0, 3)"
              :key="domain"
              :class="['w-1 h-1 rounded-full', getDomainColor(domain).replace('text-', 'bg-')]"
            />
          </div>
          <!-- Default star -->
          <span
            v-if="output.isDefault"
            class="absolute -top-1 -right-1 text-[8px]"
          >⭐</span>
        </button>

        <template #content>
          <div class="p-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-sm">{{ output.name }}</span>
              <UBadge v-if="output.isDefault" size="xs" color="primary" variant="subtle">Default</UBadge>
            </div>
            <div class="space-y-1 text-xs text-muted-foreground">
              <p>Type: {{ output.outputType }}</p>
              <p v-if="output.domainFilter?.length">
                Domains: {{ output.domainFilter.join(', ') }}
              </p>
              <p v-else>All domains</p>
            </div>
            <div class="flex gap-2 pt-1">
              <UButton size="xs" variant="outline" color="neutral" @click="emit('edit:output', output)">
                Edit
              </UButton>
              <UButton size="xs" variant="outline" color="neutral" @click="emit('add:output')">
                + Add Output
              </UButton>
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Empty/add output placeholder -->
      <button
        v-if="activeOutputs.length === 0"
        class="w-10 h-10 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
        @click="emit('add:output')"
      >
        <UIcon name="i-lucide-plus" class="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  </div>
</template>
