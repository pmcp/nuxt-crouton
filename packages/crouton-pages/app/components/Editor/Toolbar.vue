<script setup lang="ts">
/**
 * PageEditor Toolbar
 *
 * The action bar at the top of the workspace editor. Handles status, page type,
 * visibility, navigation toggle, settings popover (layout + parent), AI generator
 * trigger, preview, external link, delete (two-click confirm) and save.
 *
 * @example
 * <CroutonPagesEditorToolbar
 *   v-model:status="state.status"
 *   v-model:visibility="state.visibility"
 *   v-model:show-in-navigation="state.showInNavigation"
 *   v-model:layout="state.layout"
 *   v-model:parent-id="state.parentId"
 *   :action="action"
 *   :selected-page-type="selectedPageType"
 *   :page-type-dropdown-items="pageTypeDropdownItems"
 *   :status-config="statusConfig"
 *   :visibility-config="visibilityConfig"
 *   :status-dropdown-items="statusDropdownItems"
 *   :visibility-dropdown-items="visibilityDropdownItems"
 *   :layout-options="layoutOptions"
 *   :parent-options="parentOptions"
 *   :pages-pending="pagesPending"
 *   :is-regular-page="isRegularPage"
 *   :is-saving="isSaving"
 *   :show-close="showClose"
 *   :page-id="state.id"
 *   :public-url="publicUrl"
 *   :status="state.status"
 *   @show-ai-generator="showAiGenerator = true"
 *   @show-preview="showPreview = true"
 *   @layout-change="onLayoutChange"
 *   @cancel="emit('cancel')"
 *   @delete="handleDelete"
 *   @close="emit('close')"
 * />
 */

interface DropdownItem {
  label: string
  icon?: string
  slot?: string
  onSelect?: () => void
}

interface PageTypeInfo {
  icon?: string
  name?: string
  description?: string
  fullId?: string
}

interface StatusConfigEntry {
  color: string
  icon: string
  label: string
}

interface VisibilityConfigEntry {
  icon: string
  label: string
}

interface SelectOption {
  value: string | null
  label: string
  disabled?: boolean
}

interface Props {
  /** 'create' or 'update' */
  action: 'create' | 'update'
  /** Current page status */
  status: string
  /** Current page visibility */
  visibility: string
  /** Whether page is shown in navigation */
  showInNavigation: boolean
  /** Current page layout */
  layout: string
  /** Current parent page ID */
  parentId: string | null
  /** The resolved page type object */
  selectedPageType?: PageTypeInfo | null
  /** Dropdown items for page type selector */
  pageTypeDropdownItems: DropdownItem[][]
  /** Status config map */
  statusConfig: Record<string, StatusConfigEntry>
  /** Visibility config map */
  visibilityConfig: Record<string, VisibilityConfigEntry>
  /** Dropdown items for status selector */
  statusDropdownItems: DropdownItem[][]
  /** Dropdown items for visibility selector */
  visibilityDropdownItems: DropdownItem[][]
  /** Layout options for the settings popover */
  layoutOptions: SelectOption[]
  /** Parent page options for the settings popover */
  parentOptions: SelectOption[]
  /** Whether parent pages list is loading */
  pagesPending: boolean
  /** Whether to show the AI generator button (regular pages only) */
  isRegularPage: boolean
  /** Whether AI package is available */
  hasAi?: boolean
  /** Whether the save action is in progress */
  isSaving: boolean
  /** Whether to show the X close button (used by InlineEditor) */
  showClose?: boolean
  /** Current page ID (used for delete check) */
  pageId?: string | null
  /** Public URL for the open-in-public button */
  publicUrl?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  showClose: false,
  pageId: null,
  publicUrl: null,
  selectedPageType: null,
  hasAi: false
})

const emit = defineEmits<{
  'update:status': [value: string]
  'update:visibility': [value: string]
  'update:showInNavigation': [value: boolean]
  'update:layout': [value: string]
  'update:parentId': [value: string | null]
  'show-ai-generator': []
  'show-preview': []
  'layout-change': []
  'cancel': []
  'delete': []
  'close': []
}>()

