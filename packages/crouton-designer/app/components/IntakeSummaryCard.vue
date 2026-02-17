<script setup lang="ts">
import type { ProjectConfig } from '../types/schema'

const props = defineProps<{
  config: ProjectConfig
}>()

const emit = defineEmits<{
  'update:config': [config: Partial<ProjectConfig>]
}>()

const { t } = useT()
const appConfig = useAppConfig()
const croutonModules = ((appConfig.crouton as any)?.modules ?? []) as Array<{ alias: string, description: string, aiHint: string | null }>

// Track which field is being edited
const editingField = ref<string | null>(null)
const editValue = ref('')

const appTypeOptions = computed(() => [
  { label: t('designer.appTypes.saas'), value: 'saas' },
  { label: t('designer.appTypes.cms'), value: 'cms' },
  { label: t('designer.appTypes.internal-tool'), value: 'internal-tool' },
  { label: t('designer.appTypes.marketplace'), value: 'marketplace' },
  { label: t('designer.appTypes.social'), value: 'social' },
  { label: t('designer.appTypes.ecommerce'), value: 'ecommerce' },
  { label: t('designer.appTypes.other'), value: 'other' }
])

const authTypeOptions = computed(() => [
  { label: t('designer.authTypes.email-password'), value: 'email-password' },
  { label: t('designer.authTypes.oauth'), value: 'oauth' },
  { label: t('designer.authTypes.both'), value: 'both' }
])

// Build package list from manifest-injected module registry (only packages with AI hints)
const availablePackages = computed(() =>
  croutonModules
    .filter(mod => mod.aiHint)
    .map(mod => ({
      label: t(`designer.packageLabels.crouton-${mod.alias}`, mod.description),
      value: `crouton-${mod.alias}`
    }))
)

function startEdit(field: string, currentValue: string) {
  editingField.value = field
  editValue.value = currentValue || ''
  nextTick(() => {
    const input = document.querySelector(`[data-edit-field="${field}"] input`) as HTMLInputElement
    input?.focus()
  })
}

function commitEdit(field: string) {
  if (editingField.value !== field) return
  emit('update:config', { [field]: editValue.value })
  editingField.value = null
}

function cancelEdit() {
  editingField.value = null
}

function handleEditKeydown(e: KeyboardEvent, field: string) {
  if (e.key === 'Enter') {
    commitEdit(field)
  } else if (e.key === 'Escape') {
    cancelEdit()
  }
}

function updateSelect(field: string, value: string) {
  emit('update:config', { [field]: value })
}

function toggleMultiTenant() {
  emit('update:config', { multiTenant: !props.config.multiTenant })
}

function togglePackage(pkg: string) {
  const current = props.config.packages || []
  const updated = current.includes(pkg)
    ? current.filter((p: string) => p !== pkg)
    : [...current, pkg]
  emit('update:config', { packages: updated })
}

interface ConfigField {
  key: string
  label: string
  icon: string
  type: 'text' | 'select' | 'toggle' | 'tags'
}

const fields = computed<ConfigField[]>(() => [
  { key: 'name', label: t('designer.intake.appName'), icon: 'i-lucide-app-window', type: 'text' },
  { key: 'description', label: t('designer.intake.description'), icon: 'i-lucide-file-text', type: 'text' },
  { key: 'appType', label: t('designer.intake.appType'), icon: 'i-lucide-layout-grid', type: 'select' },
  { key: 'authType', label: t('designer.intake.authentication'), icon: 'i-lucide-shield', type: 'select' },
  { key: 'multiTenant', label: t('designer.intake.multiTenant'), icon: 'i-lucide-building-2', type: 'toggle' },
  { key: 'defaultLocale', label: t('designer.intake.defaultLocale'), icon: 'i-lucide-globe', type: 'text' }
])
</script>

