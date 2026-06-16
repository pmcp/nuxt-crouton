<script setup lang="ts">
/**
 * e2e surface page (#224): mounts the relation form control the generator emits
 * for a foreign-key field. `books.authorId` (refTarget: authors) generates a
 * <CroutonFormReferenceSelect collection="mainAuthors"> in the books _Form.vue;
 * that component calls useCollectionQuery('mainAuthors') to load the parent
 * collection's rows as options.
 *
 * Mounting it here asserts the *relation wiring* end-to-end: the reference-select
 * renders (its USelectMenu trigger button) and its query against the parent
 * collection's API resolves without error. If the generator drops the refTarget
 * (so the FK degrades to a plain text input) or the parent endpoint regresses,
 * this surface goes red. Mirrors with-assets / with-collab (mount = enough to
 * catch boot/scaffolder regressions; we don't assert a second client / a picked
 * option, which the text-field-only CRUD harness can't drive anyway).
 */
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'team-admin']
})

const selected = ref<string>()
</script>

<template>
  <UDashboardPanel id="relation-check">
    <UDashboardNavbar title="Relation Check">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardNavbar>

    <div
      data-testid="relation-check"
      class="p-6"
    >
      <CroutonFormReferenceSelect
        v-model="selected"
        collection="mainAuthors"
        label="Author"
      />
    </div>
  </UDashboardPanel>
</template>
