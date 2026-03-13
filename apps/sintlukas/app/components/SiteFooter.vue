<script setup lang="ts">
/**
 * Sint-Lukas site footer — faithful port of original.
 * Light green bg (sintlukas-200), border-b accent, social SVG icons.
 */
const { contactEmail, socialLinks, newsletterUrl, calendarUrl } = useTeamSiteInfo()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-sintlukas-200 border-b-4 border-accent-800 w-full">
    <!-- Top section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div class="flex flex-col w-full gap-2">
        <!-- Newsletter text -->
        <div v-if="newsletterUrl" class="w-fit">
          <p class="mb-2">Laat hier je e-mailadres achter om nieuws uit de academie te ontvangen.</p>
          <a :href="newsletterUrl" target="_blank" rel="noopener" class="text-sintlukas-700 font-bold hover:underline">
            Nieuwsbrief &rarr;
          </a>
        </div>

        <!-- Calendar link -->
        <div v-if="calendarUrl" class="mt-2">
          <a :href="calendarUrl" target="_blank" rel="noopener" class="text-sintlukas-700 font-bold hover:underline">
            Jaarkalender &rarr;
          </a>
        </div>

        <!-- Contact email -->
        <div v-if="contactEmail" class="mt-2">
          <a :href="`mailto:${contactEmail}`" class="hover:underline">{{ contactEmail }}</a>
        </div>

        <!-- Social icons -->
        <div class="flex relative -left-1 mt-2">
          <a v-if="socialLinks.facebook" :href="socialLinks.facebook" target="_blank" rel="noopener" aria-label="Facebook">
            <SvgFb class="h-8 w-auto" />
          </a>
          <a v-if="socialLinks.instagram" :href="socialLinks.instagram" target="_blank" rel="noopener" aria-label="Instagram">
            <SvgInstagram class="h-8 w-auto p-1" />
          </a>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-4 lg:flex lg:items-end lg:justify-between lg:gap-x-3">
      <p class="text-gray-500 text-sm">
        &copy; {{ year }}
      </p>
      <div class="mt-3 lg:mt-0">
        <SvgLogo class="h-12 w-auto" />
      </div>
    </div>
  </footer>
</template>
