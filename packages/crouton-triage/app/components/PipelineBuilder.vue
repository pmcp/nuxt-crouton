<script setup lang="ts">
import type { Flow, FlowInput, FlowOutput } from '#layers/triage/types'

interface Props {
  flow: Flow | null
  inputs?: FlowInput[]
  outputs?: FlowOutput[]
}

const props = withDefaults(defineProps<Props>(), {
  inputs: () => [],
  outputs: () => [],
})

const emit = defineEmits<{
  'edit:source': [input: FlowInput]
  'edit:ai': []
  'edit:output': [output: FlowOutput]
  'add:source': [sourceType: 'slack' | 'figma' | 'email']
  'add:output': [outputType: 'notion' | 'github' | 'linear']
}>()

// Show all inputs/outputs (not just active) for visual pipeline
const allInputs = computed(() => props.inputs)
const allOutputs = computed(() => props.outputs)
const hasFlow = computed(() => !!props.flow)

// Source type dropdown items
const sourceTypeItems = [[
  {
    label: 'Slack',
    icon: 'i-lucide-slack',
    onSelect: () => emit('add:source', 'slack'),
  },
  {
    label: 'Figma',
    icon: 'i-lucide-figma',
    onSelect: () => emit('add:source', 'figma'),
  },
  {
    label: 'Email',
    icon: 'i-lucide-mail',
    onSelect: () => emit('add:source', 'email'),
  },
]]

// Output type dropdown items
const outputTypeItems = [[
  {
    label: 'Notion',
    icon: 'i-simple-icons-notion',
    onSelect: () => emit('add:output', 'notion'),
  },
  {
    label: 'GitHub',
    icon: 'i-lucide-github',
    disabled: true,
    onSelect: () => emit('add:output', 'github'),
  },
  {
    label: 'Linear',
    icon: 'i-simple-icons-linear',
    disabled: true,
    onSelect: () => emit('add:output', 'linear'),
  },
]]

// Check if output is configured (has required config)
function isOutputConfigured(output: FlowOutput): boolean {
  if (output.outputType === 'notion') {
    const config = output.outputConfig as Record<string, any> | undefined
    return !!(config?.notionToken && config?.databaseId)
  }
  return output.active
}

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

// AI is properly configured when enabled AND has an API key
const isAiConfigured = computed(() => {
  return !!props.flow?.aiEnabled && !!props.flow?.anthropicApiKey
})

// AI status helpers
function getAiStatusLabel(): string {
  if (!props.flow) return 'Not configured'
  if (!props.flow.aiEnabled) return 'Disabled'
  if (!props.flow.anthropicApiKey) return 'Missing API key'
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
  <div class="flex items-center py-1 w-full">
    <!-- Sources (right-aligned, + on far left) -->
    <div class="flex-1 flex items-center justify-end gap-1">
      <!-- Add source -->
      <UDropdownMenu :items="sourceTypeItems">
        <button class="w-10 h-10 rounded-xl bg-gray-500/10 opacity-50 flex items-center justify-center transition-all hover:opacity-100 hover:scale-110 cursor-pointer">
          <UIcon name="i-lucide-plus" class="w-5 h-5 text-gray-400" />
        </button>
      </UDropdownMenu>

      <!-- Existing source icons -->
      <UPopover
        v-for="input in allInputs"
        :key="input.id"
        mode="hover"
        arrow
        :ui="{ content: 'w-64' }"
      >
        <UChip :color="isInputConnected(input) ? 'success' : 'error'" size="sm" inset>
          <button
            class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
            :class="isInputConnected(input) ? getSourceBg(input.sourceType) : 'bg-gray-500/10 opacity-50'"
          >
            <UIcon
              :name="getSourceIcon(input.sourceType)"
              :class="['w-5 h-5', isInputConnected(input) ? getSourceColor(input.sourceType) : 'text-gray-400']"
            />
          </button>
        </UChip>

        <template #content>
          <div class="p-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-sm">{{ input.name }}</span>
              <div class="flex items-center gap-1.5">
                <UChip :color="isInputConnected(input) ? 'success' : 'error'" standalone inset />
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
            </div>
          </div>
        </template>
      </UPopover>
    </div>

    <!-- AI (fixed center) -->
    <div class="flex items-center gap-3 flex-shrink-0 px-3">
    <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />

    <UPopover mode="hover" arrow :ui="{ content: 'w-64' }">
      <UChip :color="isAiConfigured ? 'success' : 'error'" size="sm" inset>
        <button
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
          :class="isAiConfigured ? 'bg-violet-500/10' : 'bg-gray-500/10 opacity-50'"
        >
          <UIcon
            name="i-lucide-brain"
            :class="[
              'w-5 h-5',
              isAiConfigured ? 'text-violet-500' : 'text-gray-400'
            ]"
          />
        </button>
      </UChip>

      <template #content>
        <div class="p-3 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-sm">AI Analysis</span>
            <UChip :color="isAiConfigured ? 'success' : 'error'" standalone inset />
            <span class="text-xs text-muted-foreground">{{ getAiStatusLabel() }}</span>
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

    <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
    </div>

    <!-- Outputs (left-aligned) -->
    <div class="flex-1 flex items-center gap-1">
      <!-- Existing output icons -->
      <UPopover
        v-for="output in allOutputs"
        :key="output.id"
        mode="hover"
        arrow
        :ui="{ content: 'w-64' }"
      >
        <UChip :color="isOutputConfigured(output) ? 'success' : 'error'" size="sm" inset>
          <button
            class="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer relative"
            :class="isOutputConfigured(output) ? getOutputBg(output.outputType) : 'bg-gray-500/10 opacity-50'"
          >
            <UIcon
              :name="getOutputIcon(output.outputType)"
              :class="['w-5 h-5', isOutputConfigured(output) ? getOutputColor(output.outputType) : 'text-gray-400']"
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
          </button>
        </UChip>

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
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Add output -->
      <UDropdownMenu :items="outputTypeItems">
        <button class="w-10 h-10 rounded-xl bg-gray-500/10 opacity-50 flex items-center justify-center transition-all hover:opacity-100 hover:scale-110 cursor-pointer">
          <UIcon name="i-lucide-plus" class="w-5 h-5 text-gray-400" />
        </button>
      </UDropdownMenu>
    </div>
  </div>
</template>
