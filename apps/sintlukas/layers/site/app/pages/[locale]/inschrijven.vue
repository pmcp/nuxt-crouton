<script setup lang="ts">
/**
 * Inschrijven (Registration) page.
 * Renders CMS content from the "inschrijven" page.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const locale = computed(() => String(route.params.locale))

const { data: page } = await useFetch('/api/public/pages/inschrijven')

useHead({
  title: 'Inschrijven — Sint-Lukas Academie'
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="text-3xl sm:text-4xl font-bold text-neutral-900 mb-10">Inschrijven</h1>

    <div
      v-if="page?.contentHtml"
      class="prose prose-neutral prose-lg max-w-none"
      v-html="page.contentHtml"
    />

    <div v-else class="prose prose-neutral prose-lg max-w-3xl">
      <p>
        Inschrijven kan online via
        <a href="https://www.inschrijvenaandemie.be/sintlukasacademie" target="_blank" rel="noopener" class="text-sintlukas-600">
          inschrijvenaandemie.be
        </a>
        vanaf 24 mei om 9u. De herinschrijving voor huidige studenten begint op 1 mei.
        Inschrijven kan tot 30 september.
      </p>
    </div>
  </div>
</template>
