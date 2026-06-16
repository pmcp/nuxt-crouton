<script setup lang="ts">
/**
 * PageTypePicker — vertically-stacked radio selector for the page type.
 *
 * Replaces the page-type dropdown in the editor's Settings panel with a clearer,
 * scannable list: each option is a full-width radio "card" showing icon + name +
 * a one-line description, so it's obvious what each type does at a glance (the
 * same visual language as the layout picker, stacked instead of in a grid).
 *
 * Descriptions come from the package that registers the page type
 * (`app.config.ts` → `croutonApps.<app>.pageTypes[].description`, an i18n key).
 * Options without one simply render name-only.
 *
 * @example
 * <CroutonPagesEditorPageTypePicker
 *   v-model="state.pageType"
 *   :options="pageTypeOptions"
 * />
 */

interface PageTypeOption {
  /** Full id, e.g. 'pages:regular'. */
  value: string
  label: string
  description?: string
  icon?: string
  disabled?: boolean
}

interface Props {
  /** Currently selected page-type full id. */
  modelValue: string
  options: PageTypeOption[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function select(option: PageTypeOption) {
  if (option.disabled || option.value === props.modelValue) return
  emit('update:modelValue', option.value)
}
</script>

<template>
  <div class="flex flex-col gap-2" role="radiogroup">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :disabled="option.disabled"
      :aria-checked="option.value === modelValue"
      :class="[
        'group flex items-start gap-3 rounded-lg border p-3 text-left transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-primary/60 hover:bg-elevated/50',
        option.value === modelValue
          ? 'border-primary ring-1 ring-primary bg-primary/5'
          : 'border-default bg-default'
      ]"
      @click="select(option)"
    >
      <!-- Icon chip -->
      <span
        :class="[
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
          option.value === modelValue ? 'bg-primary/10 text-primary' : 'bg-elevated text-muted'
        ]"
      >
        <UIcon :name="option.icon || 'i-lucide-file'" class="size-4" />
      </span>

      <!-- Name + description -->
      <span class="min-w-0 flex-1">
        <span :class="['block text-sm font-medium', option.value === modelValue ? 'text-primary' : 'text-default']">
          {{ option.label }}
        </span>
        <span v-if="option.description" class="mt-0.5 block text-xs leading-snug text-muted">
          {{ option.description }}
        </span>
      </span>

      <!-- Radio indicator -->
      <span
        :class="[
          'mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
          option.value === modelValue ? 'border-primary bg-primary text-inverted' : 'border-default'
        ]"
      >
        <span v-if="option.value === modelValue" class="size-1.5 rounded-full bg-current" />
      </span>
    </button>
  </div>
</template>
