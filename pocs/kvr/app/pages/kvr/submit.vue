<script setup lang="ts">
// Public submit page — no auth middleware. Token in ?t=<token> query param
// is forwarded to /api/public/kvr/* endpoints which do the real validation.

definePageMeta({
  layout: false,
})

useHead({ title: 'Werkvergunning indienen — KVR' })

const route = useRoute()
const token = computed(() => String(route.query.t || ''))
const hasToken = computed(() => token.value.length > 0)
</script>

<template>
  <div class="min-h-screen bg-[#e8e8e8] py-6 text-neutral-900">
    <div v-if="!hasToken" class="mx-auto max-w-xl rounded-sm border border-amber-300 bg-amber-50 p-6 text-center text-amber-900">
      <UIcon name="i-lucide-lock" class="mx-auto size-10 text-amber-600" />
      <h1 class="mt-2 text-lg font-semibold">Toegangslink vereist</h1>
      <p class="mt-1 text-sm">
        Deze pagina is alleen toegankelijk met een geldige deellink.
        Neem contact op met de beheerder voor een nieuwe link.
      </p>
    </div>

    <PublicWerkvergunningForm
      v-else
      :token="token"
    />
  </div>
</template>
