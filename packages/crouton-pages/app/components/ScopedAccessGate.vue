<script setup lang="ts">
/**
 * Scoped Access Gate — shown when a 'scoped' visibility page is opened
 * without a valid scoped-access token. Redeems the entered code against
 * crouton-auth's generic redeem endpoint for the scope the server announced
 * in the 401 payload (a derived scope like ('event', eventId), the page's
 * requiredScope, or the page itself).
 *
 * Redemption goes through useScopedAccess so the client keeps its own
 * session (per-resourceType cookie + authHeaders) — that's what lets an
 * embedded kassa adopt this login instead of asking for the PIN again. The
 * server additionally sets the httpOnly scoped-access-token cookie, which is
 * what the page's SSR check reads; emitting 'unlocked' and refetching the
 * page is all the parent needs to do.
 *
 * `scope.nameRequired` (e.g. kassa scopes — the name prints on tickets and
 * lands on order.owner) makes the name field mandatory; whitespace-only
 * input is rejected rather than falling into the 'Guest' default. This is a
 * UX nudge, not a guarantee — the endpoint accepts any non-empty name.
 */
const props = defineProps<{
  teamId: string
  scope: { resourceType?: string, resourceId?: string, nameRequired?: boolean }
}>()

const emit = defineEmits<{ unlocked: [] }>()

const { t } = useT()

// Staff door: a team member signs in with their account (separate backend from
// the access code) and returns here — member access passes the same gate.
const route = useRoute()
const staffLoginUrl = computed(() => `/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)

const scopedAccess = useScopedAccess(props.scope.resourceType || 'page')

const pin = ref('')
const name = ref('')
const errorMessage = ref<string | null>(null)

const pending = computed(() => scopedAccess.isLoading.value)
const nameMissing = computed(() => !!props.scope.nameRequired && !name.value.trim())
const canSubmit = computed(() => !!pin.value.trim() && !nameMissing.value)

async function unlock() {
  if (!canSubmit.value || pending.value) return
  errorMessage.value = null

  const success = await scopedAccess.redeem({
    teamId: props.teamId,
    resourceId: props.scope.resourceId ?? '',
    secret: pin.value.trim(),
    displayName: name.value.trim() || t('pages.scopedGate.guestName', 'Guest')
  })

  if (success) {
    emit('unlocked')
    return
  }

  const status = scopedAccess.errorStatus.value
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
          :placeholder="scope.nameRequired
            ? t('pages.scopedGate.namePlaceholderRequired', 'Your name')
            : t('pages.scopedGate.namePlaceholder', 'Your name (optional)')"
          icon="i-lucide-user"
          size="lg"
          autocomplete="off"
          :autofocus="!!scope.nameRequired"
        />
        <UInput
          v-model="pin"
          :placeholder="t('pages.scopedGate.pinPlaceholder', 'Access code')"
          icon="i-lucide-key-round"
          size="lg"
          type="password"
          autocomplete="off"
          :autofocus="!scope.nameRequired"
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
          :disabled="!canSubmit"
        >
          {{ t('pages.scopedGate.submit', 'Unlock') }}
        </UButton>
      </form>

      <!-- Staff door — member account login (returns to this page). -->
      <div class="text-center mt-4">
        <UButton
          :to="staffLoginUrl"
          variant="link"
          color="neutral"
          size="sm"
          :label="t('pages.scopedGate.staffLogin', 'Team member? Log in')"
        />
      </div>
    </UCard>
  </div>
</template>
