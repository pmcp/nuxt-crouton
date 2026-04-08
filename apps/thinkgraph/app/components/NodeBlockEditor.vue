<script setup lang="ts">
/**
 * NodeBlockEditor — Notion-style block editor for a single ThinkGraph node.
 *
 * Each node gets its own crouton-collab room, so the Y.Doc only contains the
 * active node's content (bandwidth bounded by node, not by project). Switching
 * nodes remounts this component (parent uses :key=nodeId), giving us a clean
 * room teardown for free.
 *
 * Persistence is dual:
 *  - Yjs blob in CollabRoom DO — live multi-tab sync, source of truth at runtime
 *  - thinkgraph_nodes.content row column — mirrored via debounced PATCH on local
 *    edits, so server-side consumers (Pi in PR 2+, MCP, etc.) can read content
 *    without joining Yjs state
 *
 * Cold-start seeding: when the room's Yjs fragment is empty AND the row already
 * has content (e.g. local dev with no collab worker, or a stale DO), we seed
 * the editor from the row content on first sync. After seeding, edits flow
 * back to the row via the debounced save below.
 *
 * Multi-tab write avoidance: only the focused tab persists to the row. Other
 * tabs receive remote updates via Yjs and would otherwise duplicate writes.
 */
import type { Editor } from '@tiptap/vue-3'

interface Props {
  nodeId: string
  teamId: string
  initialContent?: unknown | null
}

const props = defineProps<Props>()

const collab = useCollabEditor({
  roomId: `thinkgraph-node-${props.teamId}-${props.nodeId}`,
  roomType: 'page',
  field: 'content'
})

// Top-level destructure so the template can access reactive values directly
const yxmlFragment = collab.yxmlFragment
const provider = collab.provider
const collabUser = computed(() => collab.user.value ?? undefined)

const editorInstance = ref<Editor | null>(null)
const seeded = ref(false)

function handleCreate({ editor }: { editor: Editor }) {
  editorInstance.value = editor
}

// Cold-start seed: when the room is fresh but the row has content, import the
// row content into the editor. setContent writes through to the Y.XmlFragment.
watch(
  () => ({ synced: collab.synced.value, editor: editorInstance.value }),
  ({ synced, editor }) => {
    if (seeded.value || !synced || !editor) return

    const fragmentEmpty = !yxmlFragment || yxmlFragment.length === 0
    const initial = props.initialContent

    if (fragmentEmpty && initial && typeof initial === 'object') {
      try {
        editor.commands.setContent(initial as Parameters<typeof editor.commands.setContent>[0], { emitUpdate: false })
      } catch (err) {
        console.warn('[NodeBlockEditor] Seed from initialContent failed', err)
      }
    }
    seeded.value = true
  },
  { immediate: true }
)

const persistContent = useDebounceFn(async (content: unknown) => {
  try {
    await $fetch(`/api/teams/${props.teamId}/thinkgraph-nodes/${props.nodeId}`, {
      method: 'PATCH',
      body: { content }
    })
  } catch (err) {
    console.error('[NodeBlockEditor] Failed to persist content', err)
  }
}, 1000)

function handleUpdate({ editor }: { editor: Editor }) {
  if (!seeded.value) return
  if (!editor.isFocused) return
  persistContent(editor.getJSON())
}
</script>

<template>
  <div class="rounded-lg border border-default overflow-hidden bg-default">
    <CroutonEditorBlocks
      :yxml-fragment="yxmlFragment"
      :collab-provider="provider"
      :collab-user="collabUser"
      placeholder="Type / to insert a block..."
      content-type="json"
      class="min-h-[12rem]"
      @create="handleCreate"
      @update="handleUpdate"
    />
  </div>
</template>
