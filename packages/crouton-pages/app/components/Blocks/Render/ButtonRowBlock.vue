<script setup lang="ts">
/**
 * Button Row Block Public Renderer
 *
 * Renders a row of link and download buttons in read-only mode.
 * Each button can be either a file download or a link (internal/external).
 *
 * NOTE: This component must NOT use top-level await (no async setup).
 * It is rendered via dynamic <component :is> inside BlockContent.vue
 * which has no <Suspense> boundary.
 */
import type { ButtonRowBlockAttrs, ButtonRowItem } from '../../../types/blocks'

interface Props {
  attrs: ButtonRowBlockAttrs
}

const props = defineProps<Props>()

const buttons = computed<ButtonRowItem[]>(() => {
  const raw = props.attrs.buttons
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) }
    catch { return [] }
  }
  return []
})

const alignClass = computed(() => {
  switch (props.attrs.align) {
    case 'center': return 'justify-center'
    case 'right': return 'justify-end'
    default: return 'justify-start'
  }
})
</script>

<template>
  <div class="button-row-block">
    <!-- No buttons configured -->
    <UAlert
      v-if="buttons.length === 0"
      color="neutral"
      icon="i-lucide-mouse-pointer-click"
      title="No buttons configured"
      description="Edit this block to add buttons."
    />

    <!-- Render button row -->
    <div
      v-else
      class="flex flex-wrap gap-3"
      :class="alignClass"
    >
      <template v-for="(btn, index) in buttons" :key="index">
        <!-- Download button -->
        <a
          v-if="btn.download && btn.file"
          :href="btn.file"
          download
          class="inline-flex items-center gap-2"
        >
          <UButton
            :label="btn.label || 'Download'"
            :color="btn.color || 'primary'"
            :variant="btn.variant || 'solid'"
            :icon="btn.icon || 'i-lucide-download'"
            tag="span"
          />
        </a>

        <!-- Link button -->
        <UButton
          v-else
          :label="btn.label || 'Button'"
          :to="btn.to || undefined"
          :target="btn.external ? '_blank' : undefined"
          :color="btn.color || 'primary'"
          :variant="btn.variant || 'solid'"
          :icon="btn.icon || undefined"
        />
      </template>
    </div>
  </div>
</template>
