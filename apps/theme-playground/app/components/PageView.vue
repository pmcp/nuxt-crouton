<script setup lang="ts">
// Global theme from useThemeSwitcher (for display only, theme styling is automatic)
const { currentTheme } = useThemeSwitcher()

// Default variant - components will use theme-mapped styles automatically
// Cast to any because different Nuxt UI components have different variant type unions
const variant = computed(() => 'solid' as any)

// Modal state
const isModalOpen = ref(false)

// Switch states
const switchEnabled = ref(false)
const checkboxChecked = ref(false)
const radioValue = ref('option1')

// Select options
const selectValue = ref('')
const selectOptions = [
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
  { label: 'Option 3', value: 'option3' }
]

// Tabs
const tabItems = [
  { label: 'Account', slot: 'account' },
  { label: 'Notifications', slot: 'notifications' },
  { label: 'Security', slot: 'security' }
]

// Accordion items
const accordionItems = [
  {
    label: 'Getting Started',
    content: 'Welcome to the theme canvas! This is where you can test different theme variants.'
  },
  {
    label: 'Theme Selection',
    content: 'Use the theme and variant dropdowns in the toolbar to change the appearance of all components.'
  },
  {
    label: 'Component Variants',
    content: 'All Nuxt UI components on this page will automatically update when you switch themes.'
  }
]

// Dropdown menu items
const dropdownItems = [
  { label: 'Edit', icon: 'i-lucide-pencil' },
  { label: 'Duplicate', icon: 'i-lucide-copy' },
  { type: 'separator' as const },
  { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const }
]

// Table data
const tableColumns: any[] = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'email', accessorKey: 'email', header: 'Email' },
  { id: 'status', accessorKey: 'status', header: 'Status' }
]

const tableData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'pending' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive' }
]

// Input state
const inputValue = ref('')
const textareaValue = ref('')

// Colors for buttons/badges
const colors = ['primary', 'secondary', 'neutral', 'error', 'warning', 'info', 'success'] as const

// Crouton components state
const paginationPage = ref(1)
const paginationPageCount = ref(10)
const formLayoutTab = ref('general')
const formLayoutTabs = [
  { label: 'General', value: 'general', icon: 'i-lucide-settings' },
  { label: 'Details', value: 'details', icon: 'i-lucide-file-text' },
  { label: 'Advanced', value: 'advanced', icon: 'i-lucide-sliders' }
]
</script>