<template>
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-1">
      {{ t('designer.intake.appConfiguration') }}
    </h3>
    <p class="text-sm text-[var(--ui-text-muted)] mb-6">
      {{ t('designer.intake.clickToEdit') }}
    </p>

    <div class="space-y-4">
      <!-- Text fields: name, description, defaultLocale -->
      <template v-for="field in fields" :key="field.key">
        <!-- Text editable field -->
        <div v-if="field.type === 'text'" class="group">
          <label class="text-xs font-medium text-[var(--ui-text-muted)] mb-1 flex items-center gap-1.5">
            <UIcon :name="field.icon" class="size-3.5" />
            {{ field.label }}
          </label>
          <div
            v-if="editingField !== field.key"
            class="px-3 py-2 rounded-md border border-transparent hover:border-[var(--ui-border)] cursor-pointer transition-colors min-h-9 flex items-center"
            @click="startEdit(field.key, (config as any)[field.key] || '')"
          >
            <span v-if="(config as any)[field.key]" class="text-sm">
              {{ (config as any)[field.key] }}
            </span>
            <span v-else class="text-sm text-[var(--ui-text-muted)] italic">
              {{ t('designer.intake.notSet') }}
            </span>
            <UIcon
              name="i-lucide-pencil"
              class="size-3.5 ml-auto text-[var(--ui-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
          <div v-else :data-edit-field="field.key">
            <UInput
              v-model="editValue"
              size="sm"
              autofocus
              @keydown="(e: KeyboardEvent) => handleEditKeydown(e, field.key)"
              @blur="commitEdit(field.key)"
            />
          </div>
        </div>

        <!-- Select field: appType, authType -->
        <div v-else-if="field.type === 'select'" class="group">
          <label class="text-xs font-medium text-[var(--ui-text-muted)] mb-1 flex items-center gap-1.5">
            <UIcon :name="field.icon" class="size-3.5" />
            {{ field.label }}
          </label>
          <USelectMenu
            :model-value="(config as any)[field.key]"
            :items="field.key === 'appType' ? appTypeOptions : authTypeOptions"
            value-key="value"
            :placeholder="t('designer.intake.notSet')"
            size="sm"
            class="w-full"
            @update:model-value="(v: string) => updateSelect(field.key, v)"
          />
        </div>

        <!-- Toggle field: multiTenant -->
        <div v-else-if="field.type === 'toggle'" class="group">
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium text-[var(--ui-text-muted)] flex items-center gap-1.5">
              <UIcon :name="field.icon" class="size-3.5" />
              {{ field.label }}
            </label>
            <USwitch
              :model-value="config.multiTenant ?? false"
              size="sm"
              @update:model-value="toggleMultiTenant"
            />
          </div>
          <p class="text-xs text-[var(--ui-text-muted)] mt-0.5">
            {{ t('designer.intake.supportMultipleTeams') }}
          </p>
        </div>
      </template>

      <!-- Languages -->
      <div>
        <label class="text-xs font-medium text-[var(--ui-text-muted)] mb-1 flex items-center gap-1.5">
          <UIcon name="i-lucide-languages" class="size-3.5" />
          {{ t('designer.intake.languages') }}
        </label>
        <div class="flex flex-wrap gap-1.5 mt-1">
          <UBadge
            v-for="lang in (config.languages || [])"
            :key="lang"
            variant="subtle"
            size="sm"
          >
            {{ lang }}
          </UBadge>
          <span v-if="!config.languages?.length" class="text-sm text-[var(--ui-text-muted)] italic px-1">
            {{ t('designer.intake.notSet') }}
          </span>
        </div>
      </div>

      <!-- Packages -->
      <div>
        <label class="text-xs font-medium text-[var(--ui-text-muted)] mb-2 flex items-center gap-1.5">
          <UIcon name="i-lucide-package" class="size-3.5" />
          {{ t('designer.intake.packages') }}
        </label>
        <div class="grid grid-cols-2 gap-2 mt-1">
          <button
            v-for="pkg in availablePackages"
            :key="pkg.value"
            class="flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-left transition-colors"
            :class="(config.packages || []).includes(pkg.value)
              ? 'border-[var(--ui-color-primary-500)] bg-[var(--ui-color-primary-50)]'
              : 'border-[var(--ui-border)] hover:border-[var(--ui-border-hover)]'"
            @click="togglePackage(pkg.value)"
          >
            <UIcon
              :name="(config.packages || []).includes(pkg.value) ? 'i-lucide-check-square' : 'i-lucide-square'"
              class="size-4 shrink-0"
              :class="(config.packages || []).includes(pkg.value) ? 'text-[var(--ui-color-primary-500)]' : 'text-[var(--ui-text-muted)]'"
            />
            {{ pkg.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Config completeness indicator -->
    <div class="mt-6 pt-4 border-t border-[var(--ui-border)]">
      <div class="flex items-center gap-2 text-sm">
        <UIcon
          :name="config.name && config.appType ? 'i-lucide-check-circle' : 'i-lucide-circle'"
          class="size-4"
          :class="config.name && config.appType ? 'text-green-500' : 'text-[var(--ui-text-muted)]'"
        />
        <span :class="config.name && config.appType ? 'text-green-600' : 'text-[var(--ui-text-muted)]'">
          {{ config.name && config.appType ? t('designer.intake.readyToContinue') : t('designer.intake.setNameTypeToContinue') }}
        </span>
      </div>
    </div>
  </div>
</template>
