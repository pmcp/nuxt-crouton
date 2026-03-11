<script setup lang="ts">
/**
 * Sint-Lukas site footer with contact info, social links, and newsletter.
 * Uses useTeamSiteInfo() to pull admin-editable settings.
 */
const { contactEmail, socialLinks, newsletterUrl, calendarUrl } = useTeamSiteInfo()
const { t } = useT()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-sintlukas-900 text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Brand -->
        <div>
          <img src="/logo.svg" alt="Sint-Lukas Academie" class="h-10 mb-3 brightness-0 invert" />
          <p class="text-sintlukas-300 text-sm leading-relaxed">
            Dé academie voor beeldende kunsten in hartje Brussel.
          </p>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="font-semibold text-sm uppercase tracking-wider text-neutral-400 mb-3">Contact</h4>
          <ul class="space-y-2 text-sm text-neutral-300">
            <li v-if="contactEmail">
              <a :href="`mailto:${contactEmail}`" class="hover:text-white transition-colors">
                {{ contactEmail }}
              </a>
            </li>
            <li v-if="calendarUrl">
              <a :href="calendarUrl" target="_blank" rel="noopener" class="hover:text-white transition-colors">
                {{ t('site.footer.calendar') || 'Jaarkalender' }}
              </a>
            </li>
            <li v-if="newsletterUrl">
              <a :href="newsletterUrl" target="_blank" rel="noopener" class="hover:text-white transition-colors">
                {{ t('site.footer.newsletter') || 'Nieuwsbrief' }}
              </a>
            </li>
          </ul>
        </div>

        <!-- Social -->
        <div>
          <h4 class="font-semibold text-sm uppercase tracking-wider text-neutral-400 mb-3">Volg ons</h4>
          <div class="flex gap-3">
            <a
              v-if="socialLinks.facebook"
              :href="socialLinks.facebook"
              target="_blank"
              rel="noopener"
              class="size-10 rounded-full bg-sintlukas-800 flex items-center justify-center hover:bg-sintlukas-700 transition-colors"
              aria-label="Facebook"
            >
              <UIcon name="i-lucide-facebook" class="size-5" />
            </a>
            <a
              v-if="socialLinks.instagram"
              :href="socialLinks.instagram"
              target="_blank"
              rel="noopener"
              class="size-10 rounded-full bg-sintlukas-800 flex items-center justify-center hover:bg-sintlukas-700 transition-colors"
              aria-label="Instagram"
            >
              <UIcon name="i-lucide-instagram" class="size-5" />
            </a>
            <a
              v-if="socialLinks.youtube"
              :href="socialLinks.youtube"
              target="_blank"
              rel="noopener"
              class="size-10 rounded-full bg-sintlukas-800 flex items-center justify-center hover:bg-sintlukas-700 transition-colors"
              aria-label="YouTube"
            >
              <UIcon name="i-lucide-youtube" class="size-5" />
            </a>
            <a
              v-if="socialLinks.linkedin"
              :href="socialLinks.linkedin"
              target="_blank"
              rel="noopener"
              class="size-10 rounded-full bg-sintlukas-800 flex items-center justify-center hover:bg-sintlukas-700 transition-colors"
              aria-label="LinkedIn"
            >
              <UIcon name="i-lucide-linkedin" class="size-5" />
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="mt-10 pt-6 border-t border-sintlukas-800 text-sintlukas-300 text-xs flex flex-col sm:flex-row justify-between gap-2">
        <p>&copy; {{ year }} Sint-Lukas Academie. Alle rechten voorbehouden.</p>
        <p>Groenstraat 156, 1030 Brussel</p>
      </div>
    </div>
  </footer>
</template>
