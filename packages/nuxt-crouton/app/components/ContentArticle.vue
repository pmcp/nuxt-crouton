<script setup lang="ts">
interface Author {
  name: string
  avatar?: string
  description?: string
}

interface Props {
  title: string
  description?: string
  author?: Author
  date?: Date | string
  image?: string
  imageAlt?: string
  content?: string
  tags?: string[]
  readingTime?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: '3xl'
})

const formattedDate = computed(() => {
  if (!props.date) return null
  const d = typeof props.date === 'string' ? new Date(props.date) : props.date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl'
}
</script>

<template>
  <article :class="[maxWidthClasses[maxWidth], 'mx-auto px-4 sm:px-6 lg:px-8']">
    <!-- Article Header -->
    <header class="mb-8 lg:mb-12">
      <slot name="header">
        <!-- Tags -->
        <div v-if="tags?.length" class="flex flex-wrap gap-2 mb-4">
          <UBadge
            v-for="tag in tags"
            :key="tag"
            :label="tag"
            variant="subtle"
            size="sm"
          />
        </div>

        <!-- Title -->
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
          {{ title }}
        </h1>

        <!-- Description / Excerpt -->
        <p v-if="description" class="mt-4 text-lg sm:text-xl text-muted">
          {{ description }}
        </p>

        <!-- Meta: Author, Date, Reading Time -->
        <div class="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
          <!-- Author -->
          <div v-if="author" class="flex items-center gap-3">
            <UAvatar
              v-if="author.avatar"
              :src="author.avatar"
              :alt="author.name"
              size="sm"
            />
            <div>
              <p class="font-medium text-foreground">{{ author.name }}</p>
              <p v-if="author.description" class="text-xs">{{ author.description }}</p>
            </div>
          </div>

          <USeparator v-if="author && (formattedDate || readingTime)" orientation="vertical" class="h-6" />

          <!-- Date -->
          <time v-if="formattedDate" :datetime="String(date)">
            {{ formattedDate }}
          </time>

          <!-- Reading Time -->
          <template v-if="readingTime">
            <span class="text-muted">&middot;</span>
            <span>{{ readingTime }}</span>
          </template>
        </div>
      </slot>
    </header>

    <!-- Featured Image -->
    <figure v-if="image" class="mb-8 lg:mb-12 -mx-4 sm:mx-0">
      <img
        :src="image"
        :alt="imageAlt || title"
        class="w-full rounded-none sm:rounded-lg object-cover aspect-video"
      />
    </figure>

    <!-- Article Content -->
    <div class="lg:grid lg:grid-cols-[1fr_200px] lg:gap-12">
      <!-- Main Content -->
      <main class="min-w-0">
        <slot>
          <div
            v-if="content"
            class="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-img:rounded-lg prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
            v-html="content"
          />
        </slot>
      </main>

      <!-- Sidebar -->
      <aside v-if="$slots.sidebar" class="hidden lg:block">
        <div class="sticky top-20">
          <slot name="sidebar" />
        </div>
      </aside>
    </div>

    <!-- Footer -->
    <footer v-if="$slots.footer" class="mt-12 lg:mt-16">
      <USeparator class="mb-8" />
      <slot name="footer" />
    </footer>
  </article>
</template>
