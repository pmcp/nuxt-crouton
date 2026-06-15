<script setup lang="ts">
/**
 * Inschrijven (Registration) page — faithful port of original.
 * Banner image, title, registration info, two-column layout with
 * help/schedule/calendar on the left and pricing table on the right.
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
    <div class="w-full relative mb-12 md:mb-16 z-0 h-60 overflow-hidden">
      <img
        src="/assets/uploads/banner-inschrijvingen.jpg"
        alt="Inschrijven banner"
        class="absolute inset-0 w-full h-full object-cover"
      >
      <div class="absolute z-30 h-full w-full pt-8 sm:pt-16 top-0">
        <div class="text-4xl leading-tight h-auto whitespace-pre-line mx-auto px-6 lg:px-8 max-w-7xl" />
      </div>
    </div>

    <!-- Content -->
    <div class="mx-auto px-6 lg:px-8 max-w-7xl">
      <!-- Title -->
      <h1 class="text-4xl pb-0 mb-8">Inschrijven</h1>

      <!-- CMS content -->
      <div
        v-if="page?.contentHtml"
        class="prose max-w-none"
        v-html="page.contentHtml"
      />

      <!-- Hardcoded fallback content matching production -->
      <div v-else class="max-w-none">
        <!-- Hoe inschrijven -->
        <div class="mb-12">
          <h3 class="text-xl font-semibold mb-4">Hoe inschrijven</h3>
          <p class="text-base leading-relaxed mb-6">
            Inschrijven kan online via
            <a
              href="https://www.mijnacademie.be/sintlukasschaarbeek"
              target="_blank"
              rel="noopener"
              class="underline hover:text-primary"
            >www.mijnacademie.be/sintlukasschaarbeek</a>
            vanaf 24 mei om 9u. De herinschrijving voor huidige studenten begint op 1 mei.
            Inschrijven kan tot 30 september.
          </p>
          <a
            href="https://www.mijnacademie.be/sintlukasschaarbeek"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 bg-black text-white px-6 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            MijnAcademie
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </a>
        </div>

        <!-- Two-column section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          <!-- Left column -->
          <div class="flex flex-col">
            <!-- Hulp bij inschrijven -->
            <div class="mb-6">
              <h3 class="text-xl font-semibold mb-4">Hulp bij inschrijven</h3>
              <p class="text-base leading-relaxed">
                We helpen je graag verder zowel telefonisch of op het onthaal
                (<a href="tel:+3222177700" class="underline">02 217 77 00</a>
                maandag-, dinsdag- en donderdagavond van 17:00 - 20:30) tot en met 30 juni en
                vanaf 23 augustus, of per mail
                (<a href="mailto:info.academie@sintlukas.brussels" class="underline">info.academie@sintlukas.brussels</a>).
                De Academie ligt op wandelafstand van het Brussel Noord station en is bereikbaar
                via tramlijnen T3, T4, T55, T25, T94, M Rogier, M Kruidtuin.
              </p>
            </div>

            <div class="bg-black/20 w-full my-6" style="height: 1px" />

            <!-- Lessenrooster -->
            <div class="mb-6">
              <h3 class="text-xl font-semibold mb-4">Lessenrooster en studietraject</h3>
              <p class="text-base leading-relaxed">
                Via deze link bekijk je het lessenrooster voor volgend schooljaar. MijnAcademie
                maakt op basis van jouw inschrijving van dit jaar een logisch vervolg. Wil je
                echter veranderen van richting/optie? Dan moet je ons een mailtje sturen of
                langskomen op het onthaal.
              </p>
            </div>

            <div class="bg-black/20 w-full my-6" style="height: 1px" />

            <!-- Kalender -->
            <div>
              <h3 class="text-xl font-semibold mb-4">Kalender</h3>
              <p class="text-base leading-relaxed">
                De lessen starten op 1 september en het schooljaar loopt tot 30 juni. Hier vind
                je de volledige kalender voor het schooljaar 2024 - 2025 terug.
              </p>
            </div>
          </div>

          <!-- Right column -->
          <div class="flex flex-col">
            <h3 class="text-xl font-semibold mb-4">Inschrijvingsgelden</h3>

            <!-- Pricing table -->
            <table class="w-full text-left mb-6 border-collapse">
              <thead>
                <tr class="border-b border-black/20">
                  <th class="py-3 pr-4 text-sm font-semibold">Leeftijd</th>
                  <th class="py-3 text-sm font-semibold">Inschrijvingsgeld</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-black/10">
                  <td class="py-3 pr-4 text-base">6-17 jaar</td>
                  <td class="py-3 text-base">105 euro <span class="text-sm text-neutral-500">(vermindering of tweede kind: 70 euro)</span></td>
                </tr>
                <tr class="border-b border-black/10">
                  <td class="py-3 pr-4 text-base">18-24 jaar</td>
                  <td class="py-3 text-base">210 euro</td>
                </tr>
                <tr class="border-b border-black/10">
                  <td class="py-3 pr-4 text-base">25+</td>
                  <td class="py-3 text-base">440 euro <span class="text-sm text-neutral-500">(vermindering: 210 euro)</span></td>
                </tr>
              </tbody>
            </table>

            <!-- Lijst verminderingen link -->
            <a
              href="#"
              class="inline-flex items-center gap-2 text-base underline hover:text-primary mb-8"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd" />
              </svg>
              Lijst verminderingen
            </a>

            <!-- Additional info paragraphs -->
            <div class="space-y-4 text-base leading-relaxed">
              <p>
                <strong>Betaling:</strong> Het inschrijvingsgeld wordt in één keer betaald bij
                inschrijving. Betaling kan online via MijnAcademie (Bancontact of kredietkaart)
                of aan het onthaal (Bancontact).
              </p>
              <p>
                <strong>Fiscaal attest:</strong> Ouders van kinderen tot 14 jaar ontvangen een
                fiscaal attest voor de kinderopvangtoeslag.
              </p>
              <p>
                <strong>Inschrijvingsbevestiging:</strong> Na inschrijving ontvang je een
                bevestigingsmail met alle praktische informatie.
              </p>
              <p>
                <strong>Annulatie:</strong> Annulatie is mogelijk tot 30 september. Na 30
                september is het volledige inschrijvingsgeld verschuldigd.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="h-16" />
  </div>
</template>