<template>
  <div class="h-full overflow-auto bg-[var(--ui-bg)]">
    <div class="max-w-6xl mx-auto px-8 py-12 space-y-16">
      <!-- Current Theme Indicator -->
      <div class="text-center">
        <h1 class="text-3xl font-bold mb-2">Page View</h1>
        <p class="text-sm text-[var(--ui-text-muted)]">
          Current Theme: <span class="font-semibold text-[var(--ui-text)]">{{ currentTheme }}</span>
          <span v-if="variant" class="ml-2 text-xs">
            (variant: <code class="bg-[var(--ui-bg-elevated)] px-1 rounded">{{ variant }}</code>)
          </span>
        </p>
      </div>

      <!-- Section: Buttons -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Buttons</h2>

        <div class="space-y-6">
          <!-- Color variants -->
          <div>
            <h3 class="text-sm font-medium text-[var(--ui-text-muted)] mb-3">Colors</h3>
            <div class="flex flex-wrap gap-3">
              <UButton v-for="color in colors" :key="color" :variant="variant" :color="color">
                {{ color }}
              </UButton>
            </div>
          </div>

          <!-- Sizes -->
          <div>
            <h3 class="text-sm font-medium text-[var(--ui-text-muted)] mb-3">Sizes</h3>
            <div class="flex flex-wrap items-center gap-3">
              <UButton :variant="variant" size="xs">Extra Small</UButton>
              <UButton :variant="variant" size="sm">Small</UButton>
              <UButton :variant="variant" size="md">Medium</UButton>
              <UButton :variant="variant" size="lg">Large</UButton>
              <UButton :variant="variant" size="xl">Extra Large</UButton>
            </div>
          </div>

          <!-- States -->
          <div>
            <h3 class="text-sm font-medium text-[var(--ui-text-muted)] mb-3">States</h3>
            <div class="flex flex-wrap gap-3">
              <UButton :variant="variant" disabled>Disabled</UButton>
              <UButton :variant="variant" loading>Loading</UButton>
              <UButton :variant="variant" icon="i-lucide-plus">With Icon</UButton>
              <UButton :variant="variant" icon="i-lucide-arrow-right" trailing>Trailing Icon</UButton>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Form Inputs -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Form Inputs</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Text Input -->
          <div class="space-y-4">
            <UFormField label="Text Input" name="text">
              <UInput v-model="inputValue" :variant="variant" placeholder="Enter text..." />
            </UFormField>

            <UFormField label="With Icon" name="icon">
              <UInput :variant="variant" placeholder="Search..." icon="i-lucide-search" />
            </UFormField>

            <UFormField label="Disabled" name="disabled">
              <UInput :variant="variant" placeholder="Disabled input" disabled />
            </UFormField>

            <UFormField label="Password" name="password">
              <UInput :variant="variant" type="password" placeholder="Enter password..." />
            </UFormField>
          </div>

          <!-- Textarea and Select -->
          <div class="space-y-4">
            <UFormField label="Textarea" name="textarea">
              <UTextarea v-model="textareaValue" :variant="variant" placeholder="Enter long text..." />
            </UFormField>

            <UFormField label="Select" name="select">
              <USelect v-model="selectValue" :variant="variant" :items="selectOptions" placeholder="Choose an option..." />
            </UFormField>
          </div>
        </div>
      </section>

      <!-- Section: Switches, Checkboxes, Radios -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Controls</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Switch -->
          <div>
            <h3 class="text-sm font-medium text-[var(--ui-text-muted)] mb-3">Switch</h3>
            <div class="space-y-3">
              <USwitch v-model="switchEnabled" :variant="variant" label="Enable feature" />
              <USwitch :variant="variant" label="Disabled switch" disabled />
            </div>
          </div>

          <!-- Checkbox -->
          <div>
            <h3 class="text-sm font-medium text-[var(--ui-text-muted)] mb-3">Checkbox</h3>
            <div class="space-y-3">
              <UCheckbox v-model="checkboxChecked" :variant="variant" label="Accept terms" />
              <UCheckbox :variant="variant" label="Disabled checkbox" disabled />
            </div>
          </div>

          <!-- Radio -->
          <div>
            <h3 class="text-sm font-medium text-[var(--ui-text-muted)] mb-3">Radio</h3>
            <div class="space-y-3">
              <URadioGroup
                v-model="radioValue"
                :variant="variant"
                :items="[
                  { label: 'Option 1', value: 'option1' },
                  { label: 'Option 2', value: 'option2' },
                  { label: 'Option 3', value: 'option3' }
                ]"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Cards -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Cards</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UCard :variant="variant">
            <template #header>
              <h3 class="font-semibold">Card Title</h3>
            </template>
            <p class="text-sm text-[var(--ui-text-muted)]">
              This is a simple card with header and body content.
            </p>
          </UCard>

          <UCard :variant="variant">
            <template #header>
              <h3 class="font-semibold">With Footer</h3>
            </template>
            <p class="text-sm text-[var(--ui-text-muted)]">
              Card content goes here with some descriptive text.
            </p>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton :variant="variant" color="neutral" size="sm">Cancel</UButton>
                <UButton :variant="variant" size="sm">Save</UButton>
              </div>
            </template>
          </UCard>

          <UCard :variant="variant">
            <div class="text-center py-4">
              <div class="text-4xl mb-2">✨</div>
              <h3 class="font-semibold mb-1">Feature Highlight</h3>
              <p class="text-sm text-[var(--ui-text-muted)]">
                Showcase important features
              </p>
            </div>
          </UCard>
        </div>
      </section>

      <!-- Section: Badges -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Badges</h2>

        <div class="space-y-4">
          <div>
            <h3 class="text-sm font-medium text-[var(--ui-text-muted)] mb-3">Colors</h3>
            <div class="flex flex-wrap gap-2">
              <UBadge v-for="color in colors" :key="color" :variant="variant" :color="color">
                {{ color }}
              </UBadge>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-medium text-[var(--ui-text-muted)] mb-3">Sizes</h3>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :variant="variant" size="sm">Small</UBadge>
              <UBadge :variant="variant" size="md">Medium</UBadge>
              <UBadge :variant="variant" size="lg">Large</UBadge>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Alerts -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Alerts</h2>

        <div class="space-y-4">
          <UAlert :variant="variant" color="info" title="Information" description="This is an informational alert message." icon="i-lucide-info" />
          <UAlert :variant="variant" color="success" title="Success" description="Your changes have been saved successfully." icon="i-lucide-check-circle" />
          <UAlert :variant="variant" color="warning" title="Warning" description="Please review your settings before proceeding." icon="i-lucide-alert-triangle" />
          <UAlert :variant="variant" color="error" title="Error" description="An error occurred while processing your request." icon="i-lucide-x-circle" />
        </div>
      </section>

      <!-- Section: Dropdown Menu -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Dropdown Menu</h2>

        <UDropdownMenu :items="dropdownItems">
          <UButton :variant="variant" trailing-icon="i-lucide-chevron-down">
            Actions
          </UButton>
        </UDropdownMenu>
      </section>

      <!-- Section: Modal -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Modal</h2>

        <UButton :variant="variant" @click="isModalOpen = true">
          Open Modal
        </UButton>

        <UModal v-model:open="isModalOpen">
          <template #content="{ close }">
            <div class="p-6">
              <h3 class="text-lg font-semibold mb-4">Modal Title</h3>
              <p class="text-sm text-[var(--ui-text-muted)] mb-6">
                This is a modal dialog. You can put any content here.
              </p>
              <div class="flex justify-end gap-2">
                <UButton :variant="variant" color="neutral" @click="close">
                  Cancel
                </UButton>
                <UButton :variant="variant" @click="close">
                  Confirm
                </UButton>
              </div>
            </div>
          </template>
        </UModal>
      </section>

      <!-- Section: Tabs -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Tabs</h2>

        <UTabs :items="tabItems" :variant="variant">
          <template #account>
            <UCard :variant="variant" class="mt-4">
              <p>Manage your account settings and preferences.</p>
            </UCard>
          </template>
          <template #notifications>
            <UCard :variant="variant" class="mt-4">
              <p>Configure your notification preferences.</p>
            </UCard>
          </template>
          <template #security>
            <UCard :variant="variant" class="mt-4">
              <p>Update your security settings and password.</p>
            </UCard>
          </template>
        </UTabs>
      </section>

      <!-- Section: Accordion -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Accordion</h2>

        <UAccordion :items="accordionItems" :variant="variant" />
      </section>

      <!-- Section: Progress -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Progress</h2>

        <div class="space-y-4 max-w-md">
          <UProgress :value="25" :variant="variant" />
          <UProgress :value="50" :variant="variant" color="success" />
          <UProgress :value="75" :variant="variant" color="warning" />
          <UProgress :value="100" :variant="variant" color="error" />
        </div>
      </section>

      <!-- Section: Avatars -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Avatars</h2>

        <div class="flex flex-wrap items-center gap-4">
          <UAvatar :variant="variant" text="JD" size="sm" />
          <UAvatar :variant="variant" text="AB" size="md" />
          <UAvatar :variant="variant" text="XY" size="lg" />
          <UAvatar :variant="variant" src="https://i.pravatar.cc/150?img=1" alt="User avatar" size="lg" />
          <UAvatar :variant="variant" src="https://i.pravatar.cc/150?img=2" alt="User avatar" size="xl" />
        </div>
      </section>

      <!-- Section: Separator -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Separator</h2>

        <div class="space-y-4">
          <USeparator :variant="variant" />
          <USeparator :variant="variant" label="OR" />
          <div class="flex items-center h-20">
            <span>Left</span>
            <USeparator :variant="variant" orientation="vertical" class="mx-4" />
            <span>Right</span>
          </div>
        </div>
      </section>

      <!-- Section: Table -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Table</h2>

        <UTable :columns="tableColumns" :data="tableData">
          <template #status-cell="{ row }">
            <UBadge
              :variant="variant"
              :color="row.original.status === 'active' ? 'success' : row.original.status === 'pending' ? 'warning' : 'neutral'"
            >
              {{ row.original.status }}
            </UBadge>
          </template>
        </UTable>
      </section>

      <!-- Section: Skeleton -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Skeleton</h2>

        <div class="space-y-4 max-w-md">
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-3/4" />
          <USkeleton class="h-4 w-1/2" />
          <div class="flex items-center gap-4">
            <USkeleton class="h-12 w-12 rounded-full" />
            <div class="space-y-2 flex-1">
              <USkeleton class="h-4 w-full" />
              <USkeleton class="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Slider -->
      <section>
        <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Slider</h2>

        <div class="space-y-6 max-w-md">
          <USlider :default-value="[50]" />
          <USlider :default-value="[25, 75]" />
        </div>
      </section>

      <!-- Crouton Components Section -->
      <div class="border-t-4 border-dashed border-[var(--ui-border)] pt-16 mt-16">
        <div class="text-center mb-12">
          <h1 class="text-3xl font-bold mb-2">Crouton Components</h1>
          <p class="text-sm text-[var(--ui-text-muted)]">
            Components from <code class="bg-[var(--ui-bg-elevated)] px-1 rounded">@fyit/crouton</code>
          </p>
        </div>

        <!-- Section: Appearance Controls -->
        <section>
          <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Appearance Controls</h2>

          <div class="space-y-6">
            <div>
              <h3 class="text-sm font-medium text-[var(--ui-text-muted)] mb-3">Dark Mode Switcher</h3>
              <div class="flex items-center gap-4">
                <CroutonDarkModeSwitcher size="xs" />
                <CroutonDarkModeSwitcher size="sm" />
                <CroutonDarkModeSwitcher size="md" />
                <CroutonDarkModeSwitcher size="lg" />
              </div>
            </div>

            <div>
              <h3 class="text-sm font-medium text-[var(--ui-text-muted)] mb-3">Appearance Switcher (Theme + Dark Mode)</h3>
              <div class="flex items-center gap-6">
                <CroutonAppearanceSwitcher mode="dropdown" size="sm" />
                <CroutonAppearanceSwitcher mode="inline" size="sm" />
                <CroutonAppearanceSwitcher mode="cycle" size="sm" />
              </div>
            </div>
          </div>
        </section>

        <!-- Section: Date Display -->
        <section class="mt-16">
          <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Date Display</h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UCard :variant="variant">
              <template #header>
                <h3 class="font-semibold text-sm">Recent Date</h3>
              </template>
              <CroutonDate :date="new Date()" />
            </UCard>

            <UCard :variant="variant">
              <template #header>
                <h3 class="font-semibold text-sm">Yesterday</h3>
              </template>
              <CroutonDate :date="new Date(Date.now() - 86400000)" />
            </UCard>

            <UCard :variant="variant">
              <template #header>
                <h3 class="font-semibold text-sm">Last Week</h3>
              </template>
              <CroutonDate :date="new Date(Date.now() - 7 * 86400000)" />
            </UCard>
          </div>
        </section>

        <!-- Section: Table Pagination -->
        <section class="mt-16">
          <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Table Pagination</h2>

          <UCard :variant="variant">
            <CroutonTablePagination
              :page="paginationPage"
              :page-count="paginationPageCount"
              :total-items="156"
              @update:page="paginationPage = $event"
              @update:page-count="paginationPageCount = $event"
            />
          </UCard>
        </section>

        <!-- Section: Form Layout -->
        <section class="mt-16">
          <h2 class="text-2xl font-bold mb-6 text-[var(--ui-text)]">Form Layout</h2>

          <UCard :variant="variant" class="p-0">
            <CroutonFormLayout
              v-model="formLayoutTab"
              tabs
              :navigation-items="formLayoutTabs"
            >
              <template #main="{ activeSection }">
                <UCard :variant="variant">
                  <div v-if="activeSection === 'general'" class="space-y-4">
                    <UFormField label="Name" name="name">
                      <UInput :variant="variant" placeholder="Enter name..." />
                    </UFormField>
                    <UFormField label="Email" name="email">
                      <UInput :variant="variant" type="email" placeholder="Enter email..." />
                    </UFormField>
                  </div>
                  <div v-else-if="activeSection === 'details'" class="space-y-4">
                    <UFormField label="Description" name="description">
                      <UTextarea :variant="variant" placeholder="Enter description..." />
                    </UFormField>
                  </div>
                  <div v-else-if="activeSection === 'advanced'" class="space-y-4">
                    <UFormField label="API Key" name="apiKey">
                      <UInput :variant="variant" type="password" placeholder="Enter API key..." />
                    </UFormField>
                    <USwitch :variant="variant" label="Enable advanced features" />
                  </div>
                </UCard>
              </template>

              <template #sidebar>
                <UCard :variant="variant">
                  <template #header>
                    <h4 class="font-semibold text-sm">Metadata</h4>
                  </template>
                  <div class="space-y-3 text-sm">
                    <div class="flex justify-between">
                      <span class="text-[var(--ui-text-muted)]">Status</span>
                      <UBadge :variant="variant" color="success" size="sm">Active</UBadge>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-[var(--ui-text-muted)]">Created</span>
                      <span>Dec 22, 2025</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-[var(--ui-text-muted)]">Updated</span>
                      <span>Just now</span>
                    </div>
                  </div>
                </UCard>
              </template>
            </CroutonFormLayout>
          </UCard>
        </section>
      </div>
    </div>
  </div>
</template>