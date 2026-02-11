<script setup lang="ts">
import type { Flow } from '#layers/triage/types'

interface Props {
  teamId: string
  modelValue: boolean
  flow: Flow | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [settings: Partial<Flow>]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const toast = useToast()
const saving = ref(false)

// Default domains for new flows
const DEFAULT_DOMAINS = ['design', 'frontend', 'backend', 'product', 'infrastructure', 'docs']

// Form state initialized from flow
const formState = ref({
  aiEnabled: props.flow?.aiEnabled ?? true,
  anthropicApiKey: props.flow?.anthropicApiKey || '',
  aiSummaryPrompt: props.flow?.aiSummaryPrompt || '',
  aiTaskPrompt: props.flow?.aiTaskPrompt || '',
  replyPersonality: props.flow?.replyPersonality || '',
  personalityIcon: props.flow?.personalityIcon || '',
  availableDomains: props.flow?.availableDomains || [...DEFAULT_DOMAINS],
})

// Sync form when flow changes
watch(() => props.flow, (flow) => {
  if (flow) {
    formState.value = {
      aiEnabled: flow.aiEnabled ?? true,
      anthropicApiKey: flow.anthropicApiKey || '',
      aiSummaryPrompt: flow.aiSummaryPrompt || '',
      aiTaskPrompt: flow.aiTaskPrompt || '',
      replyPersonality: flow.replyPersonality || '',
      personalityIcon: flow.personalityIcon || '',
      availableDomains: flow.availableDomains || [...DEFAULT_DOMAINS],
    }
    selectedPreset.value = detectPresetFromPrompts(flow.aiSummaryPrompt, flow.aiTaskPrompt)
  }
}, { deep: true })

// Prompt presets
const promptPresets = [
  { label: 'Default (Balanced)', value: 'default', summaryPrompt: '', taskPrompt: '' },
  {
    label: 'Technical Focus',
    value: 'technical',
    summaryPrompt: 'Focus on technical details, implementation specifics, and architectural considerations.',
    taskPrompt: 'Extract highly specific technical tasks with clear acceptance criteria.',
  },
  {
    label: 'Product Focus',
    value: 'product',
    summaryPrompt: 'Focus on user needs, business value, and product strategy.',
    taskPrompt: 'Extract user stories and product requirements with clear value propositions.',
  },
  {
    label: 'Design Focus',
    value: 'design',
    summaryPrompt: 'Focus on visual design, user experience, and interface patterns.',
    taskPrompt: 'Extract design tasks with specific deliverables and design system references.',
  },
]

function detectPresetFromPrompts(summaryPrompt?: string, taskPrompt?: string): string {
  if (!summaryPrompt && !taskPrompt) return 'default'
  for (const preset of promptPresets) {
    if (preset.value === 'default') continue
    if (preset.summaryPrompt === summaryPrompt && preset.taskPrompt === taskPrompt) {
      return preset.value
    }
  }
  return 'default'
}

const selectedPreset = ref(detectPresetFromPrompts(props.flow?.aiSummaryPrompt, props.flow?.aiTaskPrompt))

watch(selectedPreset, (preset) => {
  const selected = promptPresets.find(p => p.value === preset)
  if (selected && preset !== 'default') {
    formState.value.aiSummaryPrompt = selected.summaryPrompt
    formState.value.aiTaskPrompt = selected.taskPrompt
  } else if (preset === 'default') {
    formState.value.aiSummaryPrompt = ''
    formState.value.aiTaskPrompt = ''
  }
})

// Reply personality presets
const personalityPresets = [
  { value: '', label: 'Professional (default)', description: 'Formal, clear, minimal' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, encouraging' },
  { value: 'concise', label: 'Concise', description: 'Ultra-brief' },
  { value: 'pirate', label: 'Pirate', description: 'Arrr!' },
  { value: 'robot', label: 'Robot', description: 'Beep boop' },
  { value: 'zen', label: 'Zen', description: 'Calm, mindful' },
  { value: 'custom', label: 'Custom...', description: 'Write your own AI prompt' },
]

// Custom personality
const customPersonalityPrompt = ref(
  props.flow?.replyPersonality?.startsWith('custom:')
    ? props.flow.replyPersonality.replace(/^custom:/, '')
    : ''
)

const selectedPersonality = computed({
  get: () => {
    const rp = formState.value.replyPersonality
    if (!rp) return ''
    if (rp.startsWith('custom:')) return 'custom'
    return rp
  },
  set: (val) => {
    if (val === 'custom') {
      formState.value.replyPersonality = customPersonalityPrompt.value
        ? `custom:${customPersonalityPrompt.value}`
        : 'custom'
    } else {
      formState.value.replyPersonality = val
    }
  },
})

watch(customPersonalityPrompt, (val) => {
  if (selectedPersonality.value === 'custom') {
    formState.value.replyPersonality = val ? `custom:${val}` : 'custom'
  }
})

// Domain management
const newDomain = ref('')

function addDomain() {
  const domain = newDomain.value.toLowerCase().trim()
  if (domain && !formState.value.availableDomains.includes(domain)) {
    formState.value.availableDomains.push(domain)
    newDomain.value = ''
  }
}

function removeDomain(domain: string) {
  formState.value.availableDomains = formState.value.availableDomains.filter(d => d !== domain)
}

// Prompt preview
const { buildPreview } = useTriagePromptPreview()
const showPreview = ref(false)
const promptPreview = computed(() => buildPreview(
  formState.value.aiSummaryPrompt,
  formState.value.aiTaskPrompt
))

// Icon suggestions
interface IconSuggestion {
  icon: string
  type: 'emoji' | 'lucide' | 'svg'
  label: string
}

const iconSuggestions = ref<IconSuggestion[]>([])
const loadingIcons = ref(false)

async function suggestIcons() {
  if (!customPersonalityPrompt.value || customPersonalityPrompt.value.length < 3) return

  loadingIcons.value = true
  try {
    const response = await $fetch<{ suggestions: IconSuggestion[] }>(
      `/api/crouton-triage/teams/${props.teamId}/ai/suggest-icons`,
      {
        method: 'POST',
        body: {
          description: customPersonalityPrompt.value,
          anthropicApiKey: formState.value.anthropicApiKey,
        },
      }
    )
    iconSuggestions.value = response.suggestions
  } catch {
    iconSuggestions.value = [
      { icon: '🤖', type: 'emoji', label: 'Robot' },
      { icon: '💬', type: 'emoji', label: 'Chat' },
      { icon: '✨', type: 'emoji', label: 'Sparkles' },
    ]
  } finally {
    loadingIcons.value = false
  }
}

// Save handler
async function handleSave() {
  if (!props.flow?.id) return

  saving.value = true
  try {
    const { currentTeam } = useTeam()
    await $fetch(`/api/teams/${currentTeam.value?.id}/triage-flows/${props.flow.id}`, {
      method: 'PATCH',
      body: {
        aiEnabled: formState.value.aiEnabled,
        anthropicApiKey: formState.value.anthropicApiKey || undefined,
        aiSummaryPrompt: formState.value.aiSummaryPrompt || undefined,
        aiTaskPrompt: formState.value.aiTaskPrompt || undefined,
        replyPersonality: formState.value.replyPersonality || undefined,
        personalityIcon: formState.value.personalityIcon || undefined,
        availableDomains: formState.value.availableDomains,
      },
    })

    emit('save', formState.value)
    isOpen.value = false

    toast.add({
      title: 'AI Settings Saved',
      description: 'AI configuration updated successfully.',
      color: 'success',
    })
  } catch (error: any) {
    toast.add({
      title: 'Save Failed',
      description: error.message || 'Failed to save AI settings.',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="isOpen" :ui="{ width: 'max-w-lg' }">
    <template #content="{ close }">
      <div class="p-6 h-full overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">AI Configuration</h3>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="close"
          />
        </div>

        <div class="space-y-6">
          <!-- AI Toggle -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">AI Analysis</p>
              <p class="text-xs text-muted-foreground">Enable AI-powered summarization and task detection</p>
            </div>
            <USwitch v-model="formState.aiEnabled" />
          </div>

          <template v-if="formState.aiEnabled">
            <!-- API Key (optional) -->
            <UFormField label="Anthropic API Key" help="Optional. Uses server key if not provided.">
              <UInput
                v-model="formState.anthropicApiKey"
                type="password"
                placeholder="sk-ant-..."
              />
            </UFormField>

            <USeparator />

            <!-- Prompt Preset -->
            <UFormField label="Prompt Preset">
              <div class="grid grid-cols-2 gap-2">
                <UButton
                  v-for="preset in promptPresets"
                  :key="preset.value"
                  :color="selectedPreset === preset.value ? 'primary' : 'neutral'"
                  :variant="selectedPreset === preset.value ? 'solid' : 'outline'"
                  size="sm"
                  @click="selectedPreset = preset.value"
                >
                  {{ preset.label }}
                </UButton>
              </div>
            </UFormField>

            <!-- Custom Prompts -->
            <UFormField label="Summary Prompt" help="Custom instructions for how AI should summarize discussions.">
              <UTextarea
                v-model="formState.aiSummaryPrompt"
                :rows="3"
                placeholder="Focus on..."
              />
            </UFormField>

            <UFormField label="Task Detection Prompt" help="Custom instructions for how AI should detect tasks.">
              <UTextarea
                v-model="formState.aiTaskPrompt"
                :rows="3"
                placeholder="Extract..."
              />
            </UFormField>

            <!-- Prompt Preview -->
            <div>
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                icon="i-lucide-eye"
                @click="showPreview = !showPreview"
              >
                {{ showPreview ? 'Hide' : 'Preview' }} Prompt
              </UButton>
              <pre v-if="showPreview" class="mt-2 p-3 text-xs bg-muted rounded-lg overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">{{ promptPreview }}</pre>
            </div>

            <USeparator />

            <!-- Reply Personality -->
            <UFormField label="Reply Personality" help="How the AI responds in source threads.">
              <div class="space-y-2">
                <USelectMenu
                  :model-value="selectedPersonality"
                  :items="personalityPresets.map(p => ({ label: `${p.label} — ${p.description}`, value: p.value }))"
                  value-key="value"
                  @update:model-value="selectedPersonality = $event"
                />

                <!-- Custom personality prompt -->
                <template v-if="selectedPersonality === 'custom'">
                  <UTextarea
                    v-model="customPersonalityPrompt"
                    :rows="2"
                    placeholder="Describe the personality..."
                  />

                  <!-- Icon suggestions -->
                  <div class="flex items-center gap-2">
                    <UButton
                      size="xs"
                      variant="outline"
                      color="neutral"
                      :loading="loadingIcons"
                      @click="suggestIcons"
                    >
                      Suggest Icon
                    </UButton>
                    <span
                      v-if="formState.personalityIcon"
                      class="text-lg cursor-pointer"
                      @click="formState.personalityIcon = ''"
                    >
                      {{ formState.personalityIcon }}
                    </span>
                  </div>

                  <div v-if="iconSuggestions.length" class="flex gap-2">
                    <button
                      v-for="suggestion in iconSuggestions"
                      :key="suggestion.icon"
                      class="text-xl p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                      :class="{ 'ring-2 ring-primary': formState.personalityIcon === suggestion.icon }"
                      :title="suggestion.label"
                      @click="formState.personalityIcon = suggestion.icon"
                    >
                      {{ suggestion.icon }}
                    </button>
                  </div>
                </template>
              </div>
            </UFormField>

            <USeparator />

            <!-- Available Domains -->
            <UFormField label="Available Domains" help="Domains the AI can route tasks to.">
              <div class="space-y-2">
                <div class="flex flex-wrap gap-1.5">
                  <UBadge
                    v-for="domain in formState.availableDomains"
                    :key="domain"
                    color="neutral"
                    variant="subtle"
                    class="cursor-pointer"
                    @click="removeDomain(domain)"
                  >
                    {{ domain }}
                    <UIcon name="i-lucide-x" class="w-3 h-3 ml-1" />
                  </UBadge>
                </div>
                <div class="flex gap-2">
                  <UInput
                    v-model="newDomain"
                    size="sm"
                    placeholder="Add domain..."
                    @keydown.enter.prevent="addDomain"
                  />
                  <UButton size="sm" variant="outline" color="neutral" @click="addDomain">Add</UButton>
                </div>
              </div>
            </UFormField>
          </template>

          <!-- Save button -->
          <div class="flex justify-end gap-2 pt-4 border-t">
            <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
            <UButton color="primary" :loading="saving" @click="handleSave">Save Settings</UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
