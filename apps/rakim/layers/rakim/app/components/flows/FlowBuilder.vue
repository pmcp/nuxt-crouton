<script setup lang="ts">
import { z } from 'zod'
import { humanId } from 'human-id'
import type { FormSubmitEvent, StepperItem } from '@nuxt/ui'
import type { Flow, FlowInput, FlowOutput, NotionOutputConfig, NotionInputConfig } from '~/layers/discubot/types'

/**
 * FlowBuilder - Multi-step wizard for creating/editing flows
 *
 * This component provides a guided experience for setting up flows with:
 * - Step 1: Flow settings (name, AI config, domains)
 * - Step 2: Input management (Slack, Figma, Email sources)
 * - Step 3: Output management (Notion, GitHub, Linear destinations with domain routing)
 *
 * Note: All buttons inside forms must have explicit type="button" to prevent form submission
 */

interface Props {
  /** Team ID for the flow */
  teamId: string
  /** Existing flow to edit (undefined for new flow) */
  flow?: Partial<Flow>
  /** Existing inputs (for editing) */
  inputs?: FlowInput[]
  /** Existing outputs (for editing) */
  outputs?: FlowOutput[]
  /** Callback on successful save */
  onSuccess?: (flowId: string) => void
  /** Callback on cancel */
  onCancel?: () => void
}

const props = defineProps<Props>()
const emit = defineEmits<{
  saved: [flowId: string]
  cancel: []
}>()

// ============================================================================
// REFS & STATE
// ============================================================================

const stepper = useTemplateRef('stepper')
const currentStep = ref(0)
const loading = ref(false)
const toast = useToast()

// Track the flow ID after it's saved (for new flows)
const savedFlowId = ref<string | undefined>(props.flow?.id)

// Default domains for new flows
const DEFAULT_DOMAINS = ['design', 'frontend', 'backend', 'product', 'infrastructure', 'docs']

// ============================================================================
// STEP 1: FLOW SETTINGS
// ============================================================================

const flowSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  aiEnabled: z.boolean().default(true),
  anthropicApiKey: z.string().optional(),
  aiSummaryPrompt: z.string().optional(),
  aiTaskPrompt: z.string().optional(),
  replyPersonality: z.string().optional(),
  personalityIcon: z.string().optional(),
  availableDomains: z.array(z.string()).min(1, 'At least one domain required').default(DEFAULT_DOMAINS)
})

type FlowSchema = z.output<typeof flowSchema>

const flowState = reactive<Partial<FlowSchema>>({
  name: props.flow?.name || '',
  description: props.flow?.description || '',
  aiEnabled: props.flow?.aiEnabled ?? true,
  anthropicApiKey: props.flow?.anthropicApiKey || '',
  aiSummaryPrompt: props.flow?.aiSummaryPrompt || '',
  aiTaskPrompt: props.flow?.aiTaskPrompt || '',
  replyPersonality: props.flow?.replyPersonality || '',
  personalityIcon: props.flow?.personalityIcon || '',
  availableDomains: props.flow?.availableDomains || DEFAULT_DOMAINS
})

// Preset prompt examples
const promptPresets = [
  {
    label: 'Default (Balanced)',
    value: 'default',
    summaryPrompt: '',
    taskPrompt: ''
  },
  {
    label: 'Technical Focus',
    value: 'technical',
    summaryPrompt: 'Focus on technical details, implementation specifics, and architectural considerations.',
    taskPrompt: 'Extract highly specific technical tasks with clear acceptance criteria.'
  },
  {
    label: 'Product Focus',
    value: 'product',
    summaryPrompt: 'Focus on user needs, business value, and product strategy.',
    taskPrompt: 'Extract user stories and product requirements with clear value propositions.'
  },
  {
    label: 'Design Focus',
    value: 'design',
    summaryPrompt: 'Focus on visual design, user experience, and interface patterns.',
    taskPrompt: 'Extract design tasks with specific deliverables and design system references.'
  }
]

// Detect preset from existing prompts
function detectPresetFromPrompts(summaryPrompt?: string, taskPrompt?: string): string {
  if (!summaryPrompt && !taskPrompt) return 'default'

  for (const preset of promptPresets) {
    if (preset.value === 'default') continue
    if (preset.summaryPrompt === summaryPrompt && preset.taskPrompt === taskPrompt) {
      return preset.value
    }
  }
  return 'default' // Custom prompts that don't match any preset
}

const selectedPreset = ref(detectPresetFromPrompts(props.flow?.aiSummaryPrompt, props.flow?.aiTaskPrompt))

