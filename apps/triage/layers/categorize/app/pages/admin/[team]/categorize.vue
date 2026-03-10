<script setup lang="ts">
import { ref, computed, watch, nextTick, markRaw } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import type { Node, NodeDragEvent } from '@vue-flow/core'
import NotionCardNode from '../../../components/NotionCardNode.vue'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

definePageMeta({ layout: 'admin' })

const { teamId } = useTeamContext()
const toast = useToast()

// ─── Connected accounts ───
const { accounts, loading: accountsLoading } = useTriageConnectedAccounts(teamId)
const notionAccounts = computed(() =>
  accounts.value.filter(a => a.provider === 'notion' && a.status === 'connected'),
)

// ─── Setup state ───
const selectedAccountId = ref('')
const databaseId = ref('')
const databases = ref<{ id: string; title: string; icon?: string; url: string }[]>([])
const loadingDatabases = ref(false)
const categoryProperty = ref('')
const schema = ref<Record<string, { type: string; options?: { name: string }[] }>>({})

// ─── Manual token fallback ───
const showManualToken = ref(false)
const manualToken = ref('')

// ─── Data state ───
const pages = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const loaded = ref(false)

// ─── Card detail slideover ───
const selectedCard = ref<any>(null)
const showCardDetail = ref(false)

// ─── Group state ───
const groups = ref<{ id: string; name: string; color: string }[]>([])
const showGroupModal = ref(false)
const newGroupName = ref('')
let groupCounter = 0

const GROUP_COLORS = [
  '#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff',
  '#ccfbf1', '#fee2e2', '#f3e8ff', '#cffafe', '#fef9c3',
]

// ─── Node types ───
const nodeTypes = {
  notionCard: markRaw(NotionCardNode) as any,
}

// ─── VueFlow ───
const { onNodeDragStop, onNodeClick } = useVueFlow()
const nodes = ref<Node[]>([])

// ─── Auth params helper ───
const authParams = computed(() => {
  if (selectedAccountId.value) {
    return { accountId: selectedAccountId.value }
  }
  if (manualToken.value) {
    return { notionToken: manualToken.value }
  }
  return null
})

// ─── All database properties ───
const allProperties = computed(() => {
  return Object.entries(schema.value).map(([name, prop]) => ({
    label: `${name} (${prop.type})`,
    value: name,
    type: prop.type,
    disabled: !['select', 'status', 'multi_select'].includes(prop.type),
  }))
})

const writableProperties = computed(() => {
  return allProperties.value.filter(p => !p.disabled)
})

// ─── Create property ───
const newPropertyName = ref('')
const showCreateProperty = ref(false)
const creatingProperty = ref(false)

async function createNotionProperty() {
  if (!newPropertyName.value.trim() || !authParams.value) return
  creatingProperty.value = true

  try {
    await $fetch(`/api/teams/${teamId.value}/notion/database/${databaseId.value}/property`, {
      method: 'POST',
      body: {
        ...authParams.value,
        propertyName: newPropertyName.value.trim(),
      },
    })

    schema.value[newPropertyName.value.trim()] = { type: 'select', options: [] }
    categoryProperty.value = newPropertyName.value.trim()
    showCreateProperty.value = false
    newPropertyName.value = ''
    toast.add({ title: `Created "${categoryProperty.value}" column in Notion`, color: 'success' })
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to create property',
      description: error.data?.message || error.message,
      color: 'error',
    })
  }
  finally {
    creatingProperty.value = false
  }
}

// ─── Fetch databases when account selected ───
watch(selectedAccountId, async (accountId) => {
  if (!accountId) {
    databases.value = []
    return
  }

  loadingDatabases.value = true
  try {
    const res = await $fetch<any>(`/api/teams/${teamId.value}/notion/databases`, {
      query: { accountId },
    })
    databases.value = res.databases || []
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to load databases',
      description: error.data?.statusText || error.message,
      color: 'error',
    })
    databases.value = []
  }
  finally {
    loadingDatabases.value = false
  }
})

// Database select items
const databaseItems = computed(() =>
  databases.value.map(db => ({
    label: `${db.icon || ''} ${db.title}`.trim(),
    value: db.id,
  })),
)

