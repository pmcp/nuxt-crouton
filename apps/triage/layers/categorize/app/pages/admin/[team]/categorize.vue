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
const { accounts, createManualAccount, fetchAccounts } = useTriageConnectedAccounts(teamId)
const notionAccounts = computed(() => accounts.value.filter(a => a.provider === 'notion'))
const accountItems = computed(() =>
  notionAccounts.value.map(a => ({ label: `${a.label} (${a.accessTokenHint || '***'})`, value: a.id })),
)

// ─── Connect modal state ───
const showConnectModal = ref(false)
const connectLabel = ref('')
const connectToken = ref('')
const connecting = ref(false)

async function connectNotionAccount() {
  if (!connectLabel.value.trim() || !connectToken.value.trim()) return
  connecting.value = true
  try {
    const result = await createManualAccount({
      provider: 'notion',
      label: connectLabel.value.trim(),
      token: connectToken.value.trim(),
    })
    if (result?.account) {
      selectedAccountId.value = result.account.id
    }
    showConnectModal.value = false
    connectLabel.value = ''
    connectToken.value = ''
    toast.add({ title: 'Notion account connected', color: 'success' })
  }
  catch (error: any) {
    toast.add({
      title: 'Failed to connect',
      description: error.data?.statusText || error.message,
      color: 'error',
    })
  }
  finally {
    connecting.value = false
  }
}

// ─── Setup state ───
const selectedAccountId = ref<string | null>(null)
const databaseId = ref('')
const databases = ref<{ id: string; title: string; icon?: string; url: string }[]>([])
const loadingDatabases = ref(false)
const categoryProperty = ref('')
const schema = ref<Record<string, { type: string; options?: { name: string }[] }>>({})

// ─── Data state ───
const pages = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const loaded = ref(false)

// ─── Card detail slideover ───
const selectedCard = ref<any>(null)
const showCardDetail = ref(false)

// ─── View tab ───
const activeTab = ref<'canvas' | 'insights'>('canvas')

// ─── Card detail computeds ───
const CARD_SKIP_KEYS = ['Status', 'status', 'Type', 'type', 'Category', 'category', 'Reach', 'reach', 'Impact', 'impact', 'Confidence', 'confidence', 'Effort', 'effort']

const cardFilteredProperties = computed(() => {
  if (!selectedCard.value) return {}
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(selectedCard.value.properties)) {
    if (CARD_SKIP_KEYS.includes(key)) continue
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue
    result[key] = value
  }
  return result
})

const cardRice = computed(() => {
  if (!selectedCard.value) return null
  const p = selectedCard.value.properties
  const r = getRiceField(p, 'Reach')
  const i = getRiceField(p, 'Impact')
  const c = getRiceField(p, 'Confidence')
  const e = getRiceField(p, 'Effort')
  const score = computeRice(p)
  if (score == null) return null
  return {
    score: Math.round(score),
    components: [
      { label: 'Reach', value: r, max: 10, color: 'bg-blue-500' },
      { label: 'Impact', value: i, max: 5, color: 'bg-emerald-500' },
      { label: 'Confidence', value: c, max: 5, color: 'bg-amber-500' },
      { label: 'Effort', value: e, max: 10, color: 'bg-red-500' },
    ],
    chartData: [
      { name: 'Reach', Value: r ?? 0 },
      { name: 'Impact', Value: i ?? 0 },
      { name: 'Confidence', Value: c ?? 0 },
      { name: 'Effort', Value: e ?? 0 },
    ],
  }
})

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

// ─── Rename a group ───
const editingGroupId = ref<string | null>(null)
const editingGroupName = ref('')

function startRenameGroup(groupId: string) {
  const group = groups.value.find(g => g.id === groupId)
  if (!group) return
  editingGroupId.value = groupId
  editingGroupName.value = group.name
}

