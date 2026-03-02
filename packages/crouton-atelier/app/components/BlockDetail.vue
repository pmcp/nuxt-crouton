<script setup lang="ts">
import type { Block } from '../types/blocks'

interface Props {
  block: Block | null
}

const props = defineProps<Props>()

const isOpen = defineModel<boolean>({ default: false })

const fieldTypeIcons: Record<string, string> = {
  string: 'i-lucide-type',
  text: 'i-lucide-file-text',
  number: 'i-lucide-hash',
  boolean: 'i-lucide-toggle-left',
  date: 'i-lucide-calendar',
  json: 'i-lucide-braces',
  repeater: 'i-lucide-layers',
  array: 'i-lucide-list',
  reference: 'i-lucide-link',
  image: 'i-lucide-image',
  file: 'i-lucide-paperclip'
}
</script>

<template>
  <USlideover v-model:open="isOpen">
    <template #content="{ close }">
      <div v-if="block" class="flex flex-col h-full">
        <!-- Header -->
        <div class="flex items-center gap-3 p-4 border-b border-default">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UIcon :name="block.icon" class="w-5 h-5 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-lg">{{ block.label }}</h3>
            <p class="text-sm text-muted truncate">{{ block.description }}</p>
          </div>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="close" />
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6">
          <!-- Package info -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted">Package:</span>
            <UBadge variant="subtle" color="neutral" size="xs">
              {{ block.package }}
            </UBadge>
          </div>

          <!-- Collections -->
          <div v-if="block.collections.length > 0">
            <div
              v-for="col in block.collections"
              :key="col.name"
              class="mb-4"
            >
              <div class="flex items-center gap-2 mb-2">
                <UIcon name="i-lucide-database" class="w-4 h-4 text-muted" />
                <span class="font-medium text-sm">{{ col.name }}</span>
                <UBadge
                  v-if="col.seedCount"
                  variant="subtle"
                  color="primary"
                  size="xs"
                >
                  {{ col.seedCount }} seed rows
                </UBadge>
              </div>

              <!-- Fields table -->
              <div class="rounded-lg border border-default overflow-hidden">
                <div
                  v-for="(field, i) in col.fields"
                  :key="field.name"
                  class="flex items-center gap-3 px-3 py-2 text-sm"
                  :class="i > 0 ? 'border-t border-default' : ''"
                >
                  <UIcon
                    :name="fieldTypeIcons[field.type] ?? 'i-lucide-circle'"
                    class="w-3.5 h-3.5 text-muted shrink-0"
                  />
                  <span class="font-mono text-xs flex-1">{{ field.name }}</span>
                  <UBadge variant="outline" color="neutral" size="xs">
                    {{ field.type }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>

          <!-- No collections -->
          <div
            v-else
            class="text-sm text-muted bg-muted/30 rounded-lg p-4 text-center"
          >
            This block uses features from its package — no custom collections needed.
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
