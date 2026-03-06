<script setup lang="ts">
definePageMeta({ layout: 'archive' })

const route = useRoute()
const category = computed(() => String(route.params.category))

const { data: articles } = await useFetch('/api/public/articles', {
  query: { category }
})

const categoryLabels: Record<string, string> = {
  poezie: 'Poezie',
  txt: 'Txt',
  img: 'Img',
  radio: 'Radio'
}
</script>

<template>
  <div>
    <ul>
      <SiteArticleCard
        v-for="article in articles"
        :key="article.id"
        :title="article.title"
        :slug="article.id"
        :category="article.category"
        :tags="article.tags ? JSON.parse(article.tags) : undefined"
      />
    </ul>

    <p v-if="!articles?.length" class="text-sm text-gray-400">
      No {{ categoryLabels[category] || category }} articles yet.
    </p>
  </div>
</template>
