<script setup lang="ts">
/**
 * Accept Invitation Page
 *
 * Handles team invitation acceptance when user clicks the invite link in email.
 * URL: /auth/accept-invitation/:id
 *
 * Flow:
 * - Fetches invitation details (team name, inviter, role) without requiring auth
 * - If not logged in: shows invitation info with Register / Sign In options
 * - If logged in: shows invitation info with Accept / Decline buttons
 * - After accepting: redirects to the team dashboard
 */

definePageMeta({
  layout: 'auth'
})

const route = useRoute()
const router = useRouter()
const notify = useNotify()

const { loggedIn } = useAuth()
const { acceptInvitation, rejectInvitation } = useTeam()
const redirects = useAuthRedirects()
const authModal = useAuthModal()

const invitationId = computed(() => route.params.id as string)
const returnUrl = computed(() => route.fullPath)

// Fetch invitation details (public endpoint, no auth needed)
const { data: invite, error: fetchError, status } = await useFetch(
  () => `/api/auth/invitations/${invitationId.value}`
)

// Accept/reject state
const accepting = ref(false)
const accepted = ref(false)
const acceptError = ref<string | null>(null)

// Auto-accept if user just logged in and returned to this page
onMounted(async () => {
  if (loggedIn.value && invite.value?.status === 'pending') {
    await handleAccept()
  }
})

async function handleAccept() {
  accepting.value = true
  acceptError.value = null

  try {
    await acceptInvitation(invitationId.value)
    accepted.value = true
    notify.success('Invitation accepted', {
      description: `You have joined ${invite.value?.organizationName}.`
    })

    setTimeout(() => {
      router.push('/')
    }, 1500)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to accept invitation'
    acceptError.value = message
    notify.error('Error', { description: message })
  } finally {
    accepting.value = false
  }
}

async function handleReject() {
  try {
    await rejectInvitation(invitationId.value)
    notify.success('Invitation declined')
    await router.push('/')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to decline invitation'
    notify.error('Error', { description: message })
  }
}

function goToRegister() {
  const params = new URLSearchParams({
    redirect: returnUrl.value,
    ...(invite.value?.email && { email: invite.value.email })
  })
  navigateTo(`/auth/register?${params}`)
}

function goToLogin() {
  navigateTo(`/auth/login?redirect=${encodeURIComponent(returnUrl.value)}`)
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="text-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-12 animate-spin text-primary"
      />
      <p class="mt-4 text-muted">
        Loading invitation...
      </p>
    </div>

    <!-- Invitation not found -->
    <div
      v-else-if="fetchError"
      class="space-y-6"
    >
      <div class="text-center">
        <UIcon
          name="i-lucide-mail-x"
          class="size-12 text-muted"
        />
        <h1 class="mt-4 text-2xl font-bold text-highlighted">
          Invitation Not Found
        </h1>
        <p class="mt-2 text-muted">
          This invitation link is invalid or has been removed.
        </p>
      </div>
      <NuxtLink
        to="/"
        class="block"
      >
        <UButton
          block
          color="neutral"
          variant="outline"
        >
          Go to homepage
        </UButton>
      </NuxtLink>
    </div>

    <!-- Invitation expired or already used -->
    <div
      v-else-if="invite && invite.status !== 'pending'"
      class="space-y-6"
    >
      <div class="text-center">
        <UIcon
          name="i-lucide-clock"
          class="size-12 text-muted"
        />
        <h1 class="mt-4 text-2xl font-bold text-highlighted">
          Invitation {{ invite.status === 'expired' ? 'Expired' : 'Already Used' }}
        </h1>
        <p class="mt-2 text-muted">
          This invitation has {{ invite.status === 'expired' ? 'expired' : `already been ${invite.status}` }}.
          Please ask the team admin to send a new invitation.
        </p>
      </div>
      <NuxtLink
        to="/"
        class="block"
      >
        <UButton
          block
          color="neutral"
          variant="outline"
        >
          Go to homepage
        </UButton>
      </NuxtLink>
    </div>

    <!-- Valid invitation -->
    <div
      v-else-if="invite"
      class="space-y-6"
    >
      <!-- Invitation info -->
      <div class="text-center">
        <UAvatar
          v-if="invite.organizationLogo"
          :src="invite.organizationLogo"
          :alt="invite.organizationName"
          size="xl"
        />
        <UIcon
          v-else
          name="i-lucide-building-2"
          class="size-12 text-primary"
        />

        <h1 class="mt-4 text-2xl font-bold text-highlighted">
          You're invited!
        </h1>
        <p class="mt-2 text-muted">
          <span class="font-medium text-highlighted">{{ invite.inviterName }}</span>
          invited you to join
        </p>
        <p class="text-lg font-semibold text-highlighted">
          {{ invite.organizationName }}
        </p>
        <UBadge
          color="primary"
          variant="subtle"
          class="mt-2"
        >
          {{ invite.role }}
        </UBadge>
      </div>

      <!-- Accepting state -->
      <div
        v-if="accepting"
        class="text-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin text-primary"
        />
        <p class="mt-2 text-muted">
          Joining {{ invite.organizationName }}...
        </p>
      </div>

      <!-- Accepted -->
      <div v-else-if="accepted">
        <UAlert
          color="success"
          icon="i-lucide-check-circle"
          title="You're in!"
          :description="`Welcome to ${invite.organizationName}. Redirecting...`"
        />
      </div>

      <!-- Error -->
      <div v-else-if="acceptError">
        <UAlert
          color="error"
          icon="i-lucide-alert-triangle"
          title="Could not accept invitation"
          :description="acceptError"
        />
        <UButton
          class="mt-4"
          block
          @click="handleAccept"
        >
          Try again
        </UButton>
      </div>

      <!-- Not logged in — show register/login options -->
      <div
        v-else-if="!loggedIn"
        class="space-y-3"
      >
        <USeparator label="Get started" />

        <UButton
          block
          size="lg"
          @click="goToRegister"
        >
          Create an account
        </UButton>
        <UButton
          block
          size="lg"
          color="neutral"
          variant="outline"
          @click="goToLogin"
        >
          I already have an account
        </UButton>
      </div>

      <!-- Logged in — accept/decline -->
      <div
        v-else
        class="space-y-3"
      >
        <UButton
          block
          size="lg"
          @click="handleAccept"
        >
          Accept invitation
        </UButton>
        <UButton
          block
          size="lg"
          color="neutral"
          variant="ghost"
          @click="handleReject"
        >
          Decline
        </UButton>
      </div>
    </div>
  </div>
</template>
