<script setup lang="ts">
/**
 * CroutonLayoutSpikeForm — a throwaway "form block" for the layout spike (#713).
 *
 * A real Nuxt UI form, responsive to ITS PANE via container queries (`@container`
 * + `@md:` — two columns wide, one column narrow), foreshadowing the Sprint 2
 * (#710) block-authoring contract. Stands in for a generated form block; the
 * production form block would wrap CroutonForm / CroutonFormDynamicLoader.
 */
import { reactive } from 'vue'

const state = reactive({ name: '', email: '', notes: '' })
</script>

<template>
  <div class="@container h-full overflow-auto p-4">
    <UForm
      :state="state"
      class="space-y-4"
    >
      <div class="grid grid-cols-1 @md:grid-cols-2 gap-4">
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
      </div>
      <UFormField label="Notes" name="notes">
        <UTextarea v-model="state.notes" class="w-full" :rows="4" />
      </UFormField>
      <div class="flex justify-end">
        <UButton type="submit">Save</UButton>
      </div>
    </UForm>
  </div>
</template>
