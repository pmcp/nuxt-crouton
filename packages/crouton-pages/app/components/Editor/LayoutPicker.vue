<script setup lang="ts">
/**
 * LayoutPicker — visual layout/template selector for the page editor.
 *
 * Replaces the plain "Default" layout dropdown with a small grid of selectable
 * cards: each shows a simple wireframe thumbnail + icon + label + one-line
 * description, so the choice is visual instead of a faceless dropdown value.
 *
 * Drop-in for the old `<USelect :items="layoutOptions">`: same `model-value`
 * (the layout `value` string) and emits both `update:model-value` and the
 * existing `layout-change` so the live preview re-renders exactly as before.
 *
 * @example
 * <CroutonPagesEditorLayoutPicker
 *   v-model="state.layout"
 *   :options="layoutOptions"
 *   @layout-change="onLayoutChange"
 * />
 */

interface LayoutOption {
  value: string
  label: string
  disabled?: boolean
}

interface Props {
  /** Currently selected layout value (e.g. 'default'). */
  modelValue: string
  /** Layout options — the same `layoutOptions` the toolbar used. */
  options: LayoutOption[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'layout-change': []
}>()

const { t } = useT()

/**
 * Presentation metadata per known layout value: an icon and a tiny wireframe
 * recipe (which bars to show). Unknown values fall back to the generic entry so
 * a newly-added layout never breaks the picker — it just renders plainly.
 */
interface LayoutVisual {
  icon: string
  /** Wireframe regions, top to bottom, suggesting the layout's chrome. */
  wireframe: {
    header?: boolean
    nav?: boolean
    footer?: boolean
    /** How much vertical space the body fills: 'normal' | 'tall' | 'full'. */
    body: 'normal' | 'tall' | 'full'
  }
  /** i18n key for the one-line description (falls back to plain text). */
  descriptionKey: string
}

const LAYOUT_VISUALS: Record<string, LayoutVisual> = {
  'default': {
    icon: 'i-lucide-panels-top-left',
    wireframe: { header: true, nav: true, footer: true, body: 'normal' },
    descriptionKey: 'pages.layoutDescriptions.default'
  },
  'full-height': {
    icon: 'i-lucide-rectangle-vertical',
    wireframe: { header: true, body: 'tall' },
    descriptionKey: 'pages.layoutDescriptions.fullHeight'
  },
  'full-screen': {
    icon: 'i-lucide-maximize',
    wireframe: { body: 'full' },
    descriptionKey: 'pages.layoutDescriptions.fullScreen'
  }
}

const FALLBACK_VISUAL: LayoutVisual = {
  icon: 'i-lucide-layout-template',
  wireframe: { header: true, body: 'normal' },
  descriptionKey: ''
}

function visualFor(value: string): LayoutVisual {
  return LAYOUT_VISUALS[value] ?? FALLBACK_VISUAL
}

function descriptionFor(value: string): string {
  const key = visualFor(value).descriptionKey
  return key ? t(key) : ''
}

function select(option: LayoutOption) {
  if (option.disabled || option.value === props.modelValue) return
  emit('update:modelValue', option.value)
  emit('layout-change')
}
</script>

<template>
  <div class="grid grid-cols-3 gap-2">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :disabled="option.disabled"
      :aria-pressed="option.value === modelValue"
      :class="[
        'group relative flex flex-col items-center gap-2 rounded-lg border p-2.5 text-center transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-primary/60 hover:bg-elevated/50',
        option.value === modelValue
          ? 'border-primary ring-1 ring-primary bg-primary/5'
          : 'border-default bg-default'
      ]"
      @click="select(option)"
    >
      <!-- Selected check badge -->
      <span
        v-if="option.value === modelValue"
        class="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-inverted"
      >
        <UIcon name="i-lucide-check" class="size-3" />
      </span>

      <!-- Wireframe thumbnail -->
      <span
        class="flex h-14 w-full flex-col gap-1 overflow-hidden rounded-md border border-default bg-muted/40 p-1.5"
        aria-hidden="true"
      >
        <span
          v-if="visualFor(option.value).wireframe.header"
          class="h-1.5 w-2/3 rounded-full bg-current opacity-40"
        />
        <span
          v-if="visualFor(option.value).wireframe.nav"
          class="flex gap-1"
        >
          <span class="h-1 w-4 rounded-full bg-current opacity-25" />
          <span class="h-1 w-4 rounded-full bg-current opacity-25" />
          <span class="h-1 w-4 rounded-full bg-current opacity-25" />
        </span>
        <span
          :class="[
            'w-full rounded bg-current opacity-10',
            visualFor(option.value).wireframe.body === 'full' ? 'flex-1'
              : visualFor(option.value).wireframe.body === 'tall' ? 'flex-1' : 'h-5'
          ]"
        />
        <span
          v-if="visualFor(option.value).wireframe.footer"
          class="mt-auto h-1.5 w-1/2 rounded-full bg-current opacity-30"
        />
      </span>

      <!-- Icon + label -->
      <span class="flex items-center gap-1.5">
        <UIcon
          :name="visualFor(option.value).icon"
          :class="['size-3.5', option.value === modelValue ? 'text-primary' : 'text-muted']"
        />
        <span :class="['text-xs font-medium', option.value === modelValue ? 'text-primary' : 'text-default']">
          {{ option.label }}
        </span>
      </span>

      <!-- One-line description -->
      <span v-if="descriptionFor(option.value)" class="text-[10px] leading-tight text-muted">
        {{ descriptionFor(option.value) }}
      </span>
    </button>
  </div>
</template>
