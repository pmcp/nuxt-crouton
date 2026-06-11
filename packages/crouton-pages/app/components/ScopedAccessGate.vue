<script setup lang="ts">
/**
 * Scoped Access Gate — shown when a 'scoped' visibility page is opened
 * without a valid scoped-access token. Redeems the entered code against
 * crouton-auth's generic redeem endpoint for the scope the server announced
 * in the 401 payload (the page's requiredScope, or the page itself).
 *
 * On success the server sets the canonical scoped-access-token cookie, so
 * emitting 'unlocked' and refetching the page is all the parent needs to do.
 */
const props = defineProps<{
  teamId: string
  scope: { resourceType?: string, resourceId?: string }
}>()

const emit = defineEmits<{ unlocked: [] }>()

const { t } = useT()

const pin = ref('')
const name = ref('')
const pending = ref(false)
const errorMessage = ref<string | null>(null)

async function unlock() {
  if (!pin.value.trim() || pending.value) return
  pending.value = true
  errorMessage.value = null

  try {
    await $fetch('/api/auth/scoped-access/redeem', {
      method: 'POST',
      body: {
        teamId: props.teamId,
        resourceType: props.scope.resourceType,
        resourceId: props.scope.resourceId,
        secret: pin.value.trim(),
        displayName: name.value.trim() || t('pages.scopedGate.guestName', 'Guest')
      }
    })
    emit('unlocked')
  }
  catch (err: any) {
    const status = err?.statusCode ?? err?.status
    if (status === 429) {
      errorMessage.value = t('pages.scopedGate.locked', 'Too many attempts — try again later')
    }
    else if (status === 410) {
      errorMessage.value = t('pages.scopedGate.exhausted', 'This access code is no longer available')
    }
    else {
      errorMessage.value = t('pages.scopedGate.invalid', 'Invalid access code')
    }
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex justify-center items-center py-24 px-4">
    <UCard class="w-full max-w-sm">
      <div class="flex flex-col items-center text-center gap-2 mb-6">
        <div class="flex items-center justify-center size-12 rounded-full bg-elevated">
          <UIcon name="i-lucide-key-round" class="size-6 text-muted" />
        </div>
        <h2 class="text-xl font-semibold">
          {{ t('pages.scopedGate.title', 'Access code required') }}
        </h2>
        <p class="text-sm text-muted">
          {{ t('pages.scopedGate.description', 'This page is only available with an access code.') }}
        </p>
      </div>

      <form class="flex flex-col gap-3" @submit.prevent="unlock">
        <UInput
          v-model="name"
          :placeholder="t('pages.scopedGate.namePlaceholder', 'Your name (optional)')"
          icon="i-lucide-user"
          size="lg"
          autocomplete="off"
        />
        <UInput
          v-model="pin"
          :placeholder="t('pages.scopedGate.pinPlaceholder', 'Access code')"
          icon="i-lucide-key-round"
          size="lg"
          type="password"
          autocomplete="off"
          autofocus
        />

        <p v-if="errorMessage" class="text-sm text-error">
          {{ errorMessage }}
        </p>

        <UButton
          type="submit"
          color="primary"
          size="lg"
          block
          :loading="pending"
          :disabled="!pin.trim()"
        >
          {{ t('pages.scopedGate.submit', 'Unlock') }}
        </UButton>
      </form>
    </UCard>
  </div>
</template>