// Reply personality presets
const personalityPresets = [
  { value: 'professional', label: 'Professional (default)', description: 'Formal, clear, minimal' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, encouraging' },
  { value: 'concise', label: 'Concise', description: 'Ultra-brief' },
  { value: 'pirate', label: 'Pirate', description: 'Arrr!' },
  { value: 'robot', label: 'Robot', description: 'Beep boop' },
  { value: 'zen', label: 'Zen', description: 'Calm, mindful' },
  { value: 'custom', label: 'Custom...', description: 'Write your own AI prompt' }
]

// Custom personality prompt (extracted from replyPersonality when it starts with 'custom:')
const customPersonalityPrompt = ref('')

// Sync custom prompt with replyPersonality
watch(() => flowState.replyPersonality, (value) => {
  if (value?.startsWith('custom:')) {
    customPersonalityPrompt.value = value.replace(/^custom:/, '')
  } else {
    customPersonalityPrompt.value = ''
  }
}, { immediate: true })

// Update replyPersonality when custom prompt changes
watch(customPersonalityPrompt, (value) => {
  if (flowState.replyPersonality === 'custom' || (flowState.replyPersonality && flowState.replyPersonality.startsWith('custom:'))) {
    flowState.replyPersonality = value ? `custom:${value}` : 'custom'
  }
})

// ============================================================================
// PERSONALITY ICON SUGGESTIONS
// ============================================================================

interface IconSuggestion {
  icon: string
  type: 'emoji' | 'lucide' | 'svg'
  label: string
}

const iconSuggestions = ref<IconSuggestion[]>([])
const loadingIconSuggestions = ref(false)
const showManualIconInput = ref(false)
const manualIconInput = ref('')

async function suggestPersonalityIcons() {
  if (!customPersonalityPrompt.value || customPersonalityPrompt.value.length < 3) {
    toast.add({
      title: 'Enter a description first',
      description: 'Please describe the personality before suggesting icons',
      color: 'warning'
    })
    return
  }

  loadingIconSuggestions.value = true
  iconSuggestions.value = []

  try {
    const response = await $fetch<{ suggestions: IconSuggestion[] }>('/api/ai/suggest-icons', {
      method: 'POST',
      body: {
        description: customPersonalityPrompt.value,
        anthropicApiKey: flowState.anthropicApiKey
      }
    })

    iconSuggestions.value = response.suggestions
  } catch (error: any) {
    console.error('Failed to suggest icons:', error)
    toast.add({
      title: 'Icon suggestion failed',
      description: error.message || 'Could not generate icon suggestions',
      color: 'error'
    })
    // Provide fallback suggestions
    iconSuggestions.value = [
      { icon: '🤖', type: 'emoji', label: 'Robot' },
      { icon: '💬', type: 'emoji', label: 'Chat' },
      { icon: '✨', type: 'emoji', label: 'Sparkles' }
    ]
  } finally {
    loadingIconSuggestions.value = false
  }
}

function selectIcon(icon: string) {
  flowState.personalityIcon = icon
  toast.add({
    title: 'Icon selected',
    description: `${icon} will be used for this personality`,
    color: 'success'
  })
}

function applyManualIcon() {
  if (manualIconInput.value) {
    flowState.personalityIcon = manualIconInput.value
    showManualIconInput.value = false
    manualIconInput.value = ''
    toast.add({
      title: 'Icon applied',
      description: `${flowState.personalityIcon} will be used for this personality`,
      color: 'success'
    })
  }
}

function clearPersonalityIcon() {
  flowState.personalityIcon = ''
}

// Watch preset changes
watch(selectedPreset, (preset) => {
  const selected = promptPresets.find(p => p.value === preset)
  if (selected && preset !== 'default') {
    flowState.aiSummaryPrompt = selected.summaryPrompt
    flowState.aiTaskPrompt = selected.taskPrompt
  } else {
    flowState.aiSummaryPrompt = ''
    flowState.aiTaskPrompt = ''
  }
})

// Prompt preview
const { buildPreview } = usePromptPreview()
const promptPreview = computed(() => buildPreview(
  flowState.aiSummaryPrompt,
  flowState.aiTaskPrompt
))

// Domain management
const newDomain = ref('')

function addDomain() {
  if (newDomain.value && !flowState.availableDomains?.includes(newDomain.value)) {
    if (!flowState.availableDomains) {
      flowState.availableDomains = []
    }
    flowState.availableDomains.push(newDomain.value.toLowerCase())
    newDomain.value = ''
  }
}

function removeDomain(domain: string) {
  if (flowState.availableDomains) {
    flowState.availableDomains = flowState.availableDomains.filter(d => d !== domain)
  }
}

// ============================================================================
// STEP 2: INPUTS
// ============================================================================

interface InputFormData {
  sourceType: 'slack' | 'figma' | 'email' | 'notion'
  name: string
  emailSlug?: string
  emailAddress?: string
  apiToken?: string
  sourceMetadata?: Record<string, any>
  // Notion-specific fields
  notionToken?: string
  triggerKeyword?: string
}

const inputsList = ref<Partial<FlowInput>[]>(props.inputs || [])

const inputFormState = reactive<Partial<InputFormData>>({
  sourceType: 'slack',
  name: '',
  emailSlug: '',
  emailAddress: '',
  apiToken: '',
  sourceMetadata: {},
  // Notion-specific fields
  notionToken: '',
  triggerKeyword: '@discubot'
})

// Modal state control
const isSlackModalOpen = ref(false)
const isFigmaModalOpen = ref(false)
const isNotionInputModalOpen = ref(false)
const isEditInputModalOpen = ref(false)
const editingInputIndex = ref<number | null>(null)
const editingInput = ref<Partial<FlowInput> | null>(null)

// Output edit modal state
const isEditOutputModalOpen = ref(false)
const editingOutputIndex = ref<number | null>(null)
const editingOutput = ref<Partial<FlowOutput> | null>(null)

// User mapping drawer state
const isUserMappingDrawerOpen = ref(false)
const userMappingContext = ref<{
  sourceType: 'slack' | 'figma' | 'notion'
  sourceWorkspaceId: string
  apiToken?: string
  notionToken: string
  inputName: string
} | null>(null)

// Computed email address for Figma inputs
const computedEmailAddress = computed(() => {
  if (inputFormState.sourceType === 'figma' && inputFormState.emailAddress) {
    return inputFormState.emailAddress
  }
  return ''
})

// Computed webhook URL for Notion inputs
const notionWebhookUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/webhooks/notion-input`
  }
  return '/api/webhooks/notion-input'
})

// Notion connection test state
const testingNotionConnection = ref(false)
const notionConnectionStatus = ref<'idle' | 'success' | 'error'>('idle')
const notionConnectionError = ref('')

// Copy webhook URL to clipboard
async function copyNotionWebhookUrl() {
  try {
    await navigator.clipboard.writeText(notionWebhookUrl.value)
    toast.add({
      title: 'Copied!',
      description: 'Webhook URL copied to clipboard',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Copy failed',
      description: 'Please copy the URL manually',
      color: 'error'
    })
  }
}

// Test Notion connection
async function testNotionConnection() {
  if (!inputFormState.notionToken) {
    toast.add({
      title: 'Missing token',
      description: 'Please enter your Notion integration token first',
      color: 'warning'
    })
    return
  }

  testingNotionConnection.value = true
  notionConnectionStatus.value = 'idle'
  notionConnectionError.value = ''

  try {
    // Call Notion API to verify token (GET /users/me)
    const response = await $fetch('/api/notion/test-connection', {
      method: 'POST',
      body: {
        notionToken: inputFormState.notionToken
      }
    })

    notionConnectionStatus.value = 'success'
    toast.add({
      title: 'Connection successful!',
      description: `Connected as ${(response as any).bot?.owner?.user?.name || 'Notion Integration'}`,
      color: 'success'
    })
  } catch (error: any) {
    notionConnectionStatus.value = 'error'
    notionConnectionError.value = error.message || 'Failed to connect to Notion'
    toast.add({
      title: 'Connection failed',
      description: error.message || 'Unable to verify Notion token',
      color: 'error'
    })
  } finally {
    testingNotionConnection.value = false
  }
}

const inputSchema = computed(() => z.object({
  sourceType: z.enum(['slack', 'figma', 'email', 'notion']),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  emailSlug: inputFormState.sourceType === 'figma'
    ? z.string().min(1, 'Email slug is required')
    : z.string().optional(),
  // For non-Figma inputs, allow empty string or valid email (since emailAddress defaults to '')
  emailAddress: inputFormState.sourceType === 'figma'
    ? z.string().email('Invalid email')
    : z.union([z.string().email(), z.literal('')]).optional(),
  apiToken: inputFormState.sourceType === 'figma'
    ? z.string().min(1, 'Figma API token is required')
    : z.string().optional(),
  // Notion-specific validation
  notionToken: inputFormState.sourceType === 'notion'
    ? z.string().min(1, 'Notion token is required')
    : z.string().optional(),
  triggerKeyword: inputFormState.sourceType === 'notion'
    ? z.string().min(1, 'Trigger keyword is required')
    : z.string().optional()
}))

// OAuth handling for Slack - pass reactive ref so it updates after step 1 save
const { openOAuthPopup, waitingForOAuth } = useFlowOAuth({
  teamId: props.teamId,
  flowId: savedFlowId, // Reactive ref - will be set after step 1 saves the flow
  provider: 'slack',
  onSuccess: async (credentials) => {
    inputFormState.apiToken = credentials.apiToken
    inputFormState.sourceMetadata = credentials.sourceMetadata

    // Flow should always have an ID by the time we reach step 2
    // The OAuth callback already created the input in the database
    if (savedFlowId.value) {
      console.log('[FlowBuilder] Refetching inputs for flow:', savedFlowId.value)
      try {
        const response = await $fetch<FlowInput[]>(`/api/teams/${props.teamId}/discubot-flowinputs`)
        // Filter inputs for this flow
        const flowInputs = response.filter(input => input.flowId === savedFlowId.value)

        // Update local state
        inputsList.value = flowInputs

        console.log('[FlowBuilder] Refetched inputs:', flowInputs.length, 'inputs for flow', savedFlowId.value)

        // Close the modal
        isSlackModalOpen.value = false

        // Show success message
        toast.add({
          title: 'Slack Connected!',
          description: `${credentials.sourceMetadata.slackWorkspaceName || 'Workspace'} has been added to your flow.`,
          color: 'success'
        })
      } catch (error: any) {
        console.error('[FlowBuilder] Failed to refetch inputs:', error)
        toast.add({
          title: 'Connection Error',
          description: 'Slack was connected but failed to refresh the list. Please reload the page.',
          color: 'warning'
        })
      }
    } else {
      // This shouldn't happen now - flow is saved before step 2
      console.warn('[FlowBuilder] No flowId available - this should not happen')
      toast.add({
        title: 'OAuth successful',
        description: 'Slack workspace connected.',
        color: 'success'
      })
    }
  },
  onError: (error) => {
    toast.add({
      title: 'OAuth failed',
      description: error.message || 'Failed to connect Slack',
      color: 'error'
    })
  }
})

function resetInputForm(sourceType: 'slack' | 'figma' | 'email' | 'notion') {
  inputFormState.sourceType = sourceType
  inputFormState.name = ''
  inputFormState.apiToken = ''
  inputFormState.sourceMetadata = {}

  // Generate unique email address for Figma inputs
  if (sourceType === 'figma') {
    const uniqueId = humanId({
      separator: '-',
      capitalize: false
    })
    inputFormState.emailSlug = uniqueId
    inputFormState.emailAddress = `${uniqueId}@messages.friendlyinter.net`
  } else {
    inputFormState.emailSlug = ''
    inputFormState.emailAddress = ''
  }

  // Reset Notion-specific fields
  if (sourceType === 'notion') {
    inputFormState.notionToken = ''
    inputFormState.triggerKeyword = 'discubot'
  } else {
    inputFormState.notionToken = ''
    inputFormState.triggerKeyword = ''
  }
}

async function saveInput(event: FormSubmitEvent<InputFormData>, close: () => void) {
  // Build sourceMetadata based on source type
  let sourceMetadata: Record<string, any> = { ...inputFormState.sourceMetadata }

  // Add Notion-specific config to sourceMetadata
  if (event.data.sourceType === 'notion') {
    sourceMetadata = {
      ...sourceMetadata,
      notionToken: inputFormState.notionToken,
      triggerKeyword: inputFormState.triggerKeyword || 'discubot'
    } as NotionInputConfig
  }

  const inputData: Partial<FlowInput> = {
    sourceType: event.data.sourceType,
    name: event.data.name,
    emailSlug: event.data.emailSlug || inputFormState.emailSlug,
    emailAddress: event.data.emailAddress || inputFormState.emailAddress,
    apiToken: event.data.apiToken,
    sourceMetadata,
    active: true
  }

  // Save immediately to database if we have a flowId
  if (savedFlowId.value) {
    try {
      const savedInput = await $fetch<FlowInput>(`/api/teams/${props.teamId}/discubot-flowinputs`, {
        method: 'POST',
        body: {
          ...inputData,
          flowId: savedFlowId.value
        }
      })
      console.log('[FlowBuilder] Input saved to database:', savedInput)

      // Add the saved input (with ID) to the list
      inputsList.value.push(savedInput)

      close()
      toast.add({
        title: 'Input saved',
        description: `${event.data.name} has been added to your flow`,
        color: 'success'
      })
    } catch (error: any) {
      console.error('[FlowBuilder] Failed to save input:', error)
      toast.add({
        title: 'Save failed',
        description: error.message || 'Failed to save input',
        color: 'error'
      })
    }
  } else {
    // No flowId yet - this shouldn't happen since flow is saved in step 1
    console.warn('[FlowBuilder] No flowId available - cannot save input')
    toast.add({
      title: 'Error',
      description: 'Flow must be created first. Please go back to step 1.',
      color: 'error'
    })
  }
}

async function deleteInput(index: number) {
  const input = inputsList.value[index]

  // If input has an ID, delete from database
  if (input.id) {
    try {
      await $fetch(`/api/teams/${props.teamId}/discubot-flowinputs/${input.id}`, {
        method: 'DELETE',
      })
    } catch (error: any) {
      toast.add({
        title: 'Failed to delete input',
        description: error.message || 'Could not delete input from database',
        color: 'error'
      })
      return
    }
  }

  // Remove from local list
  inputsList.value.splice(index, 1)
  toast.add({
    title: 'Input deleted',
    description: `${input.name} has been deleted`,
    color: 'success'
  })
}

function openEditInput(index: number) {
  const input = inputsList.value[index]
  editingInputIndex.value = index
  editingInput.value = {
    ...input,
    sourceMetadata: { ...(input.sourceMetadata || {}) }
  }
  isEditInputModalOpen.value = true
}

async function saveEditInput() {
  if (editingInputIndex.value === null || !editingInput.value) return

  const input = editingInput.value

  // If input has an ID, update in database
  if (input.id && savedFlowId.value) {
    try {
      await $fetch(`/api/teams/${props.teamId}/discubot-flowinputs/${input.id}`, {
        method: 'PATCH',
        body: {
          name: input.name,
          apiToken: input.apiToken,
          emailAddress: input.emailAddress,
          emailSlug: input.emailSlug,
          sourceMetadata: input.sourceMetadata
        }
      })
      console.log('[FlowBuilder] Input updated in database')
    } catch (error: any) {
      console.error('[FlowBuilder] Failed to update input:', error)
      toast.add({
        title: 'Update failed',
        description: error.message || 'Failed to update input',
        color: 'error'
      })
      return
    }
  }

  // Update local state
  inputsList.value[editingInputIndex.value] = { ...input }

  isEditInputModalOpen.value = false
  editingInputIndex.value = null
  editingInput.value = null

  toast.add({
    title: 'Input updated',
    description: `${input.name} has been updated`,
    color: 'success'
  })
}

function openUserMappingDrawer(index: number) {
  const input = inputsList.value[index]

  if (!input) {
    toast.add({
      title: 'Error',
      description: 'Input not found',
      color: 'error'
    })
    return
  }

  // Get workspace ID based on source type
  // For Figma: use emailSlug (the part before @), NOT the full email address
  // For Notion: use notionWorkspaceId from sourceMetadata (auto-captured from webhook)
  let sourceWorkspaceId = ''

  if (input.sourceType === 'slack') {
    sourceWorkspaceId = (input.sourceMetadata?.slackTeamId as string) || ''
  } else if (input.sourceType === 'figma') {
    sourceWorkspaceId = input.emailSlug || ''
  } else if (input.sourceType === 'notion') {
    sourceWorkspaceId = (input.sourceMetadata?.notionWorkspaceId as string) || ''
  }

  if (!sourceWorkspaceId) {
    // Provide specific message for Notion
    if (input.sourceType === 'notion') {
      toast.add({
        title: 'Workspace ID Not Yet Available',
        description: 'Trigger a test comment with your keyword to capture the workspace ID.',
        color: 'warning'
      })
    } else {
      toast.add({
        title: 'Missing Workspace ID',
        description: 'This input doesn\'t have a workspace ID configured yet.',
        color: 'warning'
      })
    }
    return
  }

  // Get Notion token - for Notion inputs, use the input's own token
  // For other sources, get from first Notion output
  let notionToken = ''

  if (input.sourceType === 'notion') {
    notionToken = (input.sourceMetadata?.notionToken as string) || input.apiToken || ''
  }

  if (!notionToken) {
    const notionOutput = outputsList.value.find(o => o.outputType === 'notion')
    notionToken = (notionOutput?.outputConfig as { notionToken?: string })?.notionToken || ''
  }

  if (!notionToken) {
    toast.add({
      title: input.sourceType === 'notion' ? 'No Notion Token' : 'No Notion Output',
      description: input.sourceType === 'notion'
        ? 'Please configure a Notion token for this input.'
        : 'Add a Notion output first to manage user mappings.',
      color: 'warning'
    })
    return
  }

  userMappingContext.value = {
    sourceType: input.sourceType as 'slack' | 'figma' | 'notion',
    sourceWorkspaceId,
    apiToken: input.apiToken,
    notionToken,
    inputName: input.name || 'Input'
  }

  isUserMappingDrawerOpen.value = true
}

function handleUserMappingSaved() {
  toast.add({
    title: 'Mappings Saved',
    description: 'User mappings have been saved successfully.',
    color: 'success'
  })
}

// ============================================================================
// STEP 3: OUTPUTS
// ============================================================================

interface OutputFormData {
  outputType: 'notion' | 'github' | 'linear'
  name: string
  domainFilter: string[]
  isDefault: boolean
  notionToken?: string
  databaseId?: string
  fieldMapping?: Record<string, any>
}

const outputsList = ref<Partial<FlowOutput>[]>(props.outputs || [])

const outputFormState = reactive<Partial<OutputFormData>>({
  outputType: 'notion',
  name: '',
  domainFilter: [],
  isDefault: false,
  notionToken: '',
  databaseId: '',
  fieldMapping: {
    priority: { notionProperty: '', propertyType: '', valueMap: {} },
    type: { notionProperty: '', propertyType: '', valueMap: {} },
    assignee: { notionProperty: '', propertyType: '', valueMap: {} },
    domain: { notionProperty: '', propertyType: '', valueMap: {} }
  }
})

const outputSchema = z.object({
  outputType: z.enum(['notion', 'github', 'linear']),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  domainFilter: z.array(z.string()),
  isDefault: z.boolean(),
  notionToken: z.string().min(1, 'Notion token required').optional(),
  databaseId: z.string().min(1, 'Database ID required').optional()
}).refine((data) => {
  // For Notion outputs, require token and database ID
  if (data.outputType === 'notion') {
    return !!data.notionToken && !!data.databaseId
  }
  return true
}, {
  message: 'Notion token and database ID are required for Notion outputs',
  path: ['outputType']
})

// Notion schema fetching
const { fetchNotionSchema, schema: notionSchema, loading: fetchingSchema, error: schemaError } = useNotionSchema()
const { generateAutoMapping, getPropertyTypeColor } = useFieldMapping()

async function fetchAndMapNotionSchema() {
  if (!outputFormState.notionToken || !outputFormState.databaseId) {
    toast.add({
      title: 'Missing credentials',
      description: 'Please enter Notion token and database ID first',
      color: 'warning'
    })
    return
  }

  try {
    console.log('[FlowBuilder] Fetching schema...')

    await fetchNotionSchema({
      databaseId: outputFormState.databaseId,
      notionToken: outputFormState.notionToken
    })

    console.log('[FlowBuilder] Schema fetched:', notionSchema.value)
    console.log('[FlowBuilder] Schema error:', schemaError.value)

    if (notionSchema.value && !schemaError.value) {
      // Auto-generate field mapping
      const mapping = generateAutoMapping(notionSchema.value, {
        aiFields: ['priority', 'type', 'assignee', 'domain'],
        similarityThreshold: 0.3  // Lower threshold to catch more matches
      })

      console.log('[FlowBuilder] Generated mapping:', mapping)

      // Ensure all fields have a structure even if not auto-mapped
      outputFormState.fieldMapping = {
        priority: mapping.priority || { notionProperty: '', propertyType: '', valueMap: {} },
        type: mapping.type || { notionProperty: '', propertyType: '', valueMap: {} },
        assignee: mapping.assignee || { notionProperty: '', propertyType: '', valueMap: {} },
        domain: mapping.domain || { notionProperty: '', propertyType: '', valueMap: {} }
      }

      toast.add({
        title: 'Schema fetched',
        description: 'Field mapping auto-generated from Notion database',
        color: 'success'
      })
    } else if (schemaError.value) {
      toast.add({
        title: 'Schema fetch failed',
        description: schemaError.value,
        color: 'error'
      })
    } else {
      console.error('[FlowBuilder] Schema is null but no error')
      toast.add({
        title: 'Schema fetch failed',
        description: 'No schema returned',
        color: 'error'
      })
    }
  } catch (error) {
    console.error('[FlowBuilder] Error fetching schema:', error)
    toast.add({
      title: 'Schema fetch failed',
      description: error.message || 'Unknown error',
      color: 'error'
    })
  }
}

/**
 * Fetch schema for editing an existing output
 * Does NOT auto-map - preserves existing field mappings
 */
async function fetchSchemaForEdit() {
  if (!editingOutput.value) return

  const config = editingOutput.value.outputConfig as NotionOutputConfig
  if (!config?.notionToken || !config?.databaseId) {
    toast.add({
      title: 'Missing credentials',
      description: 'Please enter Notion token and database ID first',
      color: 'warning'
    })
    return
  }

  try {
    await fetchNotionSchema({
      databaseId: config.databaseId,
      notionToken: config.notionToken
    })

    if (notionSchema.value && !schemaError.value) {
      // Ensure fieldMapping exists with proper structure (don't overwrite existing values)
      if (!config.fieldMapping) {
        config.fieldMapping = {
          priority: { notionProperty: '', propertyType: '', valueMap: {} },
          type: { notionProperty: '', propertyType: '', valueMap: {} },
          assignee: { notionProperty: '', propertyType: '', valueMap: {} },
          domain: { notionProperty: '', propertyType: '', valueMap: {} }
        }
      }

      toast.add({
        title: 'Schema loaded',
        description: 'You can now edit field mappings',
        color: 'success'
      })
    } else if (schemaError.value) {
      toast.add({
        title: 'Schema fetch failed',
        description: schemaError.value,
        color: 'error'
      })
    }
  } catch (error: any) {
    console.error('[FlowBuilder] Error fetching schema for edit:', error)
    toast.add({
      title: 'Schema fetch failed',
      description: error.message || 'Unknown error',
      color: 'error'
    })
  }
}

function resetOutputForm(outputType: 'notion' | 'github' | 'linear') {
  outputFormState.outputType = outputType
  outputFormState.name = ''
  outputFormState.domainFilter = []
  outputFormState.isDefault = outputsList.value.length === 0 // First output is default
  outputFormState.notionToken = ''
  outputFormState.databaseId = ''
  outputFormState.fieldMapping = {
    priority: { notionProperty: '', propertyType: '', valueMap: {} },
    type: { notionProperty: '', propertyType: '', valueMap: {} },
    assignee: { notionProperty: '', propertyType: '', valueMap: {} },
    domain: { notionProperty: '', propertyType: '', valueMap: {} }
  }
}

function saveOutput(event: FormSubmitEvent<OutputFormData>, close: () => void) {
  // Build output config based on type
  let outputConfig: Record<string, any> = {}

  if (event.data.outputType === 'notion') {
    outputConfig = {
      notionToken: event.data.notionToken,
      databaseId: event.data.databaseId,
      fieldMapping: outputFormState.fieldMapping
    } as NotionOutputConfig
  }

  const outputData: Partial<FlowOutput> = {
    outputType: event.data.outputType,
    name: event.data.name,
    domainFilter: event.data.domainFilter,
    isDefault: event.data.isDefault,
    outputConfig,
    active: true
  }

  // If setting as default, unset other defaults
  if (outputData.isDefault) {
    outputsList.value.forEach((output: Partial<FlowOutput>) => {
      output.isDefault = false
    })
  }

  outputsList.value.push(outputData)

  close()
  toast.add({
    title: 'Output saved',
    description: `${event.data.name} has been added`,
    color: 'success'
  })
}

async function deleteOutput(index: number) {
  const output = outputsList.value[index]

  // If output has an ID, delete from database
  if (output.id) {
    try {
      await $fetch(`/api/teams/${props.teamId}/discubot-flowoutputs/${output.id}`, {
        method: 'DELETE',
      })
    } catch (error: any) {
      toast.add({
        title: 'Failed to delete output',
        description: error.message || 'Could not delete output from database',
        color: 'error'
      })
      return
    }
  }

  // Remove from local list
  outputsList.value.splice(index, 1)
  toast.add({
    title: 'Output deleted',
    description: `${output.name} has been deleted`,
    color: 'success'
  })
}

function openEditOutput(index: number) {
  const output = outputsList.value[index]
  editingOutputIndex.value = index
  editingOutput.value = {
    ...output,
    outputConfig: { ...output.outputConfig }
  }
  isEditOutputModalOpen.value = true
}

async function saveEditOutput() {
  if (editingOutputIndex.value === null || !editingOutput.value) return

  const output = editingOutput.value

  // If output has an ID, update in database
  if (output.id && savedFlowId.value) {
    try {
      await $fetch(`/api/teams/${props.teamId}/discubot-flowoutputs/${output.id}`, {
        method: 'PATCH',
        body: {
          name: output.name,
          domainFilter: output.domainFilter,
          isDefault: output.isDefault,
          outputConfig: output.outputConfig
        }
      })
      console.log('[FlowBuilder] Output updated in database')
    } catch (error: any) {
      console.error('[FlowBuilder] Failed to update output:', error)
      toast.add({
        title: 'Update failed',
        description: error.message || 'Failed to update output',
        color: 'error'
      })
      return
    }
  }

  // If setting as default, unset other defaults
  if (output.isDefault) {
    outputsList.value.forEach((o: Partial<FlowOutput>, i: number) => {
      if (i !== editingOutputIndex.value) {
        o.isDefault = false
      }
    })
  }

  // Update local state
  outputsList.value[editingOutputIndex.value] = { ...output }

  isEditOutputModalOpen.value = false
  editingOutputIndex.value = null
  editingOutput.value = null

  toast.add({
    title: 'Output updated',
    description: `${output.name} has been updated`,
    color: 'success'
  })
}

// Validation: At least one default output required
const hasDefaultOutput = computed(() => {
  return outputsList.value.some((output: Partial<FlowOutput>) => output.isDefault)
})

// ============================================================================
// WIZARD NAVIGATION
// ============================================================================

const stepperItems: StepperItem[] = [
  {
    title: 'Flow Settings',
    description: 'Configure AI and domains',
    icon: 'i-lucide-settings',
    value: 0
  },
  {
    title: 'Add Inputs',
    description: 'Connect sources',
    icon: 'i-lucide-inbox',
    value: 1
  },
  {
    title: 'Add Outputs',
    description: 'Configure destinations',
    icon: 'i-lucide-send',
    value: 2
  }
]

function nextStep() {
  console.log(currentStep.value)
  if (currentStep.value < stepperItems.length - 1) {
    stepper.value?.next()
    console.log(currentStep.value)
    // currentStep is updated automatically via v-model
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    stepper.value?.prev()
    // currentStep is updated automatically via v-model
  }
}

// ============================================================================
// FORM SUBMISSION
// ============================================================================

async function onFlowSubmit(event: FormSubmitEvent<FlowSchema>) {
  // For new flows, save the flow first so we have a flowId for OAuth
  if (!savedFlowId.value) {
    loading.value = true
    try {
      const flowData: Partial<Flow> = {
        ...event.data,
        teamId: props.teamId,
        active: false, // Not active until fully configured
        onboardingComplete: false
      }

      const flowResponse = await $fetch<{ id: string }>(`/api/teams/${props.teamId}/discubot-flows`, {
        method: 'POST',
        body: flowData
      })

      savedFlowId.value = flowResponse.id
      console.log('[FlowBuilder] Flow saved with ID:', savedFlowId.value)

      toast.add({
        title: 'Flow created',
        description: 'Now add your input sources',
        color: 'success'
      })
    } catch (error: any) {
      console.error('[FlowBuilder] Failed to save flow:', error)
      toast.add({
        title: 'Save failed',
        description: error.message || 'Failed to create flow',
        color: 'error'
      })
      loading.value = false
      return // Don't proceed to next step
    }
    loading.value = false
  }

  nextStep()
}

async function saveFlow() {
  // Validate we have at least one default output
  if (outputsList.value.length === 0) {
    toast.add({
      title: 'Validation failed',
      description: 'Please add at least one output',
      color: 'error'
    })
    return
  }

  if (!hasDefaultOutput.value) {
    toast.add({
      title: 'Validation failed',
      description: 'At least one output must be set as default',
      color: 'error'
    })
    return
  }

  loading.value = true

  try {
    // Use the savedFlowId (set in step 1) or props.flow?.id (editing existing)
    const flowId = savedFlowId.value || props.flow?.id

    if (!flowId) {
      throw new Error('Flow ID not found - flow should have been saved in step 1')
    }

    // Update flow settings and mark as active/complete
    const flowData: Partial<Flow> = {
      ...flowState as FlowSchema,
      teamId: props.teamId,
      active: true,
      onboardingComplete: true
    }

    await $fetch(`/api/teams/${props.teamId}/discubot-flows/${flowId}`, {
      method: 'PATCH',
      body: flowData
    })

    // Save only NEW inputs (those without an id - OAuth-added inputs already have ids)
    console.log('[FlowBuilder] Saving inputs:', inputsList.value.length, 'inputs total')
    for (const input of inputsList.value) {
      console.log('[FlowBuilder] Input:', input.name, 'hasId:', !!input.id, 'sourceType:', input.sourceType)
      if (!input.id) {
        try {
          const savedInput = await $fetch(`/api/teams/${props.teamId}/discubot-flowinputs`, {
            method: 'POST',
            body: {
              ...input,
              flowId
            }
          })
          console.log('[FlowBuilder] Input saved successfully:', savedInput)
        } catch (inputError: any) {
          console.error('[FlowBuilder] Failed to save input:', input.name, inputError)
          throw inputError // Re-throw to trigger the outer catch
        }
      }
    }

    // Save only NEW outputs (those without an id)
    for (const output of outputsList.value) {
      if (!output.id) {
        await $fetch(`/api/teams/${props.teamId}/discubot-flowoutputs`, {
          method: 'POST',
          body: {
            ...output,
            flowId
          }
        })
      }
    }

    toast.add({
      title: 'Flow saved',
      description: `${flowState.name} has been saved successfully`,
      color: 'success'
    })

    emit('saved', flowId)
    if (props.onSuccess) {
      props.onSuccess(flowId)
    }
  } catch (error: any) {
    console.error('Failed to save flow:', error)
    toast.add({
      title: 'Save failed',
      description: error.message || 'Failed to save flow',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function cancel() {
  emit('cancel')
  if (props.onCancel) {
    props.onCancel()
  }
}
</script>

<template>
  <div class="flow-builder">
    <!-- Wizard Stepper -->
    <UStepper
      ref="stepper"
      v-model="currentStep"
      :items="stepperItems"
      class="mb-8"
    >
      <!-- Step 1: Flow Settings -->
      <template #content="{ item }">
        <div v-if="item.value === 0" class="space-y-6">
          <UForm
            :state="flowState"
            :schema="flowSchema"
            class="space-y-4"
            @submit="onFlowSubmit"
          >
            <!-- Basic Settings -->
            <UCard>
              <template #header>
                <h3 class="text-lg font-semibold">Basic Settings</h3>
              </template>

              <div class="space-y-4">
                <UFormField label="Flow Name" name="name" required>
                  <UInput
                    v-model="flowState.name"
                    placeholder="e.g., Product Team Flow"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Description" name="description">
                  <UTextarea
                    v-model="flowState.description"
                    placeholder="Describe what this flow handles..."
                    :rows="3"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </UCard>

            <!-- AI Configuration -->
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold">AI Configuration</h3>
                  <USwitch
                    v-model="flowState.aiEnabled"
                    label="AI Enabled"
                  />
                </div>
              </template>

              <div v-if="flowState.aiEnabled" class="space-y-4">
                <UFormField
                  label="Anthropic API Key"
                  name="anthropicApiKey"
                  help="Optional - uses team default if not provided"
                >
                  <UInput
                    v-model="flowState.anthropicApiKey"
                    type="password"
                    placeholder="sk-ant-..."
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Prompt Preset" name="preset">
                  <USelect
                    v-model="selectedPreset"
                    :items="promptPresets.map(p => ({ value: p.value, label: p.label }))"
                    value-attribute="value"
                    label-attribute="label"
                    class="w-full"
                  />
                </UFormField>

                <USeparator class="my-4" />

                <!-- Reply Personality -->
                <UFormField
                  label="Reply Personality"
                  name="replyPersonality"
                  help="How the bot responds when tasks are created"
                >
                  <USelect
                    v-model="flowState.replyPersonality"
                    :items="personalityPresets.map(p => ({ value: p.value, label: p.label }))"
                    value-attribute="value"
                    label-attribute="label"
                    placeholder="Professional (default)"
                    class="w-full"
                  />
                </UFormField>

                <!-- Custom Personality Prompt (shown when "custom" is selected) -->
                <UFormField
                  v-if="flowState.replyPersonality === 'custom' || (flowState.replyPersonality && flowState.replyPersonality.startsWith('custom:'))"
                  label="Custom Personality Prompt"
                  name="customPersonalityPrompt"
                  help="Describe how the bot should respond (requires API key)"
                >
                  <UTextarea
                    v-model="customPersonalityPrompt"
                    placeholder="e.g., Reply as a friendly Australian, Be extremely enthusiastic with lots of emojis"
                    :rows="2"
                    class="w-full"
                  />
                </UFormField>

                <!-- Personality Icon Picker (shown when custom personality is selected) -->
                <div
                  v-if="flowState.replyPersonality === 'custom' || (flowState.replyPersonality && flowState.replyPersonality.startsWith('custom:'))"
                  class="space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium">Personality Icon</label>
                    <div class="flex items-center gap-2">
                      <!-- Current icon display -->
                      <span v-if="flowState.personalityIcon" class="text-2xl">
                        {{ flowState.personalityIcon }}
                      </span>
                      <UButton
                        v-if="flowState.personalityIcon"
                        type="button"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-x"
                        @click="clearPersonalityIcon"
                      />
                    </div>
                  </div>

                  <!-- Suggest Icons Button -->
                  <div class="flex gap-2">
                    <UButton
                      type="button"
                      color="primary"
                      variant="outline"
                      size="sm"
                      :loading="loadingIconSuggestions"
                      :disabled="!customPersonalityPrompt || customPersonalityPrompt.length < 3"
                      @click="suggestPersonalityIcons"
                    >
                      <UIcon name="i-lucide-sparkles" class="mr-1" />
                      Suggest Icons
                    </UButton>
                    <UButton
                      type="button"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      @click="showManualIconInput = !showManualIconInput"
                    >
                      {{ showManualIconInput ? 'Hide' : 'Enter manually' }}
                    </UButton>
                  </div>

                  <!-- Manual Icon Input -->
                  <div v-if="showManualIconInput" class="flex gap-2">
                    <UInput
                      v-model="manualIconInput"
                      placeholder="Enter emoji (e.g., 🦘)"
                      class="w-32"
                      @keyup.enter="applyManualIcon"
                    />
                    <UButton
                      type="button"
                      color="primary"
                      size="sm"
                      :disabled="!manualIconInput"
                      @click="applyManualIcon"
                    >
                      Apply
                    </UButton>
                  </div>

                  <!-- Icon Suggestions -->
                  <div v-if="iconSuggestions.length > 0" class="flex gap-2">
                    <UTooltip
                      v-for="(suggestion, index) in iconSuggestions"
                      :key="index"
                      :text="suggestion.label"
                    >
                      <button
                        type="button"
                        class="w-12 h-12 text-2xl rounded-lg border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
                        :class="flowState.personalityIcon === suggestion.icon
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'"
                        @click="selectIcon(suggestion.icon)"
                      >
                        {{ suggestion.icon }}
                      </button>
                    </UTooltip>
                  </div>

                  <p class="text-xs text-muted-foreground">
                    This icon will appear in the pipeline visualization and reply messages
                  </p>
                </div>

                <USeparator class="my-4" />

                <UFormField
                  label="Custom Summary Prompt"
                  name="aiSummaryPrompt"
                  help="Override default AI summary generation"
                >
                  <UTextarea
                    v-model="flowState.aiSummaryPrompt"
                    placeholder="Enter custom prompt..."
                    :rows="3"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Custom Task Prompt"
                  name="aiTaskPrompt"
                  help="Override default AI task detection"
                >
                  <UTextarea
                    v-model="flowState.aiTaskPrompt"
                    placeholder="Enter custom prompt..."
                    :rows="3"
                    class="w-full"
                  />
                </UFormField>

                <div>
                  <UModal>
                    <UButton
                      type="button"
                      color="neutral"
                      variant="outline"
                      size="sm"
                    >
                      Preview Prompts
                    </UButton>

                    <template #content="{ close }">
                      <div class="p-6 max-h-[85vh] overflow-y-auto">
                        <!-- Header -->
                        <div class="flex items-center justify-between mb-6">
                          <h3 class="text-lg font-semibold">Prompt Preview</h3>
                          <UButton
                            color="neutral"
                            variant="ghost"
                            icon="i-lucide-x"
                            @click="close"
                            size="sm"
                          />
                        </div>

                        <!-- Info Banner -->
                        <div class="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                          <p class="text-sm text-primary-600 dark:text-primary-400">
                            This is what will be sent to Claude when processing discussions. Custom prompts are highlighted.
                          </p>
                        </div>

                        <!-- Summary Prompt Section -->
                        <div class="mb-6">
                          <div class="flex items-center justify-between mb-3">
                            <h4 class="text-sm font-semibold flex items-center gap-2">
                              <UIcon name="i-lucide-sparkles" class="w-4 h-4 text-primary" />
                              Summary Prompt
                            </h4>
                            <div class="flex gap-3 text-xs text-muted-foreground">
                              <span>{{ promptPreview.summaryCharCount }} characters</span>
                              <span>~{{ promptPreview.summaryTokenEstimate }} tokens</span>
                            </div>
                          </div>
                          <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                            <pre class="text-xs font-mono whitespace-pre-wrap leading-relaxed">{{ promptPreview.summaryPrompt }}</pre>
                          </div>
                        </div>

                        <USeparator class="my-6" />

                        <!-- Task Detection Prompt Section -->
                        <div class="mb-6">
                          <div class="flex items-center justify-between mb-3">
                            <h4 class="text-sm font-semibold flex items-center gap-2">
                              <UIcon name="i-lucide-list-checks" class="w-4 h-4 text-primary" />
                              Task Detection Prompt
                            </h4>
                            <div class="flex gap-3 text-xs text-muted-foreground">
                              <span>{{ promptPreview.taskCharCount }} characters</span>
                              <span>~{{ promptPreview.taskTokenEstimate }} tokens</span>
                            </div>
                          </div>
                          <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                            <pre class="text-xs font-mono whitespace-pre-wrap leading-relaxed">{{ promptPreview.taskPrompt }}</pre>
                          </div>
                        </div>

                        <USeparator class="my-6" />

                        <!-- Total Stats -->
                        <div class="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <span class="text-sm font-medium">Total</span>
                          <div class="flex gap-4 text-sm">
                            <span>{{ promptPreview.summaryCharCount + promptPreview.taskCharCount }} characters</span>
                            <span>~{{ promptPreview.summaryTokenEstimate + promptPreview.taskTokenEstimate }} tokens</span>
                          </div>
                        </div>

                        <!-- Footer -->
                        <div class="flex justify-end gap-2 mt-6">
                          <UButton color="neutral" variant="ghost" @click="close">
                            Close
                          </UButton>
                        </div>
                      </div>
                    </template>
                  </UModal>
                </div>
              </div>
            </UCard>

            <!-- Available Domains -->
            <UCard>
              <template #header>
                <h3 class="text-lg font-semibold">Available Domains</h3>
              </template>

              <div class="space-y-4">
                <UFormField
                  label="Domains"
                  name="availableDomains"
                  help="Define domains for AI-based routing"
                >
                  <div class="flex flex-wrap gap-2 mb-3">
                    <UBadge
                      v-for="domain in flowState.availableDomains"
                      :key="domain"
                      color="primary"
                      variant="soft"
                      size="lg"
                    >
                      {{ domain }}
                      <button
                        type="button"
                        class="ml-1"
                        @click="removeDomain(domain)"
                      >
                        <UIcon name="i-lucide-x" class="w-3 h-3" />
                      </button>
                    </UBadge>
                  </div>

                  <div class="flex gap-2">
                    <UInput
                      v-model="newDomain"
                      placeholder="Add custom domain..."
                      class="flex-1"
                      @keyup.enter="addDomain"
                    />
                    <UButton
                      type="button"
                      color="primary"
                      variant="outline"
                      @click="addDomain"
                    >
                      Add
                    </UButton>
                  </div>
                </UFormField>
              </div>
            </UCard>

            <!-- Navigation -->
            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                @click="cancel"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                trailing-icon="i-lucide-arrow-right"
                :loading="loading"
              >
                {{ savedFlowId ? 'Next: Add Inputs' : 'Save & Continue' }}
              </UButton>
            </div>
          </UForm>
        </div>

        <!-- Step 2: Inputs -->
        <div v-else-if="item.value === 1" class="space-y-6">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Input Sources</h3>
                <div class="flex gap-2">
                  <!-- Add Slack Modal -->
                  <UModal v-model:open="isSlackModalOpen">
                    <UButton
                      type="button"
                      color="primary"
                      size="sm"
                      @click="resetInputForm('slack'); isSlackModalOpen = true"
                    >
                      <UIcon name="i-simple-icons-slack" />
                      Add Slack
                    </UButton>

                    <template #content="{ close }">
                      <div class="p-6">
                        <h3 class="text-lg font-semibold mb-4">
                          Add Input - Slack
                        </h3>

                        <UForm
                          :state="inputFormState"
                          :schema="inputSchema"
                          class="space-y-4"
                          @submit="(event) => saveInput(event, close)"
                        >
                          <UFormField label="Name" name="name" required>
                            <UInput
                              v-model="inputFormState.name"
                              placeholder="e.g., Product Team Slack"
                              class="w-full"
                            />
                          </UFormField>

                          <UAlert
                            color="info"
                            variant="soft"
                            icon="i-lucide-info"
                            title="OAuth Connection"
                            description="Click below to connect your Slack workspace via OAuth"
                          />
                          <UButton
                            type="button"
                            color="primary"
                            block
                            :loading="waitingForOAuth"
                            @click="openOAuthPopup"
                          >
                            <UIcon name="i-simple-icons-slack" />
                            Connect Slack Workspace
                          </UButton>
                          <div v-if="inputFormState.sourceMetadata?.slackTeamId" class="text-sm text-muted">
                            Connected: {{ inputFormState.sourceMetadata.slackWorkspaceName || inputFormState.sourceMetadata.slackTeamId }}
                          </div>

                          <div class="flex justify-end gap-2 mt-6">
                            <UButton
                              type="button"
                              color="neutral"
                              variant="ghost"
                              @click="close"
                            >
                              Cancel
                            </UButton>
                            <UButton
                              type="submit"
                              color="primary"
                            >
                              Add Input
                            </UButton>
                          </div>
                        </UForm>
                      </div>
                    </template>
                  </UModal>

                  <!-- Add Figma Modal -->
                  <UModal v-model:open="isFigmaModalOpen">
                    <UButton
                      type="button"
                      color="primary"
                      size="sm"
                      variant="outline"
                      @click="resetInputForm('figma'); isFigmaModalOpen = true"
                    >
                      <UIcon name="i-simple-icons-figma" />
                      Add Figma
                    </UButton>

                    <template #content="{ close }">
                      <div class="p-6">
                        <h3 class="text-lg font-semibold mb-4">
                          Add Input - Figma
                        </h3>

                        <UForm
                          :state="inputFormState"
                          :schema="inputSchema"
                          class="space-y-4"
                          @submit="(event) => saveInput(event, close)"
                        >
                          <UFormField label="Name" name="name" required>
                            <UInput
                              v-model="inputFormState.name"
                              placeholder="e.g., Design Team Figma"
                              class="w-full"
                            />
                          </UFormField>

                          <UFormField
                            label="Email Address"
                            name="emailAddress"
                            help="Unique email address for this Figma input"
                          >
                            <div class="flex gap-2">
                              <UInput
                                :model-value="computedEmailAddress"
                                type="email"
                                placeholder="Email address"
                                readonly
                                class="flex-1"
                              />
                              <UButton
                                type="button"
                                color="neutral"
                                variant="outline"
                                icon="i-lucide-refresh-cw"
                                @click="resetInputForm('figma')"
                              />
                            </div>
                          </UFormField>

                          <UFormField
                            label="Figma API Token"
                            name="apiToken"
                            help="Personal access token from Figma settings"
                            required
                          >
                            <UInput
                              v-model="inputFormState.apiToken"
                              type="password"
                              placeholder="figd_..."
                              class="w-full"
                            />
                            <template #hint>
                              <a
                                href="https://www.figma.com/developers/api#access-tokens"
                                target="_blank"
                                class="text-primary hover:underline"
                              >
                                Get your token from Figma
                              </a>
                            </template>
                          </UFormField>

                          <UAlert
                            v-if="computedEmailAddress"
                            color="info"
                            variant="soft"
                            icon="i-lucide-info"
                            :description="`Use this email address in your Figma webhook settings: ${computedEmailAddress}`"
                          />

                          <div class="flex justify-end gap-2 mt-6">
                            <UButton
                              type="button"
                              color="neutral"
                              variant="ghost"
                              @click="close"
                            >
                              Cancel
                            </UButton>
                            <UButton
                              type="submit"
                              color="primary"
                            >
                              Add Input
                            </UButton>
                          </div>
                        </UForm>
                      </div>
                    </template>
                  </UModal>

                  <!-- Add Notion Input Modal -->
                  <UModal v-model:open="isNotionInputModalOpen">
                    <UButton
                      type="button"
                      color="primary"
                      size="sm"
                      variant="outline"
                      @click="resetInputForm('notion'); isNotionInputModalOpen = true"
                    >
                      <UIcon name="i-simple-icons-notion" />
                      Add Notion
                    </UButton>

                    <template #content="{ close }">
                      <div class="p-6">
                        <h3 class="text-lg font-semibold mb-4">
                          Add Input - Notion
                        </h3>

                        <UForm
                          :state="inputFormState"
                          :schema="inputSchema"
                          class="space-y-4"
                          @submit="(event) => saveInput(event, close)"
                        >
                          <UFormField label="Name" name="name" required>
                            <UInput
                              v-model="inputFormState.name"
                              placeholder="e.g., Product Docs Notion"
                              class="w-full"
                            />
                          </UFormField>

                          <UFormField
                            label="Notion Integration Token"
                            name="notionToken"
                            help="Internal integration token from your Notion workspace"
                            required
                          >
                            <UInput
                              v-model="inputFormState.notionToken"
                              type="password"
                              placeholder="secret_..."
                              class="w-full"
                            />
                            <template #hint>
                              <a
                                href="https://www.notion.so/my-integrations"
                                target="_blank"
                                class="text-primary hover:underline"
                              >
                                Create a Notion integration
                              </a>
                            </template>
                          </UFormField>

                          <UFormField
                            label="Trigger Keyword"
                            name="triggerKeyword"
                            help="The keyword that triggers task creation when mentioned in comments"
                          >
                            <UInput
                              v-model="inputFormState.triggerKeyword"
                              placeholder="discubot"
                              class="w-full"
                            />
                            <template #hint>
                              <span class="text-muted-foreground text-xs">
                                Examples: discubot, task, todo
                              </span>
                            </template>
                          </UFormField>

                          <UFormField
                            label="Webhook URL"
                            help="Configure this URL in your Notion integration settings"
                          >
                            <div class="flex gap-2">
                              <UInput
                                :model-value="notionWebhookUrl"
                                readonly
                                class="flex-1 font-mono text-sm"
                              />
                              <UTooltip text="Copy webhook URL">
                                <UButton
                                  type="button"
                                  color="neutral"
                                  variant="outline"
                                  icon="i-lucide-copy"
                                  @click="copyNotionWebhookUrl"
                                />
                              </UTooltip>
                            </div>
                          </UFormField>

                          <!-- Test Connection Button -->
                          <div class="flex items-center gap-3">
                            <UButton
                              type="button"
                              color="neutral"
                              variant="outline"
                              size="sm"
                              :loading="testingNotionConnection"
                              @click="testNotionConnection"
                            >
                              <UIcon name="i-lucide-plug" class="mr-1" />
                              Test Connection
                            </UButton>
                            <span v-if="notionConnectionStatus === 'success'" class="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                              <UIcon name="i-lucide-check-circle" class="w-4 h-4" />
                              Connected
                            </span>
                            <span v-else-if="notionConnectionStatus === 'error'" class="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <UIcon name="i-lucide-x-circle" class="w-4 h-4" />
                              {{ notionConnectionError }}
                            </span>
                          </div>

                          <UAlert
                            color="info"
                            variant="soft"
                            icon="i-lucide-book-open"
                            title="Setup Guide"
                          >
                            <template #description>
                              <ol class="list-decimal list-inside text-sm space-y-1 mt-1">
                                <li>Create a Notion internal integration</li>
                                <li>Enable "Read comments" and "Insert comments" capabilities</li>
                                <li>Subscribe to "comment.created" webhook events</li>
                                <li>Connect the integration to your target pages/databases</li>
                              </ol>
                              <a
                                href="/docs/guides/notion-input-setup-guide"
                                target="_blank"
                                class="text-primary hover:underline text-sm mt-2 inline-block"
                              >
                                View full setup guide
                              </a>
                            </template>
                          </UAlert>

                          <div class="flex justify-end gap-2 mt-6">
                            <UButton
                              type="button"
                              color="neutral"
                              variant="ghost"
                              @click="close"
                            >
                              Cancel
                            </UButton>
                            <UButton
                              type="submit"
                              color="primary"
                            >
                              Add Input
                            </UButton>
                          </div>
                        </UForm>
                      </div>
                    </template>
                  </UModal>
                </div>
              </div>
            </template>

            <!-- Inputs List -->
            <div v-if="inputsList.length === 0" class="text-center py-8 text-muted">
              <UIcon name="i-lucide-inbox" class="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No inputs added yet</p>
              <p class="text-sm mt-1">Add Slack, Figma, or Notion sources to receive discussions</p>
            </div>

            <div v-else class="space-y-3">
              <UCard
                v-for="(input, index) in inputsList"
                :key="index"
                class="border border-gray-200 dark:border-gray-800"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UIcon
                      :name="input.sourceType === 'slack' ? 'i-simple-icons-slack' : input.sourceType === 'notion' ? 'i-simple-icons-notion' : 'i-simple-icons-figma'"
                      class="w-5 h-5"
                    />
                    <div>
                      <p class="font-medium">{{ input.name }}</p>
                      <p class="text-sm text-muted">
                        {{ input.sourceType }} · {{ input.active ? 'Active' : 'Inactive' }}
                      </p>
                      <p v-if="input.emailAddress" class="text-xs text-muted-foreground font-mono mt-1">
                        {{ input.emailAddress }}
                      </p>
                      <p v-if="input.sourceType === 'notion' && input.sourceMetadata?.triggerKeyword" class="text-xs text-muted-foreground mt-1">
                        Trigger: <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">{{ input.sourceMetadata.triggerKeyword }}</code>
                      </p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <UTooltip text="Manage user mappings">
                      <UButton
                        type="button"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        icon="i-lucide-users"
                        @click="openUserMappingDrawer(index)"
                      />
                    </UTooltip>
                    <UButton
                      type="button"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      icon="i-lucide-pencil"
                      @click="openEditInput(index)"
                    />
                    <UButton
                      type="button"
                      color="error"
                      variant="ghost"
                      size="sm"
                      icon="i-lucide-trash"
                      @click="deleteInput(index)"
                    />
                  </div>
                </div>
              </UCard>
            </div>

            <!-- Edit Input Modal -->
            <UModal v-model:open="isEditInputModalOpen">
              <template #content="{ close }">
                <div class="p-6">
                  <h3 class="text-lg font-semibold mb-4">
                    Edit Input
                  </h3>

                  <div v-if="editingInput" class="space-y-4">
                    <UFormField label="Name" required>
                      <UInput
                        v-model="editingInput.name"
                        placeholder="Input name"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      v-if="editingInput.sourceType === 'figma'"
                      label="Email Address"
                    >
                      <UInput
                        v-model="editingInput.emailAddress"
                        type="email"
                        readonly
                        class="w-full font-mono text-sm"
                      />
                    </UFormField>

                    <UFormField
                      v-if="editingInput.sourceType === 'figma'"
                      label="Figma API Token"
                      help="Personal access token from Figma settings"
                      required
                    >
                      <UInput
                        v-model="editingInput.apiToken"
                        type="password"
                        placeholder="figd_..."
                        class="w-full"
                      />
                    </UFormField>

                    <!-- Notion-specific fields -->
                    <UFormField
                      v-if="editingInput.sourceType === 'notion'"
                      label="Notion Integration Token"
                      help="Internal integration token from Notion settings"
                      required
                    >
                      <UInput
                        v-model="editingInput.sourceMetadata.notionToken"
                        type="password"
                        placeholder="secret_..."
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      v-if="editingInput.sourceType === 'notion'"
                      label="Trigger Keyword"
                      help="Keyword that triggers task creation (e.g., discubot)"
                    >
                      <UInput
                        v-model="editingInput.sourceMetadata.triggerKeyword"
                        placeholder="discubot"
                        class="w-full"
                      />
                    </UFormField>

                    <div class="flex justify-end gap-2 mt-6">
                      <UButton
                        type="button"
                        color="neutral"
                        variant="ghost"
                        @click="close(); editingInput = null; editingInputIndex = null"
                      >
                        Cancel
                      </UButton>
                      <UButton
                        type="button"
                        color="primary"
                        @click="saveEditInput"
                      >
                        Save Changes
                      </UButton>
                    </div>
                  </div>
                </div>
              </template>
            </UModal>
          </UCard>

          <!-- Navigation -->
          <div class="flex justify-between">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              leading-icon="i-lucide-arrow-left"
              @click="prevStep"
            >
              Back
            </UButton>
            <UButton
              type="button"
              trailing-icon="i-lucide-arrow-right"
              @click="nextStep"
            >
              Next: Add Outputs
            </UButton>
          </div>
        </div>

        <!-- Step 3: Outputs -->
        <div v-else-if="item.value === 2" class="space-y-6">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Output Destinations</h3>
                <!-- Add Notion Modal -->
                <UModal>
                  <UButton
                    type="button"
                    color="primary"
                    size="sm"
                    @click="resetOutputForm('notion')"
                  >
                    <UIcon name="i-simple-icons-notion" />
                    Add Notion
                  </UButton>

                  <template #content="{ close }">
                    <div class="p-6 max-h-[80vh] overflow-y-auto">
                      <h3 class="text-lg font-semibold mb-4">
                        Add Output - Notion
                      </h3>

                      <UForm
                        :state="outputFormState"
                        :schema="outputSchema"
                        class="space-y-4"
                        @submit="(event) => saveOutput(event, close)"
                      >
                        <UFormField label="Name" name="name" required>
                          <UInput
                            v-model="outputFormState.name"
                            placeholder="e.g., Design Tasks DB"
                            class="w-full"
                          />
                        </UFormField>

                        <UFormField
                          label="Domain Filter"
                          name="domainFilter"
                          help="Select which domains should route to this output"
                        >
                          <USelectMenu
                            v-model="outputFormState.domainFilter"
                            :items="flowState.availableDomains || []"
                            multiple
                            placeholder="All domains (no filter)"
                            class="w-full"
                          />
                        </UFormField>

                        <UFormField name="isDefault">
                          <UCheckbox
                            v-model="outputFormState.isDefault"
                            label="Set as default output"
                            help="Default output receives tasks with no matched domain"
                          />
                        </UFormField>

                        <USeparator />

                        <!-- Notion Configuration -->
                        <UFormField label="Notion Token" name="notionToken" required>
                          <UInput
                            v-model="outputFormState.notionToken"
                            type="password"
                            placeholder="secret_..."
                            class="w-full"
                          />
                        </UFormField>

                        <UFormField label="Database ID" name="databaseId" required>
                          <UInput
                            v-model="outputFormState.databaseId"
                            placeholder="abc123def456..."
                            class="w-full"
                          />
                        </UFormField>

                        <div>
                          <UButton
                            type="button"
                            color="primary"
                            variant="outline"
                            size="sm"
                            :loading="fetchingSchema"
                            @click="fetchAndMapNotionSchema"
                          >
                            Fetch Schema & Auto-Map Fields
                          </UButton>
                        </div>

                        <!-- Debug -->
                        <div v-if="notionSchema" class="text-xs text-green-500 p-2 bg-gray-900 rounded">
                          Schema loaded with {{ Object.keys(notionSchema.properties || {}).length }} properties
                        </div>

                        <!-- Field Mapping (if schema fetched) -->
                        <div v-if="notionSchema && notionSchema.properties" class="space-y-4">
                          <h4 class="font-medium">Field Mapping</h4>
                          <UAlert
                            color="info"
                            variant="soft"
                            icon="i-lucide-info"
                            description="Fields have been auto-mapped based on Notion property names"
                          />

                          <!-- Priority Field -->
                          <UFormField label="Priority Field" name="priorityField" hint="Auto-mapped from your Notion database">
                            <USelectMenu
                              v-model="outputFormState.fieldMapping.priority.notionProperty"
                              :items="Object.keys(notionSchema.properties || {})"
                              placeholder="Select Notion property for priority..."
                              class=w-full
                            />
                          </UFormField>

                          <!-- Type Field -->
                          <UFormField label="Type Field" name="typeField" hint="Auto-mapped from your Notion database">
                            <USelectMenu
                              v-model="outputFormState.fieldMapping.type.notionProperty"
                              :items="Object.keys(notionSchema.properties || {})"
                              placeholder="Select Notion property for type..."
                              class="w-full"
                            />
                          </UFormField>

                          <!-- Assignee Field -->
                          <UFormField label="Assignee Field" name="assigneeField" hint="Auto-mapped from your Notion database">
                            <USelectMenu
                              v-model="outputFormState.fieldMapping.assignee.notionProperty"
                              :items="Object.keys(notionSchema.properties || {})"
                              placeholder="Select Notion property for assignee..."
                              class="w-full"
                            />
                          </UFormField>
                        </div>

                        <div class="flex justify-end gap-2 mt-6">
                          <UButton
                            type="button"
                            color="neutral"
                            variant="ghost"
                            @click="close"
                          >
                            Cancel
                          </UButton>
                          <UButton
                            type="submit"
                            color="primary"
                          >
                            Add Output
                          </UButton>
                        </div>
                      </UForm>
                    </div>
                  </template>
                </UModal>
              </div>
            </template>

            <!-- Validation Warning -->
            <UAlert
              v-if="outputsList.length > 0 && !hasDefaultOutput"
              color="warning"
              variant="soft"
              icon="i-lucide-alert-triangle"
              title="Default output required"
              description="At least one output must be set as default to handle tasks without a matched domain"
              class="mb-4"
            />

            <!-- Outputs List -->
            <div v-if="outputsList.length === 0" class="text-center py-8 text-muted">
              <UIcon name="i-lucide-send" class="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No outputs added yet</p>
              <p class="text-sm mt-1">Add Notion databases to create tasks</p>
            </div>

            <div v-else class="space-y-3">
              <UCard
                v-for="(output, index) in outputsList"
                :key="index"
                class="border border-gray-200 dark:border-gray-800"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3 flex-1">
                    <UIcon
                      name="i-simple-icons-notion"
                      class="w-5 h-5"
                    />
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <p class="font-medium">{{ output.name }}</p>
                        <UBadge
                          v-if="output.isDefault"
                          color="primary"
                          variant="soft"
                          size="sm"
                        >
                          Default
                        </UBadge>
                      </div>
                      <p class="text-sm text-muted">
                        {{ output.outputType }}
                        <span v-if="output.domainFilter && output.domainFilter.length > 0">
                          · Domains: {{ output.domainFilter.join(', ') }}
                        </span>
                        <span v-else>
                          · All domains
                        </span>
                      </p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <UButton
                      type="button"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      icon="i-lucide-pencil"
                      @click="openEditOutput(index)"
                    />
                    <UButton
                      type="button"
                      color="error"
                      variant="ghost"
                      size="sm"
                      icon="i-lucide-trash"
                      @click="deleteOutput(index)"
                    />
                  </div>
                </div>
              </UCard>
            </div>

            <!-- Edit Output Modal -->
            <UModal v-model:open="isEditOutputModalOpen">
              <template #content="{ close }">
                <div class="p-6 max-h-[80vh] overflow-y-auto">
                  <h3 class="text-lg font-semibold mb-4">
                    Edit Output
                  </h3>

                  <div v-if="editingOutput" class="space-y-4">
                    <UFormField label="Name" required>
                      <UInput
                        v-model="editingOutput.name"
                        placeholder="Output name"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      label="Domain Filter"
                      help="Select which domains should route to this output"
                    >
                      <USelectMenu
                        v-model="editingOutput.domainFilter"
                        :items="flowState.availableDomains || []"
                        multiple
                        placeholder="All domains (no filter)"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField>
                      <UCheckbox
                        v-model="editingOutput.isDefault"
                        label="Set as default output"
                        help="Default output receives tasks with no matched domain"
                      />
                    </UFormField>

                    <template v-if="editingOutput.outputType === 'notion'">
                      <USeparator />

                      <UFormField label="Notion Token">
                        <UInput
                          v-model="(editingOutput.outputConfig as NotionOutputConfig).notionToken"
                          type="password"
                          placeholder="secret_..."
                          class="w-full"
                        />
                      </UFormField>

                      <UFormField label="Database ID">
                        <UInput
                          v-model="(editingOutput.outputConfig as NotionOutputConfig).databaseId"
                          placeholder="abc123def456..."
                          class="w-full"
                        />
                      </UFormField>

                      <!-- Fetch Schema Button -->
                      <UButton
                        type="button"
                        color="neutral"
                        variant="outline"
                        :loading="fetchingSchema"
                        @click="fetchSchemaForEdit"
                      >
                        <UIcon name="i-lucide-refresh-cw" class="mr-2" />
                        Load Schema for Field Mapping
                      </UButton>

                      <!-- Field Mapping (shown when schema is loaded) -->
                      <div v-if="notionSchema && notionSchema.properties" class="space-y-4">
                        <USeparator />
                        <p class="text-sm font-medium">Field Mapping</p>
                        <p class="text-xs text-muted">Map AI-extracted fields to your Notion database properties</p>

                        <!-- Priority Field -->
                        <UFormField label="Priority Field" hint="Where to store task priority">
                          <USelectMenu
                            v-model="(editingOutput.outputConfig as NotionOutputConfig).fieldMapping.priority.notionProperty"
                            :items="Object.keys(notionSchema.properties || {})"
                            placeholder="Select Notion property..."
                            class="w-full"
                          />
                        </UFormField>

                        <!-- Type Field -->
                        <UFormField label="Type Field" hint="Where to store task type">
                          <USelectMenu
                            v-model="(editingOutput.outputConfig as NotionOutputConfig).fieldMapping.type.notionProperty"
                            :items="Object.keys(notionSchema.properties || {})"
                            placeholder="Select Notion property..."
                            class="w-full"
                          />
                        </UFormField>

                        <!-- Assignee Field -->
                        <UFormField label="Assignee Field" hint="Where to store assignee">
                          <USelectMenu
                            v-model="(editingOutput.outputConfig as NotionOutputConfig).fieldMapping.assignee.notionProperty"
                            :items="Object.keys(notionSchema.properties || {})"
                            placeholder="Select Notion property..."
                            class="w-full"
                          />
                        </UFormField>
                      </div>
                    </template>

                    <div class="flex justify-end gap-2 mt-6">
                      <UButton
                        type="button"
                        color="neutral"
                        variant="ghost"
                        @click="close(); editingOutput = null; editingOutputIndex = null"
                      >
                        Cancel
                      </UButton>
                      <UButton
                        type="button"
                        color="primary"
                        @click="saveEditOutput"
                      >
                        Save Changes
                      </UButton>
                    </div>
                  </div>
                </div>
              </template>
            </UModal>
          </UCard>

          <!-- Navigation -->
          <div class="flex justify-between">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              leading-icon="i-lucide-arrow-left"
              @click="prevStep"
            >
              Back
            </UButton>
            <UButton
              type="button"
              color="primary"
              :loading="loading"
              :disabled="!hasDefaultOutput || outputsList.length === 0"
              @click="saveFlow"
            >
              Save Flow
            </UButton>
          </div>
        </div>
      </template>
    </UStepper>

    <!-- User Mapping Drawer -->
    <DiscubotUsermappingsUserMappingDrawer
      v-if="userMappingContext"
      v-model:open="isUserMappingDrawerOpen"
      :source-type="userMappingContext.sourceType"
      :source-workspace-id="userMappingContext.sourceWorkspaceId"
      :api-token="userMappingContext.apiToken"
      :notion-token="userMappingContext.notionToken"
      :team-id="teamId"
      :input-name="userMappingContext.inputName"
      @saved="handleUserMappingSaved"
    />
  </div>
</template>

<style scoped>
.flow-builder {
  max-width: 1024px;
  margin: 0 auto;
}
</style>
