<script setup lang="ts">
/**
 * Sint-Lukas site footer — branded wrapper around CMS-editable block content.
 * Block content (newsletter, contact info) comes from the footer page in the CMS.
 * Social icons, logo, and copyright stay in the component.
 */
const { socialLinks } = useTeamSiteInfo()
const { content, isLoading } = useFooterPage()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-sintlukas-200 border-b-4 border-accent-800 w-full">
    <!-- Top section: CMS block content -->
    <div v-if="content && !isLoading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <CroutonPagesBlockContent :content="content" />

      <!-- Social icons below block content -->
      <div class="flex items-start gap-1 mt-6">
        <a v-if="socialLinks.facebook" :href="socialLinks.facebook" target="_blank" rel="noopener" aria-label="Facebook">
          <SvgFb class="h-8 w-auto" />
        </a>
        <a v-if="socialLinks.instagram" :href="socialLinks.instagram" target="_blank" rel="noopener" aria-label="Instagram">
          <SvgInstagram class="h-8 w-auto p-1" />
        </a>
      </div>
    </div>

    <!-- Bottom bar: centered logo + copyright -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center gap-2">
      <SvgLogo class="h-12 w-auto" />
      <p class="text-gray-500 text-sm">&copy; {{ year }}</p>
    </div>
  </footer>
</template>
