<script setup lang="ts">
/**
 * Helper login (PIN + name) for a specific event.
 * No dropdown of past helpers — each session is a fresh scoped-access token.
 *
 * @route /order/[team]/[event]/login
 */
definePageMeta({ layout: false })

interface SalesEvent {
  id: string
  teamId: string
  title: string
  slug: string
}

const { t } = useT()
const route = useRoute()
const teamSlug = computed(() => route.params.team as string)
const eventSlug = computed(() => route.params.event as string)

const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const event = ref<SalesEvent | null>(null)

const formState = reactive({
  helperName: '',
  pin: ''
})

const { login } = useHelperAuth()

onMounted(async () => {
  try {
    event.value = await $fetch<SalesEvent>(
      `/api/crouton-sales/events/${teamSlug.value}/by-slug/${eventSlug.value}`
    )
  }
  catch (err) {
    console.error('Failed to load event:', err)
  }
  finally {
    loading.value = false
  }
})

async function onSubmit() {
  if (!event.value) return

  if (!formState.helperName.trim()) {
    errorMessage.value = t('sales.helperLogin.enterNameError')
    return
  }
  if (!formState.pin.trim()) {
    errorMessage.value = t('sales.helperLogin.enterPinError')
    return
  }

  errorMessage.value = ''
  submitting.value = true

  const success = await login({
    teamId: event.value.teamId,
    eventId: event.value.id,
    pin: formState.pin,
    helperName: formState.helperName.trim()
  })

  submitting.value = false

  if (success) {
    await navigateTo(`/order/${teamSlug.value}/${eventSlug.value}`)
  }
  else {
    errorMessage.value = t('sales.helperLogin.failed')
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center bg-default p-4">
    <div class="w-full max-w-sm space-y-6">
      <div v-if="loading" class="text-center">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl text-primary" />
        <p class="mt-2 text-muted">{{ t('sales.helperLogin.loadingEvent') }}</p>
      </div>

      <div v-else-if="!event" class="text-center">
        <UIcon name="i-lucide-alert-circle" class="text-4xl text-error mb-2" />
        <p class="font-medium">{{ t('sales.helperLogin.eventNotFound') }}</p>
        <p class="text-muted text-sm mt-1">{{ t('sales.helperLogin.checkUrl') }}</p>
      </div>

      <template v-else>
        <div class="text-center">
          <UIcon name="i-lucide-store" class="text-4xl text-primary mb-2" />
          <h1 class="text-xl font-bold">{{ event.title }}</h1>
          <p class="text-muted mt-1">{{ t('sales.helperLogin.title') }}</p>
        </div>

        <UCard>
          <UForm :state="formState" class="space-y-4" @submit="onSubmit">
            <UFormField :label="t('sales.helperLogin.yourName')" name="helperName">
              <UInput
                v-model="formState.helperName"
                :placeholder="t('sales.helperLogin.enterName')"
                size="lg"
                class="w-full"
                autocomplete="name"
              />
            </UFormField>

            <UFormField :label="t('sales.helperLogin.pin')" name="pin">
              <UInput
                v-model="formState.pin"
                type="password"
                :placeholder="t('sales.helperLogin.enterPin')"
                size="lg"
                class="w-full"
                :ui="{ base: 'font-mono text-center tracking-widest' }"
                inputmode="numeric"
                pattern="[0-9]*"
              />
            </UFormField>

            <UButton
              type="submit"
              :loading="submitting"
              block
              size="lg"
              icon="i-lucide-log-in"
            >
              {{ t('sales.helperLogin.login') }}
            </UButton>
          </UForm>
        </UCard>

        <p v-if="errorMessage" class="text-center text-error text-sm">
          {{ errorMessage }}
        </p>
      </template>
    </div>
  </main>
</template>
