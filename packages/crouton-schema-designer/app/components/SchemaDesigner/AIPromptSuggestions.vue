<script setup lang="ts">
const emit = defineEmits<{
  select: [prompt: string]
}>()

// App-level suggestions (trigger package recommendations)
const appSuggestions = [
  {
    title: 'Tennis Club Booking',
    prompt: 'I want to build a tennis club booking system where members can reserve courts',
    icon: 'i-lucide-calendar-check',
    highlight: true
  },
  {
    title: 'Food Festival POS',
    prompt: 'I need a point of sale system for a food festival with multiple vendors',
    icon: 'i-lucide-shopping-cart',
    highlight: true
  },
  {
    title: 'Appointment Scheduler',
    prompt: 'Build an appointment booking system for a hair salon with multiple stylists',
    icon: 'i-lucide-clock',
    highlight: true
  },
  {
    title: 'Equipment Rental',
    prompt: 'Create a system for renting out camping equipment with availability tracking',
    icon: 'i-lucide-tent',
    highlight: true
  }
]

// Collection-level suggestions
const collectionSuggestions = [
  {
    title: 'E-commerce Products',
    prompt: 'Create a products collection for an online store with name, description, price, images, and category',
    icon: 'i-lucide-shopping-bag'
  },
  {
    title: 'Blog Posts',
    prompt: 'Create a blog posts collection with title, content, author, published date, featured image, and tags',
    icon: 'i-lucide-file-text'
  },
  {
    title: 'User Profiles',
    prompt: 'Create a user profiles collection with name, email, avatar, bio, and social media links',
    icon: 'i-lucide-users'
  },
  {
    title: 'Tasks / Todos',
    prompt: 'Create a tasks collection with title, description, due date, priority, status, and assignee',
    icon: 'i-lucide-check-square'
  }
]
</script>

<template>
  <div class="space-y-6">
    <!-- App-level suggestions (with packages) -->
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-sparkles" class="text-[var(--ui-primary)]" />
        <p class="text-sm font-medium">Build a complete app:</p>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="suggestion in appSuggestions"
          :key="suggestion.title"
          class="flex items-start gap-3 p-3 text-left border rounded-lg
                 border-[var(--ui-primary)]/30 bg-[var(--ui-primary)]/5
                 hover:border-[var(--ui-primary)] hover:bg-[var(--ui-primary)]/10
                 transition-all duration-200 group"
          @click="emit('select', suggestion.prompt)"
        >
          <div class="p-2 rounded-lg bg-[var(--ui-primary)]/10 group-hover:bg-[var(--ui-primary)]/20 transition-colors">
            <UIcon
              :name="suggestion.icon"
              class="text-lg text-[var(--ui-primary)]"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm">{{ suggestion.title }}</div>
            <div class="text-xs text-[var(--ui-text-muted)] line-clamp-2 mt-0.5">
              {{ suggestion.prompt }}
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Collection-level suggestions -->
    <div class="space-y-3">
      <p class="text-sm text-[var(--ui-text-muted)]">
        Or create a single collection:
      </p>

      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="suggestion in collectionSuggestions"
          :key="suggestion.title"
          class="flex items-start gap-3 p-3 text-left border border-[var(--ui-border)] rounded-lg
                 hover:border-[var(--ui-primary)] hover:bg-[var(--ui-bg-elevated)]
                 transition-all duration-200 group"
          @click="emit('select', suggestion.prompt)"
        >
          <div class="p-2 rounded-lg bg-[var(--ui-bg-elevated)] group-hover:bg-[var(--ui-primary)]/10 transition-colors">
            <UIcon
              :name="suggestion.icon"
              class="text-lg text-[var(--ui-text-muted)] group-hover:text-[var(--ui-primary)] transition-colors"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm">{{ suggestion.title }}</div>
            <div class="text-xs text-[var(--ui-text-muted)] line-clamp-2 mt-0.5">
              {{ suggestion.prompt }}
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
