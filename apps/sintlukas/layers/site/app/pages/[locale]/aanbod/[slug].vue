<script setup lang="ts">
/**
 * Atelier detail page — faithful port of original.
 * Banner image, title + age, main content + sidebar with border-l,
 * background-grid separator, teachers section, image gallery.
 */
definePageMeta({ layout: 'public' })

const route = useRoute()
const locale = computed(() => String(route.params.locale))
const slug = route.params.slug as string

const { data: atelier, error } = await useFetch(`/api/public/ateliers/${slug}`)

if (error.value) {
  throw createError({ status: 404, statusText: 'Atelier niet gevonden' })
}

function t(field: string): string {
  const item = atelier.value
  if (!item) return ''
  const translations = item.translations as Record<string, Record<string, any>> | undefined
  const localeVal = translations?.[locale.value]?.[field]
  if (localeVal) return String(localeVal)
  return String(item[field] || '')
}

const title = computed(() => t('title') || 'Untitled')
const age = computed(() => t('age'))

const mainContentHtml = computed(() => {
  const item = atelier.value as any
  return item?.contentHtml || ''
})
const sidebarContentHtml = computed(() => (atelier.value as any)?.sidebarContentHtml || '')

const persons = computed<any[]>(() => {
  const data = (atelier.value as any)?.personsData
  return Array.isArray(data) ? data : []
})

const images = computed<string[]>(() => {
  const imgs = (atelier.value as any)?.images
  return Array.isArray(imgs) ? imgs : []
})

useHead({
  title: computed(() => `${title.value} — Sint-Lukas Academie`)
})
</script>

<template>
  <div v-if="atelier" class="relative">
    <!-- Banner image -->
    <div class="w-full relative mb-12 md:mb-16 z-0" :class="atelier.mainImage ? 'h-96' : 'h-60'">
      <img
        v-if="atelier.mainImage"
        :src="`/images/${atelier.mainImage}`"
        :alt="title"
        class="h-full w-full object-cover object-center relative z-20"
      />
    </div>

    <!-- Content -->
    <div class="mx-auto px-6 lg:px-8 max-w-7xl grid grid-cols-1 gap-8">
      <div class="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-y-4">
        <div>
          <h1 class="text-4xl md:pt-4 col-span-2 pb-1">{{ title }}</h1>
          <div v-if="age" class="text-xl col-span-2 font-bold">{{ age }}</div>
        </div>

        <!-- Main + sidebar content -->
        <div class="grid md:grid-cols-2 col-span-full gap-4 md:gap-0">
          <!-- Main text -->
          <div>
            <div
              v-if="mainContentHtml"
              class="col-span-1 prose pr-0 md:pr-8 md:pt-4"
              v-html="mainContentHtml"
            />
          </div>

          <!-- Sidebar with border-l -->
          <div v-if="sidebarContentHtml" class="col-span-1 grid grid-cols-1 lg:grid-cols-3 h-fit border-l-0 md:border-l">
            <div
              class="h-fit pr-2 col-span-full prose md:pl-4 pmcp-prose_sidebar"
              v-html="sidebarContentHtml"
            />
          </div>
        </div>
      </div>

      <!-- Background grid separator -->
      <div v-if="persons.length || images.length">
        <div class="background-grid" style="width: 300vw; position: absolute; left: -100vw; height: 99999px;" />
      </div>

      <!-- Teachers + gallery -->
      <div class="relative z-[1]">
        <div class="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-16">
          <div v-if="persons.length" class="col-span-2 grid gap-4 md:w-2/3">
            <h2 class="text-lg uppercase font-bold">Leerkrachten</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

          <div v-if="images.length" class="col-span-2 grid gap-4">
            <h2 class="text-lg uppercase font-bold">In beeld</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                v-for="(imgId, idx) in images"
                :key="idx"
                class="aspect-square overflow-hidden bg-neutral-100"
              >
                <img :src="`/images/${imgId}`" alt="" class="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
        <div class="h-16" />
      </div>
    </div>
  </div>
</template>
