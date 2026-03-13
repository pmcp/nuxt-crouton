<script setup lang="ts">
/**
 * Inschrijven (Registration) page — faithful port of original.
 * Banner image, title, CMS content sections with divider lines.
 */
definePageMeta({ layout: 'public' })

const { data: page } = await useFetch('/api/public/pages/inschrijven')

useHead({
  title: 'Inschrijven — Sint-Lukas Academie'
})
</script>

<template>
  <div>
    <!-- Banner -->
    <div class="w-full relative mb-12 md:mb-16 z-0 h-60">
      <div class="absolute z-30 h-full w-full pt-8 sm:pt-16 top-0">
        <div class="text-4xl leading-tight h-auto whitespace-pre-line mx-auto px-6 lg:px-8 max-w-7xl" />
      </div>
    </div>

    <!-- Content -->
    <div class="mx-auto px-6 lg:px-8 max-w-7xl grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8 md:gap-16">
      <div class="flex flex-col col-span-full md:col-span-2 gap-8 md:gap-16">
        <h1 class="text-4xl pb-0">Inschrijven</h1>

        <div
          v-if="page?.contentHtml"
          class="prose max-w-none"
          v-html="page.contentHtml"
        />

        <div v-else class="prose max-w-prose">
          <p>
            Inschrijven kan online via
            <a href="https://www.inschrijvenaandemie.be/sintlukasacademie" target="_blank" rel="noopener">
              inschrijvenaandemie.be
            </a>.
          </p>
        </div>

        <div class="bg-black w-full col-span-full" style="height: 1px" />
      </div>
    </div>
    <div class="h-8" />
  </div>
</template>
