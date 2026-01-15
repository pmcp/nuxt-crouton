<script setup lang="ts">
import type { Flow, FlowInput, FlowOutput } from '#layers/discubot/types'

interface Props {
  flow: Flow
  inputs: FlowInput[]
  outputs: FlowOutput[]
}

const props = defineProps<Props>()

// Filter to active items only
const activeInputs = computed(() => props.inputs.filter(i => i.active))
const activeOutputs = computed(() => props.outputs.filter(o => o.active))

// Source icon mapping
function getSourceIcon(sourceType: string): string {
  const icons: Record<string, string> = {
    slack: 'i-simple-icons-slack',
    figma: 'i-simple-icons-figma',
    notion: 'i-simple-icons-notion',
    email: 'i-lucide-mail',
  }
  return icons[sourceType] || 'i-lucide-inbox'
}

// Source color mapping
function getSourceColor(sourceType: string): string {
  const colors: Record<string, string> = {
    slack: 'text-[#4A154B] dark:text-[#E01E5A]',
    figma: 'text-[#F24E1E]',
    notion: 'text-gray-900 dark:text-white',
    email: 'text-blue-500',
  }
  return colors[sourceType] || 'text-gray-500'
}

// Output icon mapping
function getOutputIcon(outputType: string): string {
  const icons: Record<string, string> = {
    notion: 'i-simple-icons-notion',
    github: 'i-simple-icons-github',
    linear: 'i-simple-icons-linear',
  }
  return icons[outputType] || 'i-lucide-send'
}

// Output color mapping
function getOutputColor(outputType: string): string {
  const colors: Record<string, string> = {
    notion: 'text-gray-900 dark:text-white',
    github: 'text-gray-900 dark:text-white',
    linear: 'text-[#5E6AD2]',
  }
  return colors[outputType] || 'text-gray-500'
}

// Personality icon mapping
function getPersonalityIcon(personality: string | undefined, customIcon?: string): string {
  // If custom icon is set, return empty (we'll render the emoji directly)
  if (customIcon) return ''

  if (!personality) return 'i-lucide-message-circle'
  if (personality.startsWith('custom:')) return 'i-lucide-pencil'

  const icons: Record<string, string> = {
    professional: 'i-lucide-briefcase',
    friendly: 'i-lucide-smile',
    concise: 'i-lucide-zap',
    pirate: 'i-lucide-anchor',
    robot: 'i-lucide-bot',
    zen: 'i-lucide-flower-2',
  }
  return icons[personality] || 'i-lucide-message-circle'
}

// Check if icon is a unicode emoji (not a lucide icon)
function isEmoji(icon: string | undefined): boolean {
  if (!icon) return false
  // Lucide icons start with 'i-'
  return !icon.startsWith('i-')
}

// Personality label for tooltip
function getPersonalityLabel(personality: string | undefined): string {
  if (!personality) return 'Default replies'
  if (personality.startsWith('custom:')) return 'Custom personality'

  const labels: Record<string, string> = {
    professional: 'Professional',
    friendly: 'Friendly',
    concise: 'Concise',
    pirate: 'Pirate',
    robot: 'Robot',
    zen: 'Zen',
  }
  return labels[personality] || personality
}

// Domain color mapping
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

// Prompt preset detection based on prompt content
const promptPresets = {
  technical: {
    pattern: /technical|implementation|architectural/i,
    icon: 'i-lucide-code',
    label: 'Technical Focus',
    color: 'text-emerald-500'
  },
  product: {
    pattern: /user needs|business value|product/i,
    icon: 'i-lucide-package',
    label: 'Product Focus',
    color: 'text-blue-500'
  },
  design: {
    pattern: /visual design|user experience|interface/i,
    icon: 'i-lucide-palette',
    label: 'Design Focus',
    color: 'text-pink-500'
  }
}

// Detect which prompt preset is being used
const detectedPreset = computed(() => {
  const summaryPrompt = props.flow.aiSummaryPrompt || ''
  const taskPrompt = props.flow.aiTaskPrompt || ''
  const combined = `${summaryPrompt} ${taskPrompt}`

  if (!combined.trim()) return null // Default/no preset

  for (const [key, preset] of Object.entries(promptPresets)) {
    if (preset.pattern.test(combined)) {
      return { key, ...preset }
    }
  }

  // Has custom prompts but doesn't match any preset
  return {
    key: 'custom',
    icon: 'i-lucide-sparkles',
    label: 'Custom Prompts',
    color: 'text-amber-500'
  }
})

