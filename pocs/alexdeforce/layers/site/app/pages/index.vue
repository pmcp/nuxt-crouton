<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({
  title: 'Alex Deforce',
  meta: [
    { name: 'description', content: 'Dichter van weinig woorden' },
    { property: 'og:description', content: 'Dichter van weinig woorden' },
    { property: 'og:image', content: 'https://alexdeforce.com/logo.jpeg' }
  ]
})

const { data: articles } = await useFetch('/api/public/articles', {
  query: { featured: 'true' }
})
</script>

<template>
  <div>
    <div v-for="article in articles" :key="article.id" class="pmcp-article mb-20">
      <h1 class="pb-5 pt-1"><span class="text-xl">{{ article.title }}</span></h1>
      <div
        v-if="article.contentHtml"
        class="prose prose-sm"
        v-html="article.contentHtml"
      />
    </div>

    <p v-if="!articles?.length" class="text-sm text-gray-400">
      No featured articles yet.
    </p>
  </div>
</template>
