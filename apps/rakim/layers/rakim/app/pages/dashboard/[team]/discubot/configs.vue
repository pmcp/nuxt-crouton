<template>
  <AppContainer title="Source Configs">
    <div class="mb-4">
      <NuxtLink
        :to="`/dashboard/${currentTeam?.slug}`"
        class="hover:underline inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Dashboard
      </NuxtLink>
    </div>

    <CroutonCollectionViewer
      collection-name="discubotConfigs"
      default-layout="table"
    />
  </AppContainer>
</template>

<script setup lang="ts">
const { currentTeam } = useTeam()
const route = useRoute()
const router = useRouter()
const { open } = useCrouton()
const toast = useToast()

// No auto-open logic needed anymore - OAuth now merges credentials into form
// User completes the form and saves once

definePageMeta({
  middleware: 'auth'
})
</script>
