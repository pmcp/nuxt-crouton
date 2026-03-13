<script setup lang="ts">
/**
 * Sint-Lukas site footer — faithful port of production site.
 * 3-column layout: newsletter form | contact address | social icons.
 * Bottom bar: centered logo + copyright.
 */
const { socialLinks, newsletterUrl } = useTeamSiteInfo()
const year = new Date().getFullYear()

const email = ref('')

function onSubscribe() {
  if (newsletterUrl && email.value) {
    navigateTo(newsletterUrl, { external: true, open: { target: '_blank' } })
  }
}
</script>

<template>
  <footer class="bg-sintlukas-200 border-b-4 border-accent-800 w-full">
    <!-- Top section: 3-column grid -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Column 1: Newsletter form -->
        <div>
          <p class="mb-4 text-sm">Laat hier je e-mailadres achter om nieuws uit de academie te ontvangen.</p>
          <form class="flex gap-2" @submit.prevent="onSubscribe">
            <input
              v-model="email"
              type="email"
              placeholder="E-mailadres"
              class="flex-1 min-w-0 px-3 py-2 text-sm border border-sintlukas-400 rounded bg-white focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
            <button
              type="submit"
              class="px-4 py-2 text-sm font-semibold text-white bg-accent-800 rounded hover:bg-accent-700 transition-colors shrink-0"
            >
              Subscribe
            </button>
          </form>
        </div>

        <!-- Column 2: Contact address block -->
        <div class="text-sm leading-relaxed">
          <p class="font-bold">Sint-Lukas Academie</p>
          <p>Groenstraat 156, 1030 Brussel (Schaarbeek)</p>
          <p class="mt-2">
            <a href="mailto:info.academie@sintlukas.brussels" class="hover:underline">info.academie@sintlukas.brussels</a>
          </p>
          <p>T. +32 2 217 77 00</p>
        </div>

        <!-- Column 3: Social icons -->
        <div class="flex items-start gap-1">
          <a v-if="socialLinks.facebook" :href="socialLinks.facebook" target="_blank" rel="noopener" aria-label="Facebook">
            <SvgFb class="h-8 w-auto" />
          </a>
          <a v-if="socialLinks.instagram" :href="socialLinks.instagram" target="_blank" rel="noopener" aria-label="Instagram">
            <SvgInstagram class="h-8 w-auto p-1" />
          </a>
        </div>
      </div>
    </div>

    <!-- Bottom bar: centered logo + copyright -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center gap-2">
      <SvgLogo class="h-12 w-auto" />
      <p class="text-gray-500 text-sm">&copy; {{ year }}</p>
    </div>
  </footer>
</template>
