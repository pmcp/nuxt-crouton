<script setup lang="ts">
// Public blog index — no auth. Lists published posts newest-first.
definePageMeta({ layout: false })

interface BlogPostListItem {
  id: string
  title: string
  slug: string
  body?: string | null
  author?: string | null
  publishedAt?: string | null
  status: string
  tags?: string[] | null
}

const { data: posts, pending } = await useFetch<BlogPostListItem[]>('/api/blog', {
  default: () => []
})

const dateFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

function formatDate(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
}

function excerpt(body?: string | null): string {
  if (!body) return ''
  const text = body.trim()
  return text.length > 220 ? `${text.slice(0, 220).trimEnd()}…` : text
}

useHead({ title: 'Blog' })
</script>

<template>
  <div class="min-h-screen bg-(--ui-bg)">
    <div class="mx-auto max-w-3xl px-6 py-16">
      <header class="mb-12">
        <h1 class="text-4xl font-bold tracking-tight text-(--ui-text-highlighted)">
          Blog
        </h1>
        <p class="mt-2 text-(--ui-text-muted)">
          Thoughts, notes, and updates.
        </p>
      </header>

      <div v-if="pending" class="space-y-6">
        <USkeleton v-for="n in 3" :key="n" class="h-40 w-full" />
      </div>

      <div
        v-else-if="!posts.length"
        class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-(--ui-border) py-20 text-center"
      >
        <UIcon name="i-lucide-newspaper" class="size-10 text-(--ui-text-dimmed)" />
        <p class="text-(--ui-text-muted)">
          No posts published yet. Check back soon.
        </p>
      </div>

      <div v-else class="flex flex-col gap-6">
        <ULink
          v-for="post in posts"
          :key="post.id"
          :to="`/blog/${post.slug}`"
          class="block"
        >
          <UCard
            class="transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div class="flex flex-col gap-3">
              <h2 class="text-xl font-semibold text-(--ui-text-highlighted)">
                {{ post.title }}
              </h2>

              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--ui-text-muted)">
                <span v-if="post.author">{{ post.author }}</span>
                <template v-if="post.author && formatDate(post.publishedAt)">
                  <USeparator orientation="vertical" class="h-4" />
                </template>
                <time v-if="formatDate(post.publishedAt)" :datetime="post.publishedAt ?? undefined">
                  {{ formatDate(post.publishedAt) }}
                </time>
              </div>

              <div v-if="post.tags?.length" class="flex flex-wrap gap-2">
                <UBadge
                  v-for="tag in post.tags"
                  :key="tag"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ tag }}
                </UBadge>
              </div>

              <p v-if="excerpt(post.body)" class="text-(--ui-text-muted)">
                {{ excerpt(post.body) }}
              </p>
            </div>
          </UCard>
        </ULink>
      </div>
    </div>
  </div>
</template>
