<script setup lang="ts">
/**
 * Academie page — about the school + staff grid.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const locale = computed(() => String(route.params.locale))

const { data: persons } = await useFetch('/api/public/persons')

// Try to load the "academie" CMS page for editable content
const { data: page } = await useFetch('/api/public/pages/academie')

useHead({
  title: 'Onze academie — Sint-Lukas Academie'
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="bg-sintlukas-50 py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl sm:text-4xl font-bold text-neutral-900">Onze academie</h1>
      </div>
    </section>

    <!-- Content from CMS page -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div
        v-if="page?.contentHtml"
        class="prose prose-neutral prose-lg max-w-none mb-16"
        v-html="page.contentHtml"
      />

      <div v-else class="prose prose-neutral prose-lg max-w-3xl mb-16">
        <p>
          Sint-Lukas Academie is al sinds 1880 dé plek voor beeldende kunsten in Brussel.
          Wij bieden een breed aanbod aan voor kinderen, jongeren en volwassenen.
        </p>
      </div>

      <!-- Staff grid -->
      <div v-if="persons?.length">
        <h2 class="text-xl font-bold text-neutral-900 mb-8">Ons team</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <SitePersonCard
            v-for="person in persons"
            :key="person.id"
            :first-name="person.firstName"
            :last-name="person.lastName"
            :role="person.role"
            :image="person.image"
          />
        </div>
      </div>
    </section>
  </div>
</template>