const { t } = useT()
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 min-h-12 px-4 py-2 border-b border-default bg-elevated/30">
    <!-- Left group: Status, Page Type, Visibility, Nav toggle, Settings -->
    <UFieldGroup>
      <!-- Status -->
      <UDropdownMenu
        :items="statusDropdownItems"
        :content="{ align: 'start' }"
      >
        <UButton variant="ghost" color="neutral" size="xs" class="px-2 lg:px-3">
          <span
            :class="[
              'block size-3 rounded-full',
              `bg-${statusConfig[status]?.color || 'warning'}`
            ]"
          />
          <span class="hidden lg:inline">{{ statusConfig[status]?.label }}</span>
        </UButton>

        <template #draft="{ item }">
          <span class="flex items-center gap-2">
            <span class="block size-2.5 rounded-full bg-warning" />
            {{ (item as any).label }}
          </span>
        </template>
        <template #published="{ item }">
          <span class="flex items-center gap-2">
            <span class="block size-2.5 rounded-full bg-success" />
            {{ (item as any).label }}
          </span>
        </template>
        <template #archived="{ item }">
          <span class="flex items-center gap-2">
            <span class="block size-2.5 rounded-full bg-error" />
            {{ (item as any).label }}
          </span>
        </template>
      </UDropdownMenu>

      <!-- Page Type -->
      <UDropdownMenu
        v-if="action === 'create'"
        :items="pageTypeDropdownItems"
        :content="{ align: 'start' }"
      >
        <UButton variant="ghost" color="neutral" size="xs" class="px-2 lg:px-3">
          <UIcon
            :name="selectedPageType?.icon || 'i-lucide-file'"
            class="size-4"
          />
          <span class="hidden lg:inline">{{ selectedPageType?.name || t('pages.editor.defaultPageType') }}</span>
        </UButton>

        <template #item="{ item }">
          <span class="flex items-center gap-2">
            <UIcon :name="item.icon || 'i-lucide-file'" class="size-4 text-muted" />
            {{ item.label }}
          </span>
        </template>
      </UDropdownMenu>
      <UPopover v-else>
        <UButton variant="ghost" color="neutral" size="xs" class="px-2 lg:px-3">
          <UIcon
            :name="selectedPageType?.icon || 'i-lucide-file'"
            class="size-4"
          />
          <span class="hidden lg:inline">{{ selectedPageType?.name || t('pages.editor.defaultPageType') }}</span>
        </UButton>
        <template #content>
          <div class="p-3 text-sm">
            <div class="font-medium">{{ selectedPageType?.name || t('pages.editor.regularPage') }}</div>
            <div v-if="selectedPageType?.description" class="text-muted text-xs mt-1">
              {{ selectedPageType.description }}
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Visibility -->
      <UDropdownMenu
        :items="visibilityDropdownItems"
        :content="{ align: 'start' }"
      >
        <UButton variant="ghost" color="neutral" size="xs" class="px-2 lg:px-3">
          <UIcon
            :name="visibilityConfig[visibility]?.icon || 'i-lucide-globe'"
            class="size-4 text-muted"
          />
          <span class="hidden lg:inline">{{ visibilityConfig[visibility]?.label }}</span>
        </UButton>

        <template #public="{ item }">
          <span class="flex items-center gap-2">
            <UIcon name="i-lucide-globe" class="size-4 text-muted" />
            {{ (item as any).label }}
          </span>
        </template>
        <template #members="{ item }">
          <span class="flex items-center gap-2">
            <UIcon name="i-lucide-users" class="size-4 text-muted" />
            {{ (item as any).label }}
          </span>
        </template>
        <template #hidden="{ item }">
          <span class="flex items-center gap-2">
            <UIcon name="i-lucide-eye-off" class="size-4 text-muted" />
            {{ (item as any).label }}
          </span>
        </template>
      </UDropdownMenu>

      <!-- Show in Navigation -->
      <UTooltip :text="showInNavigation ? t('pages.editor.shownInMenu') : t('pages.editor.hiddenFromMenu')" :delay-duration="0">
        <UButton
          variant="ghost"
          color="neutral"
          size="xs"
          class="px-2"
          @click="emit('update:showInNavigation', !showInNavigation)"
        >
          <UIcon
            name="i-lucide-menu"
            :class="['size-4', showInNavigation ? 'text-muted' : 'opacity-30']"
          />
          <span :class="['hidden lg:inline', showInNavigation ? '' : 'opacity-30']">
            {{ showInNavigation ? t('pages.editor.inMenu') : t('pages.editor.noMenu') }}
          </span>
        </UButton>
      </UTooltip>

      <!-- Settings -->
      <UTooltip :text="t('pages.editor.settings')" :delay-duration="0">
        <UPopover>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-settings"
            size="xs"
          >
            <span class="hidden lg:inline">{{ t('pages.editor.settings') }}</span>
          </UButton>
          <template #content>
            <div class="p-4 w-72 space-y-4">
              <div class="text-sm font-medium text-default mb-3">{{ t('pages.editor.pageSettings') }}</div>

              <UFormField :label="t('pages.fields.layout') || 'Layout'" name="layout">
                <USelect
                  :model-value="layout"
                  :items="layoutOptions"
                  value-key="value"
                  size="sm"
                  class="w-full"
                  @update:model-value="(val: any) => { emit('update:layout', val); emit('layout-change') }"
                />
              </UFormField>

              <UFormField :label="t('pages.fields.parent') || 'Parent'" name="parentId">
                <USelect
                  :model-value="parentId"
                  :items="parentOptions"
                  value-key="value"
                  :loading="pagesPending"
                  placeholder="None"
                  size="sm"
                  class="w-full"
                  @update:model-value="(val: string | null) => emit('update:parentId', val)"
                />
              </UFormField>
            </div>
          </template>
        </UPopover>
      </UTooltip>
    </UFieldGroup>

    <div class="flex-1" />

    <!-- Right group: AI, Preview, Open, Cancel/Delete/Save, Close -->
    <UFieldGroup>
      <!-- AI page generator (regular pages only, when crouton-ai is installed) -->
      <UTooltip v-if="isRegularPage && hasAi" :text="t('pages.editor.generateWithAI')" :delay-duration="0">
        <UButton
          variant="ghost"
          color="primary"
          icon="i-lucide-sparkles"
          size="xs"
          @click="emit('show-ai-generator')"
        >
          <span class="hidden lg:inline">{{ t('pages.editor.generate') }}</span>
        </UButton>
      </UTooltip>

      <!-- Preview -->
      <UTooltip :text="status === 'draft' ? t('pages.editor.previewDraft') : t('pages.editor.previewPage')" :delay-duration="0">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-eye"
          size="xs"
          @click="emit('show-preview')"
        >
          <span class="hidden lg:inline">{{ t('pages.editor.preview') }}</span>
        </UButton>
      </UTooltip>

      <!-- Open in public -->
      <UTooltip
        v-if="publicUrl"
        :text="status === 'published' ? t('pages.editor.openInPublic') : t('pages.editor.publishToOpen')"
        :delay-duration="0"
      >
        <UButton
          :to="status === 'published' ? publicUrl : undefined"
          :disabled="status !== 'published'"
          target="_blank"
          variant="ghost"
          color="neutral"
          icon="i-lucide-external-link"
          size="xs"
        >
          <span class="hidden lg:inline">{{ t('pages.editor.open') }}</span>
        </UButton>
      </UTooltip>

      <!-- Cancel (create mode) -->
      <UButton
        v-if="action === 'create'"
        color="error"
        variant="ghost"
        icon="i-lucide-x"
        size="xs"
        @click="emit('cancel')"
      >
        {{ t('common.cancel') }}
      </UButton>

      <!-- Delete (two-click confirm, edit mode) -->
      <CroutonConfirmButton
        v-if="action === 'update' && pageId"
        :label="t('common.delete')"
        :confirm-label="t('pages.editor.confirmDelete')"
        icon="i-lucide-trash-2"
        @confirm="emit('delete')"
      />

      <!-- Save -->
      <UButton
        type="submit"
        variant="soft"
        color="primary"
        size="xs"
        icon="i-lucide-save"
        :loading="isSaving"
      >
        {{ action === 'create' ? t('common.create') : t('common.save') }}
      </UButton>

      <!-- Close button (shown in inline editor context) -->
      <UButton
        v-if="showClose"
        variant="ghost"
        color="neutral"
        icon="i-lucide-x"
        size="xs"
        @click="emit('close')"
      />
    </UFieldGroup>
  </div>
</template>
