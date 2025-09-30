<script setup lang="ts">
const showModal = ref(false)
const showSlideover = ref(false)

const formState = ref({
  name: '',
  email: '',
  message: '',
  subscribe: false,
  plan: 'basic'
})

const tabItems = [
  { label: 'Tab 1', content: 'Content for tab 1' },
  { label: 'Tab 2', content: 'Content for tab 2' },
  { label: 'Tab 3', content: 'Content for tab 3' }
]

const dropdownItems = [
  [{ label: 'Profile', icon: 'i-lucide-user' }],
  [{ label: 'Settings', icon: 'i-lucide-settings' }],
  [{ label: 'Sign out', icon: 'i-lucide-log-out' }]
]
</script>

<template>
  <div class="p-8 space-y-12">
    <!-- Theme Showcase -->
    <PlaygroundSemanticShowcase />

    <USeparator />

    <!-- Buttons Section -->
    <section>
      <h3 class="text-xl font-semibold text-default mb-6">
        Buttons
      </h3>

      <div class="space-y-6">
        <!-- Solid Variants -->
        <div>
          <h4 class="text-sm font-medium text-default mb-3">Solid</h4>
          <div class="flex flex-wrap gap-3">
            <UButton color="primary">Primary</UButton>
            <UButton color="secondary">Secondary</UButton>
            <UButton color="success">Success</UButton>
            <UButton color="info">Info</UButton>
            <UButton color="warning">Warning</UButton>
            <UButton color="error">Error</UButton>
            <UButton color="neutral">Neutral</UButton>
          </div>
        </div>

        <!-- Outline Variants -->
        <div>
          <h4 class="text-sm font-medium text-default mb-3">Outline</h4>
          <div class="flex flex-wrap gap-3">
            <UButton variant="outline" color="primary">Primary</UButton>
            <UButton variant="outline" color="secondary">Secondary</UButton>
            <UButton variant="outline" color="success">Success</UButton>
            <UButton variant="outline" color="info">Info</UButton>
            <UButton variant="outline" color="warning">Warning</UButton>
            <UButton variant="outline" color="error">Error</UButton>
            <UButton variant="outline" color="neutral">Neutral</UButton>
          </div>
        </div>

        <!-- Ghost Variants -->
        <div>
          <h4 class="text-sm font-medium text-default mb-3">Ghost</h4>
          <div class="flex flex-wrap gap-3">
            <UButton variant="ghost" color="primary">Primary</UButton>
            <UButton variant="ghost" color="secondary">Secondary</UButton>
            <UButton variant="ghost" color="success">Success</UButton>
            <UButton variant="ghost" color="info">Info</UButton>
            <UButton variant="ghost" color="warning">Warning</UButton>
            <UButton variant="ghost" color="error">Error</UButton>
            <UButton variant="ghost" color="neutral">Neutral</UButton>
          </div>
        </div>

        <!-- Sizes -->
        <div>
          <h4 class="text-sm font-medium text-default mb-3">Sizes</h4>
          <div class="flex flex-wrap items-center gap-3">
            <UButton size="xs" color="primary">XS</UButton>
            <UButton size="sm" color="primary">SM</UButton>
            <UButton size="md" color="primary">MD</UButton>
            <UButton size="lg" color="primary">LG</UButton>
            <UButton size="xl" color="primary">XL</UButton>
          </div>
        </div>

        <!-- With Icons -->
        <div>
          <h4 class="text-sm font-medium text-default mb-3">With Icons</h4>
          <div class="flex flex-wrap gap-3">
            <UButton icon="i-lucide-plus" color="primary">Create</UButton>
            <UButton trailing-icon="i-lucide-arrow-right" color="secondary">Next</UButton>
            <UButton icon="i-lucide-trash" variant="outline" color="error">Delete</UButton>
            <UButton loading color="primary">Loading...</UButton>
          </div>
        </div>
      </div>
    </section>

    <USeparator />

    <!-- Forms Section -->
    <section>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Form Elements
      </h3>

      <div class="max-w-md space-y-4">
        <div>
          <label class="block text-sm font-medium text-default mb-2">
            Text Input
          </label>
          <UInput v-model="formState.name" placeholder="Enter your name" />
        </div>

        <div>
          <label class="block text-sm font-medium text-default mb-2">
            Email Input
          </label>
          <UInput v-model="formState.email" type="email" placeholder="email@example.com" icon="i-lucide-mail" />
        </div>

        <div>
          <label class="block text-sm font-medium text-default mb-2">
            Textarea
          </label>
          <UTextarea v-model="formState.message" placeholder="Enter your message" :rows="3" />
        </div>

        <div>
          <label class="block text-sm font-medium text-default mb-2">
            Select
          </label>
          <USelect v-model="formState.plan" :options="['basic', 'pro', 'enterprise']" />
        </div>

        <div class="flex items-center gap-2">
          <UCheckbox v-model="formState.subscribe" />
          <label class="text-sm text-default">
            Subscribe to newsletter
          </label>
        </div>

        <div class="flex items-center gap-2">
          <USwitch v-model="formState.subscribe" />
          <label class="text-sm text-default">
            Enable notifications
          </label>
        </div>
      </div>
    </section>

    <USeparator />

    <!-- Feedback Section -->
    <section>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Feedback
      </h3>

      <div class="space-y-4">
        <UAlert
          color="primary"
          variant="solid"
          title="Primary Alert"
          description="This is a primary alert message."
          icon="i-lucide-info"
        />
        <UAlert
          color="success"
          variant="outline"
          title="Success"
          description="Your changes have been saved successfully."
          icon="i-lucide-check-circle"
        />
        <UAlert
          color="warning"
          variant="soft"
          title="Warning"
          description="Please review your information before proceeding."
          icon="i-lucide-alert-triangle"
        />
        <UAlert
          color="error"
          variant="outline"
          title="Error"
          description="An error occurred while processing your request."
          icon="i-lucide-x-circle"
        />

        <div class="flex flex-wrap gap-2 pt-4">
          <UBadge color="primary">Primary</UBadge>
          <UBadge color="secondary">Secondary</UBadge>
          <UBadge color="success">Success</UBadge>
          <UBadge color="info">Info</UBadge>
          <UBadge color="warning">Warning</UBadge>
          <UBadge color="error">Error</UBadge>
        </div>
      </div>
    </section>

    <USeparator />

    <!-- Navigation Section -->
    <section>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Navigation
      </h3>

      <div class="space-y-6">
        <div>
          <h4 class="text-sm font-medium text-default mb-3">Tabs</h4>
          <UTabs :items="tabItems.map(t => ({ label: t.label }))" />
        </div>

        <div>
          <h4 class="text-sm font-medium text-default mb-3">Dropdown Menu</h4>
          <UDropdownMenu :items="dropdownItems">
            <UButton trailing-icon="i-lucide-chevron-down">
              Dropdown
            </UButton>
          </UDropdownMenu>
        </div>
      </div>
    </section>

    <USeparator />

    <!-- Overlays Section -->
    <section>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Overlays
      </h3>

      <div class="flex gap-3">
        <UButton @click="showModal = true">Open Modal</UButton>
        <UButton variant="outline" @click="showSlideover = true">Open Slideover</UButton>
      </div>

      <!-- Modal -->
      <UModal v-model="showModal">
        <template #content="{ close }">
          <div class="p-6">
            <h3 class="text-lg font-semibold mb-4">Modal Title</h3>
            <p class="text-muted mb-6">
              This is a modal dialog. It can contain any content you need.
            </p>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" @click="close">
                Cancel
              </UButton>
              <UButton color="primary" @click="close">
                Save
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Slideover -->
      <USlideover v-model="showSlideover">
        <template #content="{ close }">
          <div class="p-6">
            <h3 class="text-lg font-semibold mb-4">Slideover Title</h3>
            <p class="text-muted mb-6">
              This is a slideover panel. Great for forms and detail views.
            </p>
            <UButton @click="close">Close</UButton>
          </div>
        </template>
      </USlideover>
    </section>

    <USeparator />

    <!-- Cards Section -->
    <section>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Cards
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard>
          <template #header>
            <h4 class="font-semibold">Card Title</h4>
          </template>
          <p class="text-sm text-muted">
            This is a card component with header and footer.
          </p>
          <template #footer>
            <UButton size="sm" color="primary">Action</UButton>
          </template>
        </UCard>

        <UCard>
          <template #header>
            <h4 class="font-semibold">Another Card</h4>
          </template>
          <p class="text-sm text-muted">
            Cards are great for organizing content.
          </p>
        </UCard>

        <UCard>
          <template #header>
            <h4 class="font-semibold">Third Card</h4>
          </template>
          <p class="text-sm text-muted">
            They adapt to your theme automatically.
          </p>
        </UCard>
      </div>
    </section>
  </div>
</template>