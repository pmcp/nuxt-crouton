<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  collection: string
  layout?: 'list' | 'grid'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'list'
})

const isOpen = ref(false)

// Code examples for each layout type
const codeExamples = {
  list: `<script setup lang="ts">
interface Props {
  item: any
  layout: 'list' | 'grid'
  collection: string
  size?: 'compact' | 'comfortable' | 'spacious'
}
defineProps<Props>()
<\/script>

<template>
  <div v-if="layout === 'list'" class="flex items-center gap-3">
    <div class="flex-1">
      <span class="font-medium">{{ item.name }}</span>
      <span class="text-muted text-sm ml-2">{{ item.description }}</span>
    </div>
  </div>
</template>`,
  grid: `<script setup lang="ts">
interface Props {
  item: any
  layout: 'list' | 'grid'
  collection: string
  size?: 'compact' | 'comfortable' | 'spacious'
}
const props = defineProps<Props>()
<\/script>

<template>
  <div
    v-if="layout === 'grid'"
    :class="[
      'rounded-lg border hover:shadow-md transition-shadow',
      size === 'spacious' ? 'p-4' : 'p-3'
    ]"
  >
    <h3 class="font-medium truncate">{{ item.title }}</h3>
    <p class="text-sm text-muted mt-1">{{ item.description }}</p>
    <div v-if="size === 'spacious'" class="flex gap-2 mt-3">
      <UBadge>{{ item.status }}</UBadge>
    </div>
  </div>
</template>`
}

const currentExample = computed(() => codeExamples[props.layout])
</script>

<template>
  <div>
    <UButton
      color="neutral"
      variant="ghost"
      size="xs"
      icon="i-lucide-info"
      class="opacity-60 hover:opacity-100"
      @click="isOpen = true"
    />

    <UModal v-model:open="isOpen">
    <template #content>
      <div class="p-6 max-w-lg">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-default">
              Customize Card Display
            </h3>
            <p class="text-sm text-muted mt-1">
              Create a custom Card.vue component for this collection
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            @click="isOpen = false"
          />
        </div>

        <div class="space-y-4">
          <div>
            <p class="text-sm font-medium text-default mb-2">
              File location:
            </p>
            <code class="text-xs bg-muted/30 px-2 py-1.5 rounded block overflow-x-auto">
              layers/{layer}/collections/{{ collection }}/app/components/Card.vue
            </code>
          </div>

          <div>
            <p class="text-sm font-medium text-default mb-2">
              Example for {{ layout }} layout:
            </p>
            <pre class="text-xs bg-muted/20 p-3 rounded overflow-auto max-h-64 font-mono">{{ currentExample }}</pre>
          </div>

          <div class="bg-info/10 border border-info/20 rounded-lg p-3">
            <p class="text-xs text-info">
              <strong>Tip:</strong> Your Card.vue receives <code class="bg-info/20 px-1 rounded">item</code>, <code class="bg-info/20 px-1 rounded">layout</code>, <code class="bg-info/20 px-1 rounded">collection</code>, and <code class="bg-info/20 px-1 rounded">size</code> props. Handle both layouts (list, grid) in one component. The <code class="bg-info/20 px-1 rounded">size</code> prop controls grid density (compact, comfortable, spacious).
            </p>
          </div>
        </div>

        <div class="flex justify-end mt-6">
          <UButton
            color="neutral"
            variant="outline"
            @click="isOpen = false"
          >
            Got it
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
  </div>
</template>