// Check if AI has custom prompts configured
const hasCustomPrompts = computed(() =>
  Boolean(props.flow.aiSummaryPrompt || props.flow.aiTaskPrompt)
)

// Check if flow has domain routing
const hasDomainRouting = computed(() =>
  props.outputs.some(o => o.domainFilter && o.domainFilter.length > 0)
)

// AI status for tooltip
const aiStatus = computed(() => {
  if (!props.flow.aiEnabled) return 'AI disabled'
  if (detectedPreset.value) return `AI: ${detectedPreset.value.label}`
  return 'AI enabled (default)'
})
</script>

<template>
  <div class="flex items-center gap-3 py-1">
    <!-- Sources (grouped) -->
    <div class="flex items-center gap-1">
      <UTooltip
        v-for="input in activeInputs"
        :key="input.id"
        :text="input.name"
      >
        <UIcon
          :name="getSourceIcon(input.sourceType)"
          :class="['w-5 h-5 transition-transform hover:scale-110', getSourceColor(input.sourceType)]"
        />
      </UTooltip>
      <span v-if="activeInputs.length === 0" class="text-gray-300 dark:text-gray-600 text-xs">—</span>
    </div>

    <!-- Arrow -->
    <span class="text-gray-300 dark:text-gray-600">→</span>

    <!-- AI Section -->
    <div class="flex items-center gap-1">
      <!-- Brain icon -->
      <UTooltip :text="aiStatus">
        <UIcon
          name="i-lucide-brain"
          :class="[
            'w-5 h-5 transition-all',
            flow.aiEnabled
              ? 'text-violet-500'
              : 'text-gray-300 dark:text-gray-600'
          ]"
        />
      </UTooltip>

      <!-- Prompt preset indicator -->
      <UTooltip v-if="detectedPreset && flow.aiEnabled" :text="detectedPreset.label">
        <UIcon
          :name="detectedPreset.icon"
          :class="['w-4 h-4 transition-transform hover:scale-110', detectedPreset.color]"
        />
      </UTooltip>

      <!-- Personality indicator -->
      <UTooltip :text="getPersonalityLabel(flow.replyPersonality)">
        <!-- Custom emoji icon -->
        <span
          v-if="flow.personalityIcon && isEmoji(flow.personalityIcon)"
          class="text-base transition-transform hover:scale-110 cursor-default"
        >
          {{ flow.personalityIcon }}
        </span>
        <!-- Lucide icon fallback -->
        <UIcon
          v-else
          :name="getPersonalityIcon(flow.replyPersonality, flow.personalityIcon)"
          :class="[
            'w-4 h-4 transition-transform hover:scale-110',
            flow.replyPersonality ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'
          ]"
        />
      </UTooltip>
    </div>

    <!-- Arrow -->
    <span class="text-gray-300 dark:text-gray-600">→</span>

    <!-- Outputs (grouped with domain dots) -->
    <div class="flex flex-col gap-0.5">
      <div
        v-for="output in activeOutputs"
        :key="output.id"
        class="flex items-center gap-1"
      >
        <UTooltip :text="output.name">
          <UIcon
            :name="getOutputIcon(output.outputType)"
            :class="['w-5 h-5 transition-transform hover:scale-110', getOutputColor(output.outputType)]"
          />
        </UTooltip>

        <!-- Domain filter dots -->
        <div v-if="output.domainFilter?.length" class="flex gap-0.5">
          <UTooltip
            v-for="domain in output.domainFilter"
            :key="domain"
            :text="domain"
          >
            <span :class="['text-[8px] leading-none', getDomainColor(domain)]">●</span>
          </UTooltip>
        </div>

        <!-- Default indicator -->
        <UTooltip v-if="output.isDefault" text="Default output">
          <span class="text-[10px] leading-none">⭐</span>
        </UTooltip>
      </div>

      <span v-if="activeOutputs.length === 0" class="text-gray-300 dark:text-gray-600 text-xs">—</span>
    </div>
  </div>
</template>