function commitRenameGroup() {
  if (!editingGroupId.value || !editingGroupName.value.trim()) {
    editingGroupId.value = null
    return
  }
  const newName = editingGroupName.value.trim()
  const group = groups.value.find(g => g.id === editingGroupId.value)
  if (group) {
    group.name = newName
  }
  // Update the group node label too
  nodes.value = nodes.value.map(n =>
    n.id === editingGroupId.value
      ? { ...n, data: { ...n.data, label: newName } }
      : n,
  )
  editingGroupId.value = null
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

// ─── RICE score helpers ───
function getRiceField(props: Record<string, unknown>, field: string): number | null {
  const val = props[field] ?? props[field.toLowerCase()] ?? props[field.charAt(0).toUpperCase() + field.slice(1)]
  return typeof val === 'number' ? val : null
}

function computeRice(props: Record<string, unknown>): number | null {
  const r = getRiceField(props, 'Reach')
  const i = getRiceField(props, 'Impact')
  const c = getRiceField(props, 'Confidence')
  const e = getRiceField(props, 'Effort')
  if (r == null || i == null || c == null || e == null || e === 0) return null
  return (r * i * c) / e
}

const hasRiceScores = computed(() => {
  return pages.value.some(p => computeRice(p.properties) != null)
})

// Sorted pages by RICE score (descending)
const pagesByRice = computed(() => {
  return pages.value
    .map(p => ({ ...p, rice: computeRice(p.properties) }))
    .filter(p => p.rice != null)
    .sort((a, b) => (b.rice ?? 0) - (a.rice ?? 0))
})

// Chart data: RICE scores by card (bar chart)
const riceBarData = computed(() => {
  return pagesByRice.value.slice(0, 30).map(p => ({
    name: p.title.length > 25 ? `${p.title.slice(0, 25)}...` : p.title,
    RICE: Math.round(p.rice ?? 0),
  }))
})

const riceBarCategories = computed(() => ({
  RICE: { name: 'RICE', color: '#3b82f6' },
}))

// Chart data: RICE components breakdown (stacked bar)
const riceComponentsData = computed(() => {
  return pagesByRice.value.slice(0, 20).map(p => ({
    name: p.title.length > 20 ? `${p.title.slice(0, 20)}...` : p.title,
    Reach: getRiceField(p.properties, 'Reach') ?? 0,
    Impact: getRiceField(p.properties, 'Impact') ?? 0,
    Confidence: getRiceField(p.properties, 'Confidence') ?? 0,
    Effort: getRiceField(p.properties, 'Effort') ?? 0,
  }))
})

const riceComponentCategories = computed(() => ({
  Reach: { name: 'Reach', color: '#3b82f6' },
  Impact: { name: 'Impact', color: '#10b981' },
  Confidence: { name: 'Confidence', color: '#f59e0b' },
  Effort: { name: 'Effort', color: '#ef4444' },
}))

// Chart data: RICE by category (donut)
const riceByCategoryData = computed(() => {
  const categoryMap = new Map<string, number[]>()
  for (const node of nodes.value) {
    if (node.type !== 'notionCard') continue
    const group = node.parentNode ? groups.value.find(g => g.id === node.parentNode) : null
    const category = group?.name || 'Uncategorized'
    const page = pages.value.find(p => p.id === node.id)
    if (!page) continue
    const rice = computeRice(page.properties)
    if (rice == null) continue
    if (!categoryMap.has(category)) categoryMap.set(category, [])
    categoryMap.get(category)!.push(rice)
  }
  return Array.from(categoryMap.entries()).map(([name, scores]) => ({
    name,
    avgRice: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    totalRice: Math.round(scores.reduce((a, b) => a + b, 0)),
    count: scores.length,
  }))
})

// Summary stats
const riceStats = computed(() => {
  const scores = pagesByRice.value.map(p => p.rice ?? 0)
  if (scores.length === 0) return null
  return {
    total: scores.length,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    max: Math.round(Math.max(...scores)),
    min: Math.round(Math.min(...scores)),
  }
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
        <!-- View tabs -->
        <div class="flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
          <button
            class="px-3 py-1 text-sm rounded-md transition-colors"
            :class="activeTab === 'canvas' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = 'canvas'"
          >
            Canvas
          </button>
          <button
            class="px-3 py-1 text-sm rounded-md transition-colors"
            :class="activeTab === 'insights' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = 'insights'"
          >
            Insights
          </button>
        </div>

        <USeparator orientation="vertical" class="h-6" />

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
          <div class="flex gap-2">
            <USelect
              v-model="selectedAccountId"
              :items="accountItems"
              placeholder="Select account..."
              value-key="value"
              class="flex-1"
            />
            <UButton
              icon="i-lucide-plus"
              variant="soft"
              @click="showConnectModal = true"
            />
          </div>
        </UFormField>

        <!-- Database picker -->
        <UFormField v-if="selectedAccountId" label="Database">
          <USelect
            v-model="databaseId"
            :items="databaseItems"
            placeholder="Select a database..."
            :loading="loadingDatabases"
            class="w-full"
            value-key="value"
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

    <!-- Loaded content -->
    <template v-else>
      <!-- Canvas tab -->
      <div v-show="activeTab === 'canvas'" class="flex flex-col flex-1 min-h-0">
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
            <input
              v-if="editingGroupId === group.id"
              v-model="editingGroupName"
              class="bg-transparent border-none outline-none font-medium text-gray-700 w-24"
              @blur="commitRenameGroup"
              @keyup.enter="commitRenameGroup"
              @keyup.escape="editingGroupId = null"
              @vue:mounted="({ el }: any) => { el.focus(); el.select() }"
            >
            <span
              v-else
              class="font-medium text-gray-700 cursor-pointer"
              title="Double-click to rename"
              @dblclick="startRenameGroup(group.id)"
            >{{ group.name }}</span>
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
      </div>

      <!-- Insights tab -->
      <div v-show="activeTab === 'insights'" class="flex-1 overflow-y-auto p-6 space-y-6">
        <template v-if="hasRiceScores">
          <!-- Summary stats -->
          <div v-if="riceStats" class="grid grid-cols-4 gap-4">
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div class="text-2xl font-bold text-primary">
                {{ riceStats.total }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Cards with RICE
              </div>
            </div>
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div class="text-2xl font-bold text-blue-600">
                {{ riceStats.avg }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Average RICE
              </div>
            </div>
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div class="text-2xl font-bold text-green-600">
                {{ riceStats.max }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Highest RICE
              </div>
            </div>
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div class="text-2xl font-bold text-red-500">
                {{ riceStats.min }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Lowest RICE
              </div>
            </div>
          </div>

          <!-- Charts row -->
          <div class="grid grid-cols-2 gap-6">
            <!-- RICE Score ranking -->
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 class="text-sm font-semibold mb-3">
                RICE Score Ranking
              </h3>
              <ClientOnly>
                <BarChart
                  v-if="riceBarData.length > 0"
                  :data="riceBarData"
                  :y-axis="['RICE']"
                  :categories="riceBarCategories"
                  :x-formatter="(_: number, i: number) => String(riceBarData[i]?.name ?? '')"
                  :height="Math.max(250, riceBarData.length * 28)"
                />
              </ClientOnly>
            </div>

            <!-- RICE components breakdown -->
            <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 class="text-sm font-semibold mb-3">
                RICE Components
              </h3>
              <ClientOnly>
                <BarChart
                  v-if="riceComponentsData.length > 0"
                  :data="riceComponentsData"
                  :y-axis="['Reach', 'Impact', 'Confidence', 'Effort']"
                  :categories="riceComponentCategories"
                  :x-formatter="(_: number, i: number) => String(riceComponentsData[i]?.name ?? '')"
                  :height="Math.max(250, riceComponentsData.length * 28)"
                  :stacked="true"
                />
              </ClientOnly>
            </div>
          </div>

          <!-- Category breakdown -->
          <div v-if="riceByCategoryData.length > 0" class="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold mb-3">
              Average RICE by Category
            </h3>
            <div class="grid grid-cols-2 gap-6">
              <ClientOnly>
                <BarChart
                  :data="riceByCategoryData.map(d => ({ name: d.name, 'Avg RICE': d.avgRice }))"
                  :y-axis="['Avg RICE']"
                  :categories="{ 'Avg RICE': { name: 'Avg RICE', color: '#8b5cf6' } }"
                  :x-formatter="(_: number, i: number) => String(riceByCategoryData[i]?.name ?? '')"
                  :height="250"
                />
              </ClientOnly>
              <div class="space-y-2">
                <div
                  v-for="cat in riceByCategoryData"
                  :key="cat.name"
                  class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div>
                    <div class="font-medium text-sm">
                      {{ cat.name }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ cat.count }} cards
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-lg">
                      {{ cat.avgRice }}
                    </div>
                    <div class="text-xs text-gray-400">
                      avg RICE
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sorted card table -->
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-sm font-semibold mb-3">
              All Cards by RICE Score
            </h3>
            <div class="overflow-auto max-h-96">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th class="py-2 pr-4 font-medium text-gray-500">#</th>
                    <th class="py-2 pr-4 font-medium text-gray-500">Title</th>
                    <th class="py-2 pr-4 font-medium text-gray-500 text-right">Reach</th>
                    <th class="py-2 pr-4 font-medium text-gray-500 text-right">Impact</th>
                    <th class="py-2 pr-4 font-medium text-gray-500 text-right">Confidence</th>
                    <th class="py-2 pr-4 font-medium text-gray-500 text-right">Effort</th>
                    <th class="py-2 font-medium text-gray-500 text-right">RICE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(page, i) in pagesByRice"
                    :key="page.id"
                    class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    @click="selectedCard = { title: page.title, properties: page.properties, url: page.url }; showCardDetail = true"
                  >
                    <td class="py-2 pr-4 text-gray-400">{{ i + 1 }}</td>
                    <td class="py-2 pr-4 font-medium max-w-xs truncate">{{ page.title }}</td>
                    <td class="py-2 pr-4 text-right">{{ getRiceField(page.properties, 'Reach') ?? '-' }}</td>
                    <td class="py-2 pr-4 text-right">{{ getRiceField(page.properties, 'Impact') ?? '-' }}</td>
                    <td class="py-2 pr-4 text-right">{{ getRiceField(page.properties, 'Confidence') ?? '-' }}</td>
                    <td class="py-2 pr-4 text-right">{{ getRiceField(page.properties, 'Effort') ?? '-' }}</td>
                    <td class="py-2 text-right font-bold" :class="(page.rice ?? 0) >= 10 ? 'text-green-600' : (page.rice ?? 0) >= 5 ? 'text-amber-600' : 'text-red-500'">
                      {{ Math.round(page.rice ?? 0) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- No RICE scores -->
        <div v-else class="flex flex-col items-center justify-center h-full text-center">
          <UIcon name="i-lucide-chart-bar" class="size-16 mb-4 opacity-20" />
          <h3 class="text-lg font-semibold mb-1">
            No RICE scores found
          </h3>
          <p class="text-sm text-gray-500 max-w-md">
            Add Reach, Impact, Confidence, and Effort number fields to your Notion database to see RICE score visualizations.
          </p>
        </div>
      </div>
    </template>

    <!-- Card detail slideover -->
    <USlideover v-model:open="showCardDetail">
      <template #content>
        <div v-if="selectedCard" class="h-full flex flex-col overflow-hidden">
          <!-- Fixed header -->
          <div class="p-6 pb-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div class="flex items-start justify-between gap-3">
              <h2 class="text-lg font-semibold leading-snug">
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

            <!-- Status + Type badges -->
            <div class="flex flex-wrap gap-2 mt-3">
              <UBadge v-if="selectedCard.properties.Status || selectedCard.properties.status" color="primary" variant="subtle" size="sm">
                {{ selectedCard.properties.Status || selectedCard.properties.status }}
              </UBadge>
              <UBadge v-if="selectedCard.properties.Type || selectedCard.properties.type" color="neutral" variant="subtle" size="sm">
                {{ selectedCard.properties.Type || selectedCard.properties.type }}
              </UBadge>
              <UBadge v-if="selectedCard.properties.Category || selectedCard.properties.category" color="info" variant="subtle" size="sm">
                {{ selectedCard.properties.Category || selectedCard.properties.category }}
              </UBadge>
            </div>
          </div>

          <!-- Scrollable body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-5">
            <!-- RICE score card -->
            <div v-if="cardRice" class="rounded-xl bg-gray-50 dark:bg-gray-800 p-4">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-semibold">RICE Score</span>
                <span
                  class="text-2xl font-bold"
                  :class="cardRice.score >= 10 ? 'text-green-600' : cardRice.score >= 5 ? 'text-amber-600' : 'text-red-500'"
                >
                  {{ cardRice.score }}
                </span>
              </div>
              <div class="grid grid-cols-4 gap-3">
                <div v-for="comp in cardRice.components" :key="comp.label" class="text-center">
                  <div class="text-lg font-semibold">
                    {{ comp.value ?? '-' }}
                  </div>
                  <div class="text-[10px] text-gray-500 uppercase tracking-wider">
                    {{ comp.label }}
                  </div>
                  <div class="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="comp.color"
                      :style="{ width: `${Math.min(100, ((comp.value ?? 0) / comp.max) * 100)}%` }"
                    />
                  </div>
                </div>
              </div>
              <!-- Mini bar chart for RICE components -->
              <ClientOnly>
                <BarChart
                  v-if="cardRice.chartData.length > 0"
                  :data="cardRice.chartData"
                  :y-axis="['Value']"
                  :categories="{ Value: { name: 'Value', color: '#6366f1' } }"
                  :x-formatter="(_: number, i: number) => String(cardRice.chartData[i]?.name ?? '')"
                  :height="120"
                  class="mt-3"
                />
              </ClientOnly>
            </div>

            <!-- Properties (filtered, no empties) -->
            <div class="space-y-2">
              <template v-for="(value, key) in cardFilteredProperties" :key="key">
                <div class="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span class="text-xs font-medium text-gray-400 uppercase tracking-wide w-28 shrink-0 pt-0.5">{{ key }}</span>
                  <div class="flex-1 min-w-0">
                    <template v-if="Array.isArray(value) && value.length > 0">
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
                    <template v-else-if="typeof value === 'number'">
                      <span class="text-sm font-medium">{{ value }}</span>
                    </template>
                    <template v-else>
                      <span class="text-sm">{{ value }}</span>
                    </template>
                  </div>
                </div>
              </template>
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

    <!-- Connect Notion Account modal -->
    <UModal v-model:open="showConnectModal">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">
            Connect Notion Account
          </h3>
          <div class="space-y-4">
            <UFormField label="Label" required>
              <UInput
                v-model="connectLabel"
                placeholder="e.g., Design Team Notion"
                autofocus
              />
            </UFormField>
            <UFormField label="API Token" required>
              <UInput
                v-model="connectToken"
                placeholder="secret_... or ntn_..."
                type="password"
              />
              <template #description>
                Paste your Notion integration token. It will be encrypted at rest.
              </template>
            </UFormField>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <UButton color="neutral" variant="ghost" @click="close">
              Cancel
            </UButton>
            <UButton
              :disabled="!connectLabel.trim() || !connectToken.trim()"
              :loading="connecting"
              @click="connectNotionAccount"
            >
              Connect
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
