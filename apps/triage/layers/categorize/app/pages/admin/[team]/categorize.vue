<script setup lang="ts">
import { ref, computed, nextTick, markRaw } from 'vue'
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

// ─── Setup state ───
const databaseId = ref('')
const notionToken = ref('')
const categoryProperty = ref('')
const schema = ref<Record<string, { type: string; options?: { name: string }[] }>>({})

// ─── Data state ───
const pages = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const loaded = ref(false)

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
const { onNodeDragStop, getNodes, findNode } = useVueFlow()
const nodes = ref<Node[]>([])

// ─── All database properties ───
const allProperties = computed(() => {
  return Object.entries(schema.value).map(([name, prop]) => ({
    label: `${name} (${prop.type})`,
    value: name,
    type: prop.type,
    disabled: !['select', 'status', 'multi_select'].includes(prop.type),
  }))
})

// Writable property types for the dropdown
const writableProperties = computed(() => {
  return allProperties.value.filter(p => !p.disabled)
})

// Whether we need to create a new property
const newPropertyName = ref('')
const showCreateProperty = ref(false)
const creatingProperty = ref(false)

async function createNotionProperty() {
  if (!newPropertyName.value.trim()) return
  creatingProperty.value = true

  try {
    await $fetch(`https://api.notion.com/v1/databases/${databaseId.value}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${notionToken.value}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: {
        properties: {
          [newPropertyName.value.trim()]: { select: { options: [] } },
        },
      },
    })

    // Add to local schema
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

// ─── Load pages from Notion ───
async function loadPages() {
  if (!databaseId.value || !notionToken.value) {
    toast.add({ title: 'Enter database ID and token', color: 'warning' })
    return
  }

  loading.value = true

  try {
    // Fetch schema and pages in parallel
    const [schemaRes, pagesRes] = await Promise.all([
      $fetch<any>(`/api/crouton-triage/teams/${teamId.value}/notion/schema/${databaseId.value}`, {
        query: { notionToken: notionToken.value },
      }),
      $fetch<any>(`/api/teams/${teamId.value}/notion/database/${databaseId.value}/pages`, {
        query: { notionToken: notionToken.value },
      }),
    ])

    schema.value = schemaRes.properties || {}
    pages.value = pagesRes.pages || []

    // Auto-select first writable property if available
    if (!categoryProperty.value && writableProperties.value.length > 0) {
      categoryProperty.value = writableProperties.value[0]!.value
    }

    // Build nodes in a grid layout
    buildNodes()
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

// ─── Build VueFlow nodes from pages ───
function buildNodes() {
  const CARD_W = 220
  const CARD_H = 100
  const GAP = 30
  const cols = Math.ceil(Math.sqrt(pages.value.length))

  nodes.value = pages.value.map((page, i) => ({
    id: page.id,
    type: 'notionCard',
    position: {
      x: (i % cols) * (CARD_W + GAP) + 50,
      y: Math.floor(i / cols) * (CARD_H + GAP) + 50,
    },
    data: {
      title: page.title,
      properties: page.properties,
      url: page.url,
      grouped: false,
    },
  }))

  // Reset groups
  groups.value = []
  groupCounter = 0
}

// ─── Create a group ───
function createGroup() {
  if (!newGroupName.value.trim()) return

  const id = `group-${++groupCounter}`
  const color = GROUP_COLORS[groups.value.length % GROUP_COLORS.length]!

  groups.value.push({ id, name: newGroupName.value.trim(), color })

  // Add group node to canvas
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
  // Unparent any cards in this group
  nodes.value = nodes.value
    .filter(n => n.id !== groupId)
    .map((n) => {
      if (n.parentNode === groupId) {
        // Convert relative position back to absolute
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

// ─── Handle node drag stop — detect group overlap ───
onNodeDragStop((event: NodeDragEvent) => {
  const { node } = event
  // Only handle card nodes
  if (node.type !== 'notionCard') return

  const currentNodes = nodes.value
  const groupNodes = currentNodes.filter(n => n.type === 'group')
  if (groupNodes.length === 0) return

  // Calculate card center (absolute position)
  const cardW = 220
  const cardH = 80
  let cardCenterX = node.position.x + cardW / 2
  let cardCenterY = node.position.y + cardH / 2

  // If card already has a parent, position is relative
  if (node.parentNode) {
    const parentGroup = groupNodes.find(g => g.id === node.parentNode)
    if (parentGroup) {
      cardCenterX += parentGroup.position.x
      cardCenterY += parentGroup.position.y
    }
  }

  // Find overlapping group
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

  // Update parentNode
  nextTick(() => {
    nodes.value = nodes.value.map((n) => {
      if (n.id !== node.id) return n

      if (targetGroup && targetGroup.id !== node.parentNode) {
        // Move into group — convert position to relative
        const relX = cardCenterX - targetGroup.position.x - cardW / 2
        const relY = cardCenterY - targetGroup.position.y - cardH / 2
        return {
          ...n,
          parentNode: targetGroup.id,
          extent: 'parent' as const,
          position: { x: Math.max(10, relX), y: Math.max(30, relY) },
          data: { ...n.data, grouped: true },
        }
      }
      else if (!targetGroup && node.parentNode) {
        // Moved out of group
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

  saving.value = true

  try {
    const result = await $fetch<any>(`/api/teams/${teamId.value}/notion/database/${databaseId.value}/categorize`, {
      method: 'POST',
      body: {
        notionToken: notionToken.value,
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
  <div class="flex flex-col h-full">
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
          icon="i-heroicons-plus"
          size="sm"
          variant="soft"
          @click="showGroupModal = true"
        >
          Add Group
        </UButton>
        <UButton
          icon="i-heroicons-cloud-arrow-up"
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
        <UFormField label="Notion Database ID">
          <UInput
            v-model="databaseId"
            placeholder="abc123def456..."
            class="w-full"
          />
        </UFormField>

        <UFormField label="Notion Integration Token">
          <UInput
            v-model="notionToken"
            type="password"
            placeholder="secret_..."
            class="w-full"
          />
        </UFormField>

        <UButton
          block
          :loading="loading"
          :disabled="!databaseId || !notionToken"
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
              icon="i-heroicons-x-mark"
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