// ─── Load pages from Notion ───
async function loadPages() {
  if (!databaseId.value || !authParams.value) {
    toast.add({ title: 'Select an account and database first', color: 'warning' })
    return
  }

  loading.value = true

  try {
    const [schemaRes, pagesRes] = await Promise.all([
      $fetch<any>(`/api/crouton-triage/teams/${teamId.value}/notion/schema/${databaseId.value}`, {
        query: authParams.value,
      }),
      $fetch<any>(`/api/teams/${teamId.value}/notion/database/${databaseId.value}/pages`, {
        query: authParams.value,
      }),
    ])

    schema.value = schemaRes.properties || {}
    pages.value = pagesRes.pages || []

    // Auto-select first writable property if available
    if (!categoryProperty.value && writableProperties.value.length > 0) {
      categoryProperty.value = writableProperties.value[0]!.value
    }

    // Build nodes — auto-group by existing values
    buildNodesWithAutoGroup()
    loaded.value = true

    toast.add({ title: `Loaded ${pages.value.length} cards`, color: 'success' })
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to load',
      description: error.data?.statusText || error.message,
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}

// ─── Build nodes with auto-grouping by existing property values ───
function buildNodesWithAutoGroup() {
  const CARD_W = 220
  const CARD_H = 100
  const GAP = 30
  const GROUP_W = 500
  const GROUP_H = 400
  const GROUP_GAP = 50

  // Reset
  groups.value = []
  groupCounter = 0

  // Collect existing category values if a property is selected
  const existingGroups = new Map<string, string[]>() // groupName → [pageId]
  const ungroupedPages: any[] = []

  if (categoryProperty.value) {
    for (const page of pages.value) {
      const val = page.properties[categoryProperty.value]
      if (val && typeof val === 'string') {
        if (!existingGroups.has(val)) existingGroups.set(val, [])
        existingGroups.get(val)!.push(page.id)
      }
      else {
        ungroupedPages.push(page)
      }
    }
  }
  else {
    ungroupedPages.push(...pages.value)
  }

  const allNodes: Node[] = []

  // Create group nodes + position cards inside
  let groupIndex = 0
  for (const [groupName, pageIds] of existingGroups) {
    const id = `group-${++groupCounter}`
    const color = GROUP_COLORS[groupIndex % GROUP_COLORS.length]!
    groups.value.push({ id, name: groupName, color })

    const groupX = groupIndex * (GROUP_W + GROUP_GAP)
    allNodes.push({
      id,
      type: 'group',
      position: { x: groupX, y: 0 },
      data: { label: groupName },
      style: {
        width: `${GROUP_W}px`,
        height: `${GROUP_H}px`,
        backgroundColor: color,
        borderRadius: '12px',
        border: '2px dashed #9ca3af',
        opacity: '0.6',
      },
    })

    // Place cards inside this group
    const cols = Math.max(1, Math.floor((GROUP_W - 40) / (CARD_W + 10)))
    for (let i = 0; i < pageIds.length; i++) {
      const page = pages.value.find(p => p.id === pageIds[i])
      if (!page) continue
      allNodes.push({
        id: page.id,
        type: 'notionCard',
        parentNode: id,
        position: {
          x: 15 + (i % cols) * (CARD_W + 10),
          y: 35 + Math.floor(i / cols) * (CARD_H + 10),
        },
        data: {
          title: page.title,
          properties: page.properties,
          url: page.url,
          grouped: true,
        },
      })
    }

    groupIndex++
  }

  // Place ungrouped cards in a grid below groups
  const ungroupedY = existingGroups.size > 0 ? GROUP_H + 80 : 50
  const cols = Math.max(1, Math.ceil(Math.sqrt(ungroupedPages.length)))

  for (let i = 0; i < ungroupedPages.length; i++) {
    const page = ungroupedPages[i]!
    allNodes.push({
      id: page.id,
      type: 'notionCard',
      position: {
        x: (i % cols) * (CARD_W + GAP) + 50,
        y: Math.floor(i / cols) * (CARD_H + GAP) + ungroupedY,
      },
      data: {
        title: page.title,
        properties: page.properties,
        url: page.url,
        grouped: false,
      },
    })
  }

  nodes.value = allNodes
}

// ─── Re-group when category property changes ───
watch(categoryProperty, () => {
  if (loaded.value && pages.value.length > 0) {
    buildNodesWithAutoGroup()
  }
})

// ─── Create a group ───
function createGroup() {
  if (!newGroupName.value.trim()) return

  const id = `group-${++groupCounter}`
  const color = GROUP_COLORS[groups.value.length % GROUP_COLORS.length]!

  groups.value.push({ id, name: newGroupName.value.trim(), color })

  const groupX = groups.value.length * 550 - 500
  nodes.value.push({
    id,
    type: 'group',
    position: { x: groupX, y: -350 },
    data: { label: newGroupName.value.trim() },
    style: {
      width: '500px',
      height: '400px',
      backgroundColor: color,
      borderRadius: '12px',
      border: '2px dashed #9ca3af',
      opacity: '0.6',
    },
  })

  newGroupName.value = ''
  showGroupModal.value = false
}

// ─── Remove a group ───
function removeGroup(groupId: string) {
  nodes.value = nodes.value
    .filter(n => n.id !== groupId)
    .map((n) => {
      if (n.parentNode === groupId) {
        const group = nodes.value.find(g => g.id === groupId)
        return {
          ...n,
          parentNode: undefined,
          extent: undefined,
          position: {
            x: n.position.x + (group?.position.x || 0),
            y: n.position.y + (group?.position.y || 0),
          },
          data: { ...n.data, grouped: false },
        }
      }
      return n
    })

  groups.value = groups.value.filter(g => g.id !== groupId)
}

// ─── Handle node click — show card detail ───
onNodeClick(({ node }) => {
  if (node.type !== 'notionCard') return
  selectedCard.value = node.data
  showCardDetail.value = true
})

// ─── Handle node drag stop — detect group overlap ───
onNodeDragStop((event: NodeDragEvent) => {
  const { node } = event
  if (node.type !== 'notionCard') return

  const currentNodes = nodes.value
  const groupNodes = currentNodes.filter(n => n.type === 'group')
  if (groupNodes.length === 0) return

  const cardW = 220
  const cardH = 80
  let cardCenterX = node.position.x + cardW / 2
  let cardCenterY = node.position.y + cardH / 2

  if (node.parentNode) {
    const parentGroup = groupNodes.find(g => g.id === node.parentNode)
    if (parentGroup) {
      cardCenterX += parentGroup.position.x
      cardCenterY += parentGroup.position.y
    }
  }

  let targetGroup: Node | null = null
  for (const group of groupNodes) {
    const styleObj = group.style as Record<string, string> | undefined
    const gw = parseInt(styleObj?.width || '500')
    const gh = parseInt(styleObj?.height || '400')

    if (
      cardCenterX >= group.position.x
      && cardCenterX <= group.position.x + gw
      && cardCenterY >= group.position.y
      && cardCenterY <= group.position.y + gh
    ) {
      targetGroup = group
      break
    }
  }

  nextTick(() => {
    nodes.value = nodes.value.map((n) => {
      if (n.id !== node.id) return n

      if (targetGroup && targetGroup.id !== node.parentNode) {
        const relX = cardCenterX - targetGroup.position.x - cardW / 2
        const relY = cardCenterY - targetGroup.position.y - cardH / 2
        return {
          ...n,
          parentNode: targetGroup.id,
          position: { x: Math.max(10, relX), y: Math.max(30, relY) },
          data: { ...n.data, grouped: true },
        }
      }
      else if (!targetGroup && node.parentNode) {
        return {
          ...n,
          parentNode: undefined,
          extent: undefined,
          position: { x: cardCenterX - cardW / 2, y: cardCenterY - cardH / 2 },
          data: { ...n.data, grouped: false },
        }
      }

      return n
    })
  })
})

// ─── Get category assignments ───
const assignments = computed(() => {
  return nodes.value
    .filter(n => n.type === 'notionCard' && n.parentNode)
    .map((n) => {
      const group = groups.value.find(g => g.id === n.parentNode)
      return {
        pageId: n.id,
        title: n.data.title,
        category: group?.name || '',
      }
    })
    .filter(a => a.category)
})

const uncategorizedCount = computed(() => {
  return nodes.value.filter(n => n.type === 'notionCard' && !n.parentNode).length
})

// ─── Save to Notion ───
async function saveToNotion() {
  if (!categoryProperty.value) {
    toast.add({ title: 'Select a category property first', color: 'warning' })
    return
  }

  if (assignments.value.length === 0) {
    toast.add({ title: 'No cards assigned to groups yet', color: 'warning' })
    return
  }

  if (!authParams.value) return

  saving.value = true

  try {
    const result = await $fetch<any>(`/api/teams/${teamId.value}/notion/database/${databaseId.value}/categorize`, {
      method: 'POST',
      body: {
        ...authParams.value,
        propertyName: categoryProperty.value,
        propertyType: schema.value[categoryProperty.value]?.type || 'select',
        assignments: assignments.value.map(a => ({
          pageId: a.pageId,
          category: a.category,
        })),
      },
    })

    if (result.failed > 0) {
      const failedResults = result.results?.filter((r: any) => !r.success) || []
      const firstError = failedResults[0]?.error || 'Unknown error'
      console.warn('[categorize] Failed updates:', failedResults)
      toast.add({
        title: `Updated ${result.succeeded}/${result.total} cards (${result.failed} failed)`,
        description: firstError,
        color: 'warning',
      })
    }
    else {
      toast.add({
        title: `Updated ${result.succeeded} cards in Notion`,
        color: 'success',
      })
    }
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to save',
      description: error.data?.statusText || error.message,
      color: 'error',
    })
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h1 class="text-xl font-semibold">
          Notion Categorizer
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">
          Pull cards from Notion, group them visually, push categories back
        </p>
      </div>

      <div v-if="loaded" class="flex items-center gap-3">
        <span class="text-sm text-gray-500">
          {{ assignments.length }} categorized / {{ uncategorizedCount }} remaining
        </span>
        <UButton
          icon="i-lucide-plus"
          size="sm"
          variant="soft"
          @click="showGroupModal = true"
        >
          Add Group
        </UButton>
        <UButton
          icon="i-lucide-cloud-upload"
          size="sm"
          :loading="saving"
          :disabled="assignments.length === 0 || !categoryProperty"
          @click="saveToNotion"
        >
          Save to Notion
        </UButton>
      </div>
    </div>

    <!-- Setup form (before loading) -->
    <div v-if="!loaded" class="flex-1 flex items-center justify-center">
      <div class="w-full max-w-lg space-y-4 px-6">
        <!-- Account picker -->
        <UFormField label="Notion Account">
          <USelect
            v-model="selectedAccountId"
            :items="notionAccounts.map(a => ({ label: a.label || a.providerAccountId || a.id, value: a.id }))"
            placeholder="Select a connected account..."
            :loading="accountsLoading"
            class="w-full"
          />
        </UFormField>

        <div v-if="!selectedAccountId" class="text-center">
          <UButton
            size="xs"
            variant="link"
            @click="showManualToken = !showManualToken"
          >
            {{ showManualToken ? 'Hide manual token' : 'Or paste a token manually' }}
          </UButton>
        </div>

        <!-- Manual token fallback -->
        <UFormField v-if="showManualToken && !selectedAccountId" label="Notion Integration Token">
          <UInput
            v-model="manualToken"
            type="password"
            placeholder="secret_..."
            class="w-full"
          />
        </UFormField>

        <!-- Database picker -->
        <template v-if="selectedAccountId">
          <UFormField label="Database">
            <USelect
              v-model="databaseId"
              :items="databaseItems"
              placeholder="Select a database..."
              :loading="loadingDatabases"
              class="w-full"
              value-key="value"
            />
          </UFormField>
        </template>

        <!-- Manual database ID for manual token -->
        <UFormField v-else-if="showManualToken && manualToken" label="Database ID">
          <UInput
            v-model="databaseId"
            placeholder="abc123def456..."
            class="w-full"
          />
        </UFormField>

        <UButton
          block
          :loading="loading"
          :disabled="!databaseId || !authParams"
          @click="loadPages"
        >
          Load Cards
        </UButton>
      </div>
    </div>

    <!-- Canvas -->
    <template v-else>
      <!-- Property selector + group chips -->
      <div class="flex items-center gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <UFormField label="Write to column" class="w-64">
          <USelect
            v-model="categoryProperty"
            :items="writableProperties"
            placeholder="Select column..."
            value-key="value"
          />
        </UFormField>
        <UButton
          icon="i-lucide-plus"
          size="xs"
          variant="soft"
          @click="showCreateProperty = true"
        >
          New column
        </UButton>

        <USeparator orientation="vertical" class="h-8" />

        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-gray-500 uppercase tracking-wide">Groups:</span>
          <div
            v-for="group in groups"
            :key="group.id"
            class="flex items-center gap-1 px-2 py-1 rounded-md text-sm"
            :style="{ backgroundColor: group.color }"
          >
            <span class="font-medium text-gray-700">{{ group.name }}</span>
            <UButton
              icon="i-lucide-x"
              size="xs"
              variant="ghost"
              color="neutral"
              @click="removeGroup(group.id)"
            />
          </div>
          <UButton
            v-if="groups.length === 0"
            size="xs"
            variant="link"
            @click="showGroupModal = true"
          >
            Create your first group
          </UButton>
        </div>
      </div>

      <!-- VueFlow canvas -->
      <div class="flex-1 min-h-0">
        <ClientOnly>
          <VueFlow
            v-model:nodes="nodes"
            :node-types="nodeTypes"
            :min-zoom="0.1"
            :max-zoom="3"
            :fit-view-on-init="true"
            :snap-to-grid="true"
            :snap-grid="[10, 10]"
            class="w-full h-full"
          >
            <!-- Group node template -->
            <template #node-group="{ data }">
              <div class="group-node-label">
                {{ data.label }}
              </div>
            </template>

            <Background :gap="20" pattern-color="#ddd" />
            <Controls position="bottom-left" />
          </VueFlow>
        </ClientOnly>
      </div>
    </template>

    <!-- Card detail slideover -->
    <USlideover v-model:open="showCardDetail">
      <template #content>
        <div v-if="selectedCard" class="p-6 space-y-4">
          <div class="flex items-start justify-between">
            <h2 class="text-lg font-semibold">
              {{ selectedCard.title }}
            </h2>
            <UButton
              icon="i-lucide-external-link"
              size="xs"
              variant="ghost"
              :to="selectedCard.url"
              target="_blank"
            />
          </div>

          <USeparator />

          <div class="space-y-3">
            <div
              v-for="(value, key) in selectedCard.properties"
              :key="key"
              class="flex flex-col gap-1"
            >
              <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">{{ key }}</span>
              <div>
                <template v-if="Array.isArray(value)">
                  <div class="flex flex-wrap gap-1">
                    <UBadge
                      v-for="(item, i) in value"
                      :key="i"
                      variant="subtle"
                      size="xs"
                    >
                      {{ item }}
                    </UBadge>
                  </div>
                </template>
                <template v-else-if="value === true || value === false">
                  <UBadge :color="value ? 'success' : 'neutral'" variant="subtle" size="xs">
                    {{ value ? 'Yes' : 'No' }}
                  </UBadge>
                </template>
                <template v-else-if="value != null && value !== ''">
                  <span class="text-sm">{{ value }}</span>
                </template>
                <template v-else>
                  <span class="text-sm text-gray-400 italic">Empty</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Create Notion property modal -->
    <UModal v-model:open="showCreateProperty">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">
            Create Notion Column
          </h3>
          <p class="text-sm text-gray-500 mb-4">
            Creates a new select property in your Notion database.
          </p>
          <UFormField label="Column name">
            <UInput
              v-model="newPropertyName"
              placeholder="e.g., Category"
              autofocus
              @keyup.enter="createNotionProperty"
            />
          </UFormField>
          <div v-if="allProperties.length > 0" class="mt-4">
            <p class="text-xs text-gray-400 mb-2">Existing columns:</p>
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="prop in allProperties"
                :key="prop.value"
                :color="prop.disabled ? 'neutral' : 'primary'"
                variant="subtle"
                size="xs"
              >
                {{ prop.label }}
              </UBadge>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <UButton color="neutral" variant="ghost" @click="close">
              Cancel
            </UButton>
            <UButton :disabled="!newPropertyName.trim()" :loading="creatingProperty" @click="createNotionProperty">
              Create
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Add group modal -->
    <UModal v-model:open="showGroupModal">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">
            Create Group
          </h3>
          <p class="text-sm text-gray-500 mb-4">
            Groups become category values when saving to Notion.
          </p>
          <UFormField label="Group name">
            <UInput
              v-model="newGroupName"
              placeholder="e.g., Design, Engineering, Marketing..."
              autofocus
              @keyup.enter="createGroup"
            />
          </UFormField>
          <div class="flex justify-end gap-2 mt-6">
            <UButton color="neutral" variant="ghost" @click="close">
              Cancel
            </UButton>
            <UButton :disabled="!newGroupName.trim()" @click="createGroup">
              Create
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.group-node-label {
  position: absolute;
  top: 8px;
  left: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #4b5563;
  pointer-events: none;
  user-select: none;
}
</style>
