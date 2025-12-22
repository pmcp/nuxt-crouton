<script setup lang="ts">
const { isAuthenticated: loggedIn } = useSession()
const { isOpen } = useBookingCart()
</script>

<template>
  <USlideover
    v-if="loggedIn"
    v-model:open="isOpen"
    side="right"
    :overlay="false"
    :modal="false"
    :close="false"
    :ui="{ content: '!w-96' }"
  >
    <template #content>
      <div class="h-full w-full overflow-hidden">
        <BookingSidebarSM />
      </div>
    </template>
  </USlideover>
</template>
