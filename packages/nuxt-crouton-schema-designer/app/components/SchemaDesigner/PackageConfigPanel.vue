<script setup lang="ts">
import type { PackageManifest, ConfigOption, PackageInstance } from '../../types/package-manifest'

interface Props {
  manifest: PackageManifest
  instance: PackageInstance
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
})

const emit = defineEmits<{
  'update:config': [key: string, value: unknown]
  'update:layerName': [name: string]
}>()

// Create a ref for the manifest to use with usePackageConfig
const manifestRef = computed(() => props.manifest)
const { visibleOptions, isOptionVisible, getEnabledCollections, getDisabledCollections } = usePackageConfig(manifestRef)

// Local state for layer name editing
const editingLayerName = ref(false)
const localLayerName = ref(props.instance.layerName)

// Watch for external changes
watch(() => props.instance.layerName, (newValue: string) => {
  localLayerName.value = newValue
})

function handleConfigChange(key: string, value: unknown) {
  emit('update:config', key, value)
}

function handleLayerNameSave() {
  emit('update:layerName', localLayerName.value)
  editingLayerName.value = false
}

function handleLayerNameCancel() {
  localLayerName.value = props.instance.layerName
  editingLayerName.value = false
}

function getOptionId(key: string): string {
  return `config-${props.manifest.id}-${key}`
}

// Get current config value for a key
function getConfigValue(key: string): unknown {
  return props.instance.configuration[key]
}
</script>

