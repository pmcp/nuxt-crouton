<script setup lang="ts">
const {
  messages,
  input,
  isLoading,
  isAIAvailable,
  error,
  sendMessage,
  clearChat,
  updateInput,
  aiSuggestedPackages,
  aiProjectName,
  aiBaseLayerName,
  aiCreatedCollectionIds,
  removeAISuggestedPackage
} = useSchemaAI()

const { schemaDesigner: designer, addPackage, removePackage, packages } = useProjectComposer()

const isCollapsed = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

// Track which packages have been accepted (added to project)
const acceptedPackageIds = computed(() => {
  return new Set(packages.value.map((p: { packageId: string }) => p.packageId))
})

// Track loading state per package
const loadingPackageIds = ref<Set<string>>(new Set())

// Auto-scroll to bottom when new messages arrive
watch(messages, async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}, { deep: true })

function handleSubmit(e?: Event) {
  e?.preventDefault()
  if (input.value.trim() && !isLoading.value) {
    sendMessage()
  }
}

function handleSuggestionSelect(prompt: string) {
  updateInput(prompt)
  nextTick(() => sendMessage())
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

async function handleAcceptPackage(packageId: string) {
  loadingPackageIds.value.add(packageId)
  try {
    await addPackage(packageId)
  } finally {
    loadingPackageIds.value.delete(packageId)
  }
}

function handleRejectPackage(packageId: string) {
  // If already accepted, remove from project
  if (acceptedPackageIds.value.has(packageId)) {
    removePackage(packageId)
  }
  // Remove from AI suggestions list
  removeAISuggestedPackage(packageId)
}

function handleCollectionClick(collectionId: string) {
  designer.setActiveCollection(collectionId)
}

// Check if a collection is new (recently created by AI)
function isCollectionNew(collectionId: string): boolean {
  return aiCreatedCollectionIds.value.has(collectionId)
}

// Computed for whether to show AI suggestions panel
const hasAISuggestions = computed(() => {
  return aiSuggestedPackages.value.length > 0 ||
    designer.collections.value.some((c: { id: string }) => isCollectionNew(c.id))
})
</script>

<template>
  <div
    class="flex flex-col h-full border-r border-[var(--ui-border)] bg-[var(--ui-bg)] transition-all duration-300"
    :class="isCollapsed ? 'w-12' : 'w-96'"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-3 border-b border-[var(--ui-border)]">
      <div v-if="!isCollapsed" class="flex items-center gap-2">
        <UIcon name="i-lucide-sparkles" class="text-[var(--ui-primary)]" />
        <span class="font-semibold text-sm">AI Assistant</span>
        <UBadge v-if="!isAIAvailable" color="warning" variant="subtle" size="xs">
          Not Available
        </UBadge>
      </div>

      <div class="flex items-center gap-1">
        <UButton
          v-if="!isCollapsed && messages.length > 0"
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-trash-2"
          title="Clear chat"
          @click="clearChat"
        />
        <UButton
          variant="ghost"
          color="neutral"
          size="xs"
          :icon="isCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
          :title="isCollapsed ? 'Expand' : 'Collapse'"
          @click="isCollapsed = !isCollapsed"
        />
      </div>
    </div>

    <!-- Content (hidden when collapsed) -->
    <template v-if="!isCollapsed">
      <!-- Not Available Message -->
      <div v-if="!isAIAvailable" class="flex-1 flex items-center justify-center p-4">
        <div class="text-center space-y-2">
          <UIcon name="i-lucide-bot-off" class="text-4xl text-[var(--ui-text-muted)]" />
          <p class="text-sm text-[var(--ui-text-muted)]">
            AI features require the<br />
            <code class="text-xs bg-[var(--ui-bg-elevated)] px-1 rounded">@friendlyinternet/nuxt-crouton-ai</code><br />
            package to be installed.
          </p>
        </div>
      </div>

      <!-- Chat Content -->
      <template v-else>
        <!-- AI Suggestions Panel (shows when AI has suggested packages/collections) -->
        <div
          v-if="hasAISuggestions"
          class="p-3 border-b border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]/50 space-y-3 max-h-64 overflow-y-auto"
        >
          <!-- AI Project Suggestion -->
          <div v-if="aiProjectName || aiBaseLayerName" class="text-xs space-y-1">
            <p v-if="aiProjectName" class="flex items-center gap-2">
              <UIcon name="i-lucide-folder" class="text-[var(--ui-text-muted)]" />
              <span class="text-[var(--ui-text-muted)]">Project:</span>
              <span class="font-medium">{{ aiProjectName }}</span>
            </p>
            <p v-if="aiBaseLayerName" class="flex items-center gap-2">
              <UIcon name="i-lucide-layers" class="text-[var(--ui-text-muted)]" />
              <span class="text-[var(--ui-text-muted)]">Layer:</span>
              <span class="font-medium font-mono">{{ aiBaseLayerName }}</span>
            </p>
          </div>

          <!-- Package Suggestions -->
          <div v-if="aiSuggestedPackages.length > 0" class="space-y-2">
            <h4 class="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide flex items-center gap-2">
              <UIcon name="i-lucide-package" />
              Suggested Packages
            </h4>
            <CroutonSchemaDesignerAIPackageSuggestion
              v-for="pkg in aiSuggestedPackages"
              :key="pkg.packageId"
              :suggestion="pkg"
              :accepted="acceptedPackageIds.has(pkg.packageId)"
              :loading="loadingPackageIds.has(pkg.packageId)"
              @accept="handleAcceptPackage"
              @reject="handleRejectPackage"
            />
          </div>

          <!-- Collection Previews (for AI-created collections) -->
          <div
            v-if="designer.collections.value.length > 0 && designer.collections.value.some((c: { id: string }) => isCollectionNew(c.id))"
            class="space-y-2"
          >
            <h4 class="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide flex items-center gap-2">
              <UIcon name="i-lucide-database" />
              Created Collections
            </h4>
            <CroutonSchemaDesignerAICollectionPreview
              v-for="collection in designer.collections.value.filter((c: { id: string }) => isCollectionNew(c.id))"
              :key="collection.id"
              :collection="collection"
              :is-new="true"
              @click="handleCollectionClick"
            />
          </div>
        </div>

        <!-- Messages Area -->
        <div
          ref="chatContainer"
          class="flex-1 overflow-y-auto p-4 space-y-4"
        >
          <!-- Empty State with Suggestions -->
          <CroutonSchemaDesignerAIPromptSuggestions
            v-if="messages.length === 0"
            @select="handleSuggestionSelect"
          />

          <!-- Messages -->
          <template v-else>
            <div
              v-for="message in messages"
              :key="message.id"
              class="flex gap-3"
              :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <!-- Avatar -->
              <div
                v-if="message.role === 'assistant'"
                class="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--ui-primary)]/10 flex items-center justify-center"
              >
                <UIcon name="i-lucide-bot" class="text-[var(--ui-primary)]" />
              </div>

              <!-- Message Content -->
              <div
                class="max-w-[85%] rounded-lg px-3 py-2 text-sm"
                :class="message.role === 'user'
                  ? 'bg-[var(--ui-primary)] text-white'
                  : 'bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]'"
              >
                <div class="whitespace-pre-wrap break-words" v-html="formatMessage(message.content)" />
              </div>

              <!-- User Avatar -->
              <div
                v-if="message.role === 'user'"
                class="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] flex items-center justify-center"
              >
                <UIcon name="i-lucide-user" class="text-[var(--ui-text-muted)]" />
              </div>
            </div>

            <!-- Loading Indicator -->
            <div v-if="isLoading" class="flex gap-3 justify-start">
              <div class="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--ui-primary)]/10 flex items-center justify-center">
                <UIcon name="i-lucide-bot" class="text-[var(--ui-primary)] animate-pulse" />
              </div>
              <div class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-lg px-3 py-2">
                <div class="flex gap-1">
                  <span class="w-2 h-2 bg-[var(--ui-text-muted)] rounded-full animate-bounce" style="animation-delay: 0ms" />
                  <span class="w-2 h-2 bg-[var(--ui-text-muted)] rounded-full animate-bounce" style="animation-delay: 150ms" />
                  <span class="w-2 h-2 bg-[var(--ui-text-muted)] rounded-full animate-bounce" style="animation-delay: 300ms" />
                </div>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="flex gap-3 justify-start">
              <div class="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <UIcon name="i-lucide-alert-circle" class="text-red-500" />
              </div>
              <div class="max-w-[85%] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-700 dark:text-red-300">
                <p class="font-medium">Error</p>
                <p class="text-xs mt-1">{{ error.message }}</p>
              </div>
            </div>
          </template>
        </div>

        <!-- Input Area -->
        <div class="p-3 border-t border-[var(--ui-border)]">
          <form @submit.prevent="handleSubmit" class="flex gap-2">
            <UTextarea
              :model-value="input"
              placeholder="Describe your collection..."
              :rows="1"
              autoresize
              :maxrows="4"
              class="flex-1"
              :disabled="isLoading"
              @update:model-value="updateInput"
              @keydown="handleKeydown"
            />
            <UButton
              type="submit"
              icon="i-lucide-send"
              :loading="isLoading"
              :disabled="!input.trim() || isLoading"
            />
          </form>
          <p class="text-xs text-[var(--ui-text-muted)] mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </template>
    </template>

    <!-- Collapsed indicator -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="relative">
        <UIcon
          name="i-lucide-sparkles"
          class="text-[var(--ui-primary)] rotate-90"
          :class="{ 'animate-pulse': isLoading }"
        />
        <!-- Suggestion indicator when collapsed -->
        <div
          v-if="aiSuggestedPackages.length > 0"
          class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--ui-primary)] animate-pulse"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Helper to format AI messages (highlight JSON blocks)
function formatMessage(content: string): string {
  // Escape HTML first
  let escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Highlight JSON code blocks
  escaped = escaped.replace(
    /```(?:json)?\s*([\s\S]*?)```/g,
    '<pre class="bg-[var(--ui-bg)] p-2 rounded mt-2 mb-2 overflow-x-auto text-xs"><code>$1</code></pre>'
  )

  // Highlight inline code
  escaped = escaped.replace(
    /`([^`]+)`/g,
    '<code class="bg-[var(--ui-bg)] px-1 rounded text-xs">$1</code>'
  )

  return escaped
}
</script>
