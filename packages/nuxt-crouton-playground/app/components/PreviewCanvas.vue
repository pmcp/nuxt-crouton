<script setup lang="ts">
const showModal = ref(false)
const showSlideover = ref(false)
const inputValue = ref('')
const switchValue = ref(false)

const dropdownItems = [
  [
    { label: 'Profile', icon: 'i-heroicons-user' },
    { label: 'Settings', icon: 'i-heroicons-cog-6-tooth' }
  ],
  [
    { label: 'Logout', icon: 'i-heroicons-arrow-right-on-rectangle' }
  ]
]
</script>

<template>
  <div class="space-y-8 p-8">
    <!-- Buttons -->
    <section>
      <h3 class="text-lg font-semibold mb-4">Buttons</h3>
      <div class="flex flex-wrap gap-3">
        <UButton color="primary" label="Primary" />
        <UButton color="secondary" label="Secondary" />
        <UButton color="success" label="Success" />
        <UButton color="warning" label="Warning" />
        <UButton color="error" label="Error" />
        <UButton color="neutral" label="Neutral" />
      </div>
      <div class="flex flex-wrap gap-3 mt-3">
        <UButton color="primary" variant="outline" label="Outline" />
        <UButton color="primary" variant="ghost" label="Ghost" />
        <UButton color="primary" variant="link" label="Link" />
      </div>
    </section>

    <!-- Inputs & Forms -->
    <section>
      <h3 class="text-lg font-semibold mb-4">Forms</h3>
      <div class="space-y-3 max-w-md">
        <UInput v-model="inputValue" placeholder="Enter text..." />
        <UTextarea placeholder="Enter longer text..." />
        <div class="flex items-center gap-3">
          <USwitch v-model="switchValue" />
          <span class="text-sm">Toggle me</span>
        </div>
      </div>
    </section>

    <!-- Badges & Alerts -->
    <section>
      <h3 class="text-lg font-semibold mb-4">Badges & Alerts</h3>
      <div class="flex flex-wrap gap-3 mb-4">
        <UBadge color="primary" label="Primary" />
        <UBadge color="secondary" label="Secondary" />
        <UBadge color="success" label="Success" />
        <UBadge color="warning" label="Warning" />
        <UBadge color="error" label="Error" />
      </div>
      <div class="space-y-3 max-w-xl">
        <UAlert
          color="primary"
          title="Info"
          description="This is an informational alert"
        />
        <UAlert
          color="success"
          title="Success"
          description="Your changes have been saved"
        />
        <UAlert
          color="warning"
          title="Warning"
          description="Please review before proceeding"
        />
        <UAlert
          color="error"
          title="Error"
          description="Something went wrong"
        />
      </div>
    </section>

    <!-- Cards -->
    <section>
      <h3 class="text-lg font-semibold mb-4">Cards</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <UCard>
          <template #header>
            <h4 class="font-semibold">Card Title</h4>
          </template>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            This is a card with some content inside.
          </p>
          <template #footer>
            <UButton color="primary" size="sm" label="Action" />
          </template>
        </UCard>
        <UCard>
          <template #header>
            <h4 class="font-semibold">Another Card</h4>
          </template>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Cards adapt to your theme colors.
          </p>
        </UCard>
      </div>
    </section>

    <!-- Navigation -->
    <section>
      <h3 class="text-lg font-semibold mb-4">Navigation</h3>
      <div class="flex flex-wrap gap-4">
        <UDropdownMenu :items="dropdownItems">
          <UButton
            label="Dropdown"
            trailing-icon="i-heroicons-chevron-down"
            color="primary"
          />
        </UDropdownMenu>
        <UButton label="Open Modal" color="secondary" @click="showModal = true" />
        <UButton label="Open Slideover" color="neutral" @click="showSlideover = true" />
      </div>
    </section>

    <!-- Modal -->
    <UModal v-model="showModal">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Modal Example</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            This modal uses your theme colors!
          </p>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" label="Cancel" @click="close" />
            <UButton color="primary" label="Confirm" @click="close" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Slideover -->
    <USlideover v-model="showSlideover">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Slideover Example</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Slideouts also follow your theme!
          </p>
          <UButton color="primary" label="Close" @click="close" />
        </div>
      </template>
    </USlideover>
  </div>
</template>