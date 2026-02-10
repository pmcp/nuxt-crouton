<script setup lang="ts">
/**
 * User Mappings Page
 *
 * Lists all cross-platform user mappings using the collection viewer.
 *
 * @route /admin/[team]/triage/user-mappings
 */
</script>

<template>
  <div class="h-full">
    <CroutonCollectionViewer
      collection-name="triageUserMappings"
      default-layout="table"
    />
  </div>
</template>
