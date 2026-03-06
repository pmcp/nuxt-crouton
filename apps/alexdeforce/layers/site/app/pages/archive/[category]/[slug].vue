<script setup lang="ts">
definePageMeta({ layout: 'archive' })

const route = useRoute()
const slug = String(route.params.slug)
const category = String(route.params.category)

const { data: article } = await useFetch(`/api/public/articles/${slug}`)

if (!article.value) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' })
}

const categoryDisplay: Record<string, string> = {
  poezie: 'poëzie',
  txt: 'txt',
  img: 'img',
  radio: 'radio'
}

useHead({
  title: article.value?.title
})
</script>

<template>
  <div v-if="article">
    <NuxtLink
      :to="`/archive/${category}`"
      class="text-xs uppercase border-b-2 border-white hover:border-black transition-colors"
    >
      &larr; {{ categoryDisplay[category] || category }}
    </NuxtLink>

    <p v-if="article.date" class="text-xs text-gray-400 mt-4">
      {{ article.date }}
    </p>

    <h1 class="text-2xl mt-2 mb-4">{{ article.title }}</h1>

    <div
      v-if="article.content"
      class="text-sm leading-6 prose"
      v-html="article.content"
    />

    <SiteEmbedBlock v-if="article.embed" :html="article.embed" />

    <img
      v-if="article.imageUrl"
      :src="article.imageUrl"
      :alt="article.title"
      class="mt-4 max-h-[80vh]"
    >
  </div>
</template>
