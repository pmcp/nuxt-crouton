<script setup lang="ts">
// Public permalink — no auth. Renders one published post; 404 for unknown/draft.
definePageMeta({ layout: false })

interface BlogPost {
  id: string
  title: string
  slug: string
  body?: string | null
  author?: string | null
  publishedAt?: string | null
  status: string
  tags?: string[] | null
}

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: post, error } = await useFetch<BlogPost>(
  () => `/api/blog/${slug.value}`
)

if (error.value || !post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Post not found',
    fatal: true
  })
}

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

useHead(() => ({ title: post.value?.title ?? 'Post' }))
</script>

<template>
  <div class="min-h-screen bg-(--ui-bg)">
    <article
      v-if="post"
      class="mx-auto max-w-3xl px-6 py-16 motion-safe:animate-[fade-in_0.4s_ease-out]"
    >
      <UButton
        to="/blog"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        class="mb-8"
      >
        Back to blog
      </UButton>

      <header class="mb-8">
        <h1 class="text-4xl font-bold tracking-tight text-(--ui-text-highlighted)">
          {{ post.title }}
        </h1>

        <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--ui-text-muted)">
          <span v-if="post.author">{{ post.author }}</span>
          <template v-if="post.author && formatDate(post.publishedAt)">
            <USeparator orientation="vertical" class="h-4" />
          </template>
          <time v-if="formatDate(post.publishedAt)" :datetime="post.publishedAt ?? undefined">
            {{ formatDate(post.publishedAt) }}
          </time>
        </div>

        <div v-if="post.tags?.length" class="mt-4 flex flex-wrap gap-2">
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
      </header>

      <USeparator class="mb-8" />

      <div
        v-if="post.body"
        class="whitespace-pre-wrap text-base leading-relaxed text-(--ui-text-toned)"
      >
        {{ post.body }}
      </div>
    </article>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
