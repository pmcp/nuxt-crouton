<script setup lang="ts">
/**
 * Inline Editor for Public Pages
 *
 * Wraps the WorkspaceEditor for use in the public page floating panel.
 * No separate header — the WorkspaceEditor's own header bar is used,
 * with a close button injected via the `showClose` prop.
 *
 * Switches to tabbed (single-column) i18n layout when the panel is narrow.
 *
 * Shares reactive translation state via useState so the page preview
 * updates live as the admin types.
 *
 * @example
 * <CroutonPagesInlineEditor
 *   :page-id="pageId"
 *   :panel-width="480"
 *   @close="isEditing = false"
 *   @save="handleSave"
 * />
 */

interface Props {
  pageId: string
  /** Current panel width in pixels — used to switch i18n layout */
  panelWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  panelWidth: 480
})

const emit = defineEmits<{
  close: []
  save: [page: any]
}>()

// Switch to tabs layout when the panel is too narrow for side-by-side
const SIDE_BY_SIDE_THRESHOLD = 600
const i18nLayout = computed<'tabs' | 'side-by-side'>(() =>
  props.panelWidth < SIDE_BY_SIDE_THRESHOLD ? 'tabs' : 'side-by-side'
)

// Shared state for live preview — the page route reads this
const editingTranslations = useState<Record<string, any> | null>('editingTranslations', () => null)

// Ref to the WorkspaceEditor (exposes { state } via defineExpose)
const editorRef = ref<{ state: { translations: Record<string, any> } } | null>(null)

// Deep-watch editor translations and sync to shared state for live preview
watch(
  () => editorRef.value?.state?.translations,
  (translations: Record<string, any> | undefined) => {
    if (translations) {
      editingTranslations.value = translations
    }
  },
  { deep: true }
)

function handleSave(page: any) {
  emit('save', page)
}

function handleClose() {
  editingTranslations.value = null
  emit('close')
}

onBeforeUnmount(() => {
  editingTranslations.value = null
})
</script>

<template>
  <div class="h-full flex flex-col">
    <CroutonPagesWorkspaceEditor
      ref="editorRef"
      :page-id="pageId"
      :i18n-layout="i18nLayout"
      show-close
      @save="handleSave"
      @cancel="handleClose"
      @close="handleClose"
    />
  </div>
</template>
