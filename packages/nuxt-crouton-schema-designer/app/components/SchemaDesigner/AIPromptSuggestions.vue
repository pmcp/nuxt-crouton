<script setup lang="ts">
const emit = defineEmits<{
  select: [prompt: string]
}>()

const suggestions = [
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
    title: 'Events',
    prompt: 'Create an events collection with title, description, start/end dates, location, and organizer',
    icon: 'i-lucide-calendar'
  },
  {
    title: 'Tasks / Todos',
    prompt: 'Create a tasks collection with title, description, due date, priority, status, and assignee',
    icon: 'i-lucide-check-square'
  },
  {
    title: 'FAQ Items',
    prompt: 'Create a FAQ collection with question, answer, category, and display order',
    icon: 'i-lucide-help-circle'
  }
]
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-[var(--ui-text-muted)]">
      Try one of these examples to get started:
    </p>

    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="suggestion in suggestions"
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
</template>
