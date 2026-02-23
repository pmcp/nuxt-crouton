<script setup lang="ts">
import type { Block, Template, Visibility } from '../../../../types/blocks'
import { blocks as allBlocks } from '../../../../data/blocks'

definePageMeta({
  middleware: ['auth'],
  layout: 'admin'
})

const route = useRoute()
const { teamSlug } = useTeamContext()
const projectId = computed(() => route.params.id as string)
const teamId = computed(() => route.params.team as string)

// ── Yjs sync ────────────────────────────────────────────────────
const { ymap, data, connected, synced, users } = useAtelierSync(
  projectId.value,
  teamId.value
)

// ── Composition state (backed by Yjs) ───────────────────────────
const {
  composition,
  addBlock,
  removeBlock,
  moveBlock,
  reorderBlocks,
  selectTemplate,
  updateIdentity,
  reset,
  enabledPackages,
  blocksByVisibility
} = useAppComposition(ymap, data)

// ── UI state ────────────────────────────────────────────────────
const showTemplateSelector = ref(true)
const showBlockPalette = ref(false)
const showGeneratePanel = ref(false)
const selectedBlockId = ref<string | null>(null)
const showBlockDetail = ref(false)

// Hide template selector once blocks are added
watch(() => composition.value.selectedBlocks.length, (count) => {
  if (count > 0) showTemplateSelector.value = false
}, { immediate: true })

// ── Handlers ────────────────────────────────────────────────────
function handleTemplateSelect(template: Template) {
  selectTemplate(template.id)
  showTemplateSelector.value = false
}

function handleAddBlock(blockId: string) {
  addBlock(blockId)
}

function handleRemoveBlock(blockId: string) {
  removeBlock(blockId)
}

function handleMoveBlock(blockId: string, newVisibility: Visibility, newOrder: number) {
  moveBlock(blockId, newVisibility, newOrder)
}

function handleReorder(visibility: Visibility, blockIds: string[]) {
  reorderBlocks(visibility, blockIds)
}

function handleSelectBlock(blockId: string) {
  selectedBlockId.value = blockId
  showBlockDetail.value = true
}

const selectedBlock = computed<Block | null>(() =>
  selectedBlockId.value ? allBlocks.find(b => b.id === selectedBlockId.value) ?? null : null
)

const selectedBlockIds = computed(() =>
  composition.value.selectedBlocks.map(sb => sb.blockId)
)
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Template selector (full page when no blocks) -->
    <AtelierTemplateSelector
      v-if="showTemplateSelector"
      @select="handleTemplateSelect"
    />

    <!-- Builder view -->
    <template v-else>
      <!-- Top bar -->
      <div class="flex items-center gap-3 px-4 py-2 border-b border-default shrink-0">
        <NuxtLink
          :to="`/admin/${teamSlug}/atelier`"
          class="text-muted hover:text-default transition-colors"
        >
          <UIcon name="i-lucide-arrow-left" class="w-5 h-5" />
        </NuxtLink>

        <div class="flex-1 min-w-0">
          <span class="font-medium text-sm truncate">
            {{ composition.identity.name || 'Untitled' }}
          </span>
        </div>

        <!-- Connection status -->
        <div
          class="w-2 h-2 rounded-full shrink-0"
          :class="connected ? (synced ? 'bg-success' : 'bg-warning animate-pulse') : 'bg-error'"
          :title="connected ? (synced ? 'Connected' : 'Syncing...') : 'Disconnected'"
        />

        <AtelierPresenceIndicator :users="users" />

        <UButton
          icon="i-lucide-rocket"
          label="Generate"
          color="primary"
          size="sm"
          class="hidden md:flex"
          @click="showGeneratePanel = true"
        />
      </div>

      <!-- Main layout -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Desktop: Left sidebar (Block Palette) -->
        <div class="hidden md:flex w-72 shrink-0 border-r border-default overflow-y-auto">
          <AtelierBlockPalette
            :selected-block-ids="selectedBlockIds"
            @add="handleAddBlock"
            @close="showBlockPalette = false"
          />
        </div>

        <!-- Center: Canvas + Identity -->
        <div class="flex-1 flex flex-col overflow-hidden min-w-0">
          <!-- Identity form -->
          <div class="px-4 pt-4 shrink-0">
            <AtelierIdentityForm
              :identity="composition.identity"
              @update="updateIdentity"
            />
          </div>

          <!-- Block canvas -->
          <div class="flex-1 overflow-auto p-4">
            <AtelierBlockCanvas
              :blocks-by-visibility="blocksByVisibility"
              @select="handleSelectBlock"
              @remove="handleRemoveBlock"
              @move="handleMoveBlock"
              @reorder="handleReorder"
            />
          </div>

          <!-- Mobile bottom bar -->
          <div class="md:hidden flex items-center gap-2 px-4 py-3 border-t border-default shrink-0">
            <AtelierPresenceIndicator :users="users" />
            <div class="flex-1" />
            <UButton
              icon="i-lucide-rocket"
              label="Generate"
              color="primary"
              size="sm"
              @click="showGeneratePanel = true"
            />
          </div>
        </div>

        <!-- Desktop: Right sidebar (Package List) -->
        <div class="hidden md:block w-56 shrink-0 border-l border-default p-3 overflow-y-auto">
          <AtelierPackageList
            :enabled-packages="enabledPackages"
            :selected-block-ids="selectedBlockIds"
          />
        </div>
      </div>

      <!-- Mobile FAB -->
      <AtelierFab @click="showBlockPalette = true" />

      <!-- Mobile: Block palette bottom sheet -->
      <USlideover v-model="showBlockPalette" side="bottom" class="md:hidden">
        <template #content>
          <AtelierBlockPalette
            :selected-block-ids="selectedBlockIds"
            @add="handleAddBlock"
            @close="showBlockPalette = false"
          />
        </template>
      </USlideover>

      <!-- Block detail slideover -->
      <AtelierBlockDetail
        v-model="showBlockDetail"
        :block="selectedBlock"
      />

      <!-- Generate panel -->
      <AtelierGeneratePanel
        v-model="showGeneratePanel"
        :composition="composition"
      />
    </template>
  </div>
</template>
