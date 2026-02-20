<script setup lang="ts">
const layers = [
  {
    name: 'shop',
    description: 'E-commerce domain',
    collections: [
      { name: 'products', fields: ['string', 'text', 'decimal', 'number', 'boolean', 'image', 'array'] },
      { name: 'categories', fields: ['string', 'text', 'image', 'hierarchy'] },
      { name: 'orders', fields: ['string', 'date', 'json', 'reference', 'decimal', 'boolean', 'number'] }
    ]
  },
  {
    name: 'content',
    description: 'Content publishing domain',
    collections: [
      { name: 'articles', fields: ['string', 'text', 'date', 'boolean', 'image', 'reference', 'file'] },
      { name: 'testimonials', fields: ['string', 'text', 'number', 'boolean', 'image'] }
    ]
  },
  {
    name: 'people',
    description: 'Contact management domain',
    collections: [
      { name: 'contacts', fields: ['string', 'text', 'image', 'file', 'boolean', 'json', 'array', 'date'] }
    ]
  },
  {
    name: 'projects',
    description: 'Project & task management domain',
    collections: [
      { name: 'tasks', fields: ['string', 'text', 'date', 'boolean', 'number', 'reference', 'repeater'] }
    ]
  }
]

const allFieldTypes = ['string', 'text', 'number', 'decimal', 'boolean', 'date', 'json', 'repeater', 'array', 'reference', 'image', 'file']

const modules = [
  { name: 'crouton-core', description: 'Auth, admin panel, i18n' },
  { name: 'crouton-assets', description: 'Asset picker & uploader' },
  { name: 'crouton-editor', description: 'Rich text (Tiptap)' },
  { name: 'crouton-ai', description: 'AI translation & generation' },
  { name: 'crouton-charts', description: 'Data visualizations' },
  { name: 'crouton-collab', description: 'Real-time collaboration (Yjs)' },
  { name: 'crouton-flow', description: 'Graph / DAG visualization' },
  { name: 'crouton-maps', description: 'Map integration' },
  { name: 'crouton-pages', description: 'Page builder' },
  { name: 'crouton-bookings', description: 'Booking management' }
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
    <div class="max-w-6xl mx-auto space-y-10">
      <!-- Header -->
      <div class="text-center space-y-3">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
          Crouton Playground
        </h1>
        <p class="text-lg text-gray-500 dark:text-gray-400">
          Comprehensive demo of every field type and module in the crouton ecosystem
        </p>
      </div>

      <!-- Field Types Coverage -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">All 12 Field Types</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="ft in allFieldTypes"
            :key="ft"
            color="primary"
            variant="soft"
            size="lg"
          >
            {{ ft }}
          </UBadge>
        </div>
      </UCard>

      <!-- Layers & Collections -->
      <div>
        <h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
          4 Layers · 7 Collections · 50 Records Each
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UCard v-for="layer in layers" :key="layer.name">
            <template #header>
              <div class="flex items-center gap-2">
                <UBadge color="neutral" variant="outline">{{ layer.name }}</UBadge>
                <span class="text-sm text-gray-500">{{ layer.description }}</span>
              </div>
            </template>
            <div class="space-y-3">
              <div v-for="col in layer.collections" :key="col.name" class="space-y-1">
                <p class="font-medium text-sm">{{ col.name }}</p>
                <div class="flex flex-wrap gap-1">
                  <UBadge
                    v-for="f in col.fields"
                    :key="f"
                    size="xs"
                    color="success"
                    variant="soft"
                  >
                    {{ f }}
                  </UBadge>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Modules -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Modules (All Enabled)</h2>
        </template>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div
            v-for="mod in modules"
            :key="mod.name"
            class="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <UIcon name="i-heroicons-check-circle" class="text-green-500 mt-0.5 shrink-0" />
            <div>
              <p class="font-medium text-sm">{{ mod.name }}</p>
              <p class="text-xs text-gray-500">{{ mod.description }}</p>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