<template>
  <div :class="compact ? 'space-y-4' : 'space-y-6'">
    <!-- Package Header (hidden in compact mode) -->
    <div v-if="!compact" class="flex items-start gap-4 pb-4 border-b border-[var(--ui-border)]">
      <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--ui-bg-elevated)]">
        <UIcon
          :name="manifest.icon"
          class="text-2xl text-[var(--ui-primary)]"
        />
      </div>
      <div class="flex-1">
        <h3 class="text-lg font-semibold">{{ manifest.name }}</h3>
        <p class="text-sm text-[var(--ui-text-muted)]">{{ manifest.description }}</p>
        <p class="text-xs text-[var(--ui-text-dimmed)] mt-1">v{{ manifest.version }}</p>
      </div>
    </div>

    <!-- Layer Name -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium">Layer Name</label>
        <UBadge
          v-if="!manifest.layer.editable"
          color="warning"
          variant="subtle"
          size="xs"
        >
          <UIcon name="i-lucide-lock" class="mr-1" />
          Required
        </UBadge>
      </div>

      <div v-if="manifest.layer.editable && editingLayerName" class="flex items-center gap-2">
        <UInput
          v-model="localLayerName"
          placeholder="Enter layer name"
          size="sm"
          class="flex-1"
        />
        <UButton
          color="primary"
          variant="soft"
          size="xs"
          @click="handleLayerNameSave"
        >
          Save
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          @click="handleLayerNameCancel"
        >
          Cancel
        </UButton>
      </div>
      <div v-else class="flex items-center gap-2">
        <UInput
          :model-value="instance.layerName"
          :disabled="true"
          size="sm"
          class="flex-1"
        />
        <UButton
          v-if="manifest.layer.editable"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="editingLayerName = true"
        >
          <UIcon name="i-lucide-pencil" />
        </UButton>
      </div>
      <p
        v-if="manifest.layer.reason"
        class="text-xs text-[var(--ui-text-muted)]"
      >
        {{ manifest.layer.reason }}
      </p>
    </div>

    <!-- Configuration Options -->
    <div v-if="Object.keys(manifest.configuration).length > 0" class="space-y-4">
      <h4 class="text-sm font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide">
        Configuration
      </h4>

      <div
        v-for="(option, key) in manifest.configuration"
        :key="key"
        v-show="isOptionVisible(key)"
        class="space-y-2"
      >
        <!-- Boolean (Checkbox) -->
        <template v-if="(option as ConfigOption).type === 'boolean'">
          <div class="flex items-start gap-3 p-3 rounded-lg bg-[var(--ui-bg-elevated)]">
            <UCheckbox
              :id="getOptionId(key)"
              :model-value="getConfigValue(key) as boolean"
              @update:model-value="handleConfigChange(key, $event)"
            />
            <div class="flex-1">
              <label
                :for="getOptionId(key)"
                class="text-sm font-medium cursor-pointer"
              >
                {{ (option as ConfigOption).label }}
              </label>
              <p
                v-if="(option as ConfigOption).description"
                class="text-xs text-[var(--ui-text-muted)] mt-0.5"
              >
                {{ (option as ConfigOption).description }}
              </p>
            </div>
          </div>
        </template>

        <!-- String -->
        <template v-else-if="(option as ConfigOption).type === 'string'">
          <UFormField
            :label="(option as ConfigOption).label"
            :description="(option as ConfigOption).description"
          >
            <UInput
              :model-value="getConfigValue(key) as string"
              size="sm"
              @update:model-value="handleConfigChange(key, $event)"
            />
          </UFormField>
        </template>

        <!-- Number -->
        <template v-else-if="(option as ConfigOption).type === 'number'">
          <UFormField
            :label="(option as ConfigOption).label"
            :description="(option as ConfigOption).description"
          >
            <UInput
              type="number"
              :model-value="String(getConfigValue(key))"
              size="sm"
              @update:model-value="handleConfigChange(key, Number($event))"
            />
          </UFormField>
        </template>

        <!-- Select -->
        <template v-else-if="(option as ConfigOption).type === 'select'">
          <UFormField
            :label="(option as ConfigOption).label"
            :description="(option as ConfigOption).description"
          >
            <USelect
              :model-value="getConfigValue(key) as string"
              :items="(option as ConfigOption).options?.map(o => ({ label: o.label, value: o.value })) || []"
              size="sm"
              @update:model-value="handleConfigChange(key, $event)"
            />
          </UFormField>
        </template>

        <!-- Multi-select -->
        <template v-else-if="(option as ConfigOption).type === 'multiselect'">
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ (option as ConfigOption).label }}</label>
            <p
              v-if="(option as ConfigOption).description"
              class="text-xs text-[var(--ui-text-muted)]"
            >
              {{ (option as ConfigOption).description }}
            </p>
            <div class="space-y-2">
              <div
                v-for="selectOption in (option as ConfigOption).options"
                :key="selectOption.value"
                class="flex items-center gap-3 p-2 rounded-lg bg-[var(--ui-bg-elevated)]"
              >
                <UCheckbox
                  :id="`${getOptionId(key)}-${selectOption.value}`"
                  :model-value="(getConfigValue(key) as string[] || []).includes(selectOption.value)"
                  @update:model-value="(checked: boolean) => {
                    const current = getConfigValue(key) as string[] || []
                    if (checked) {
                      handleConfigChange(key, [...current, selectOption.value])
                    } else {
                      handleConfigChange(key, current.filter(v => v !== selectOption.value))
                    }
                  }"
                />
                <label
                  :for="`${getOptionId(key)}-${selectOption.value}`"
                  class="text-sm cursor-pointer"
                >
                  {{ selectOption.label }}
                </label>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Collections Preview -->
    <div class="space-y-3">
      <h4 class="text-sm font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide">
        Collections
      </h4>

      <!-- Enabled Collections -->
      <div
        v-for="collection in getEnabledCollections()"
        :key="collection.name"
        class="flex items-center gap-3 p-3 rounded-lg bg-[var(--ui-bg-elevated)]"
      >
        <div class="flex items-center justify-center w-8 h-8 rounded bg-[var(--ui-primary)]/10">
          <UIcon name="i-lucide-database" class="text-[var(--ui-primary)]" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium">{{ collection.name }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ collection.description }}</p>
        </div>
        <UBadge color="success" variant="subtle" size="xs">
          Enabled
        </UBadge>
      </div>

      <!-- Disabled Collections -->
      <div
        v-for="collection in getDisabledCollections()"
        :key="collection.name"
        class="flex items-center gap-3 p-3 rounded-lg bg-[var(--ui-bg-muted)] opacity-60"
      >
        <div class="flex items-center justify-center w-8 h-8 rounded bg-[var(--ui-border)]">
          <UIcon name="i-lucide-database" class="text-[var(--ui-text-muted)]" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium">{{ collection.name }}</p>
          <p class="text-xs text-[var(--ui-text-muted)]">{{ collection.description }}</p>
        </div>
        <UBadge color="neutral" variant="subtle" size="xs">
          <UIcon name="i-lucide-info" class="mr-1" />
          {{ collection.condition?.replace('config.', '') || 'Optional' }}
        </UBadge>
      </div>
    </div>

    <!-- Dependencies (hidden in compact mode) -->
    <div v-if="manifest.dependencies.length > 0 && !compact" class="space-y-2">
      <h4 class="text-sm font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide">
        Dependencies
      </h4>
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="dep in manifest.dependencies"
          :key="dep"
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ dep }}
        </UBadge>
      </div>
    </div>
  </div>
</template>
