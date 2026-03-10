<script setup lang="ts">
definePageMeta({ layout: 'archive' })

const route = useRoute()
const slug = String(route.params.slug)
const category = String(route.params.category)

const { data: article } = await useFetch(`/api/public/articles/${slug}`)

if (!article.value) {
  throw createError({ status: 404, statusText: 'Article not found' })
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
  <div v-if="article" class="pmcp-article">
    <div class="mb-4">
      <NuxtLink
        :to="`/archive/${category}`"
        class="inline-block border-b-2 border-white hover:border-black"
      >
        Overzicht <span v-if="categoryDisplay[category]">{{ categoryDisplay[category] }}</span>
        <span v-else>{{ category }}</span>
      </NuxtLink>
    </div>

    <h1 class="pb-5"><span class="text-2xl">{{ article.title }}</span></h1>

    <div
      v-if="article.contentHtml"
      class="text-sm leading-6 prose"
      v-html="article.contentHtml"
    />

    <img
      v-if="article.imageUrl"
      :src="article.imageUrl"
      :alt="article.title"
      class="mt-4 max-h-[80vh]"
    >
  </div>
</template>
