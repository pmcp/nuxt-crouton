<template>
  <div v-if="isDev" class="translation-dev-toggle">
    <UButton
      size="sm"
      color="gray"
      variant="soft"
      icon="i-lucide-languages"
      :class="{ 'active': enabled }"
      @click="toggleDevMode"
    >
      {{ enabled ? 'Disable translation dev mode' : 'Enable translation dev mode' }}
    </UButton>

    <!-- Translation Modal -->
    <UModal v-model="showModal">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Add Missing Translation</h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Key</label>
              <UInput v-model="modalKey" disabled />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">
                Translation ({{ currentLocale }})
              </label>
              <UTextarea
                v-model="modalTranslation"
                :rows="3"
                placeholder="Enter translation..."
                autofocus
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <UButton color="gray" variant="ghost" @click="close">
              Cancel
            </UButton>
            <UButton
              color="primary"
              @click="saveTranslation"
              :disabled="!modalTranslation.trim()"
            >
              Save Translation
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const isDev = process.dev
const enabled = useState('devMode.enabled', () => false)
const showModal = ref(false)
const modalKey = ref('')
const modalTranslation = ref('')
const { locale } = useI18n()
const { currentTeam } = useTeam()
const toast = useToast()

const currentLocale = computed(() => locale.value)

const toggleDevMode = () => {
  enabled.value = !enabled.value

  if (enabled.value) {
    startDetection()
  } else {
    stopDetection()
  }
}

const startDetection = () => {
  if (!process.client) return

  // Add class to body for styling
  document.body.classList.add('translation-dev-mode')

  // Initial scan
  scanForMissingTranslations()

  // Add click handler for missing translations
  document.addEventListener('click', handleClick, true)

  // Debug: Log that detection started
  console.log('Translation dev mode: Detection started, scanning for missing translations')
}

const stopDetection = () => {
  if (!process.client) return

  // Remove body class and event listener
  document.body.classList.remove('translation-dev-mode')
  document.removeEventListener('click', handleClick, true)

  // Remove missing translation markers
  document.querySelectorAll('.translation-missing').forEach(el => {
    el.classList.remove('translation-missing')
    el.removeAttribute('data-key')
  })
}

const handleClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement

  // Debug: Log all clicks when dev mode is enabled
  if (enabled.value) {
    console.log('Click detected on:', target, 'Classes:', target.classList)
  }

  // Check if clicked element or its parent has missing translation
  let element = target
  let depth = 0
  while (element && depth < 5) { // Increased depth to check more parents
    if (element.classList?.contains('translation-missing')) {
      const key = element.getAttribute('data-key')
      console.log('Found translation-missing element:', element, 'Key:', key)
      if (key) {
        e.preventDefault()
        e.stopPropagation()
        modalKey.value = key
        modalTranslation.value = ''
        console.log('Setting showModal to true for key:', key)
        showModal.value = true
        console.log('showModal.value is now:', showModal.value)
        // Force reactivity update
        nextTick(() => {
          console.log('After nextTick, showModal.value:', showModal.value)
        })
        return
      }
    }
    element = element.parentElement as HTMLElement
    depth++
  }
}

const scanForMissingTranslations = () => {
  if (!enabled.value) return

  // Find all elements containing [key] pattern in text content
  const allElements = document.querySelectorAll('*')
  let foundCount = 0

  allElements.forEach(element => {
    // Skip if already marked or is script/style
    if (element.classList.contains('translation-missing') ||
        element.tagName === 'SCRIPT' ||
        element.tagName === 'STYLE') return

    const textContent = element.textContent || ''
    const match = textContent.match(/\[([\w.-]+)\]/)

    if (match && match[1]) {
      element.classList.add('translation-missing')
      element.setAttribute('data-key', match[1])
      element.setAttribute('title', `Click to add translation for: ${match[1]}`)
      foundCount++
      console.log('Marked missing translation:', match[1], 'on element:', element)
    }
  })

  console.log(`Translation scan complete. Found ${foundCount} missing translations.`)
}

const saveTranslation = async () => {
  if (!modalTranslation.value.trim()) return

  try {
    const teamId = currentTeam.value?.id

    if (teamId) {
      await $fetch(`/api/teams/${teamId}/translations-ui`, {
        method: 'POST',
        body: {
          keyPath: modalKey.value,
          category: 'ui',
          values: {
            [currentLocale.value]: modalTranslation.value
          }
        }
      })
    } else {
      await $fetch('/api/super-admin/translations-ui', {
        method: 'POST',
        body: {
          keyPath: modalKey.value,
          category: 'ui',
          values: {
            [currentLocale.value]: modalTranslation.value
          }
        }
      })
    }

    toast.add({
      title: 'Translation Added',
      description: `Added translation for "${modalKey.value}"`,
      color: 'success'
    })

    // Refresh and re-scan
    await refreshNuxtData()
    setTimeout(scanForMissingTranslations, 100)
    showModal.value = false

  } catch (error) {
    console.error('Failed to save translation:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to save translation',
      color: 'error'
    })
  }
}

// Watch for modal state changes
watch(showModal, (newValue) => {
  console.log('showModal changed to:', newValue)
})

// Lifecycle
onMounted(() => {
  if (enabled.value) {
    startDetection()
  }
})

onUnmounted(() => {
  stopDetection()
})
</script>

<style scoped>
.translation-dev-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
}

.translation-dev-toggle button.active {
  background: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
}

/* Global styles for translation dev mode - moved from global to scoped */
:global(.translation-dev-mode .translation-missing) {
  cursor: pointer !important;
  background: rgba(254, 226, 226, 0.3) !important;
  border: 1px solid rgba(239, 68, 68, 0.3) !important;
  border-radius: 4px !important;
  padding: 2px 4px !important;
  margin: -2px -4px !important;
  display: inline-block !important;
}

:global(.translation-dev-mode .translation-missing:hover) {
  background: rgba(254, 226, 226, 0.6) !important;
  border-color: rgba(239, 68, 68, 0.6) !important;
}
</style>
