<script setup lang="ts">
definePageMeta({
  title: 'Blog Posts'
})

// Simple test - bypass auth/team infrastructure
const { data: posts, pending, error, refresh } = await useFetch('/api/posts')
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Blog Posts</h1>
        <UButton @click="refresh()" :loading="pending">
          Refresh
        </UButton>
      </div>

      <div v-if="error" class="text-red-500">
        Error: {{ error.message }}
      </div>

      <div v-else-if="pending" class="text-muted">
        Loading...
      </div>

      <div v-else-if="!posts?.length" class="text-muted">
        No posts found. Run <code>curl -X POST http://localhost:3000/api/seed</code> to seed data.
      </div>

      <UTable v-else :data="posts" :columns="[
        { id: 'title', accessorKey: 'title', header: 'Title' },
        { id: 'slug', accessorKey: 'slug', header: 'Slug' },
        { id: 'authorName', accessorKey: 'authorName', header: 'Author' },
        { id: 'published', accessorKey: 'published', header: 'Published' }
      ]">
        <template #published-cell="{ row }">
          <UBadge :color="row.original.published ? 'success' : 'neutral'">
            {{ row.original.published ? 'Yes' : 'No' }}
          </UBadge>
        </template>
      </UTable>
    </div>
  </UContainer>
</template>