<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: articles } = await useFetch('/api/public/articles', {
  query: { featured: 'true' }
})
</script>

<template>
  <div>
    <div v-for="article in articles" :key="article.id" class="mb-20">
      <NuxtLink
        :to="`/archive/${article.category}/${article.id}`"
        class="block"
      >
        <h1 class="text-xl pb-5 pt-1">{{ article.title }}</h1>
      </NuxtLink>
      <div
        v-if="article.content"
        class="text-sm prose"
        v-html="article.content"
      />
      <SiteEmbedBlock v-if="article.embed" :html="article.embed" />
    </div>

    <p v-if="!articles?.length" class="text-sm text-gray-400">
      No featured articles yet.
    </p>
  </div>
</template>
