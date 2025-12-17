<script setup lang="ts">
/**
 * Team Invitations Component
 *
 * Displays list of pending invitations with actions to cancel.
 * Also shows invitations the current user has received.
 *
 * @example
 * ```vue
 * <TeamInvitations />
 * ```
 */
import type { MemberRole } from '../../../types'

interface InvitationData {
  id: string
  organizationId: string
  email: string
  role: MemberRole
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  expiresAt: string | Date
  inviterId?: string
  inviter?: {
    name?: string | null
    email: string
  }
}

interface Props {
  /** Show pending invitations for current team (admin view) */
  showTeamInvitations?: boolean
  /** Show invitations received by current user */
  showUserInvitations?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showTeamInvitations: true,
  showUserInvitations: false,
})

const {
  currentTeam,
  getPendingInvitations,
  cancelInvitation,
  acceptInvitation,
  rejectInvitation,
  canManageMembers,
  loading: teamLoading,
} = useTeam()

const toast = useToast()

// State
const invitations = ref<InvitationData[]>([])
const loadingInvitationId = ref<string | null>(null)
const isLoading = ref(false)

// Load invitations
async function loadInvitations() {
  if (!props.showTeamInvitations || !currentTeam.value) return

  isLoading.value = true
  try {
    const result = await getPendingInvitations()
    invitations.value = result as InvitationData[]
  } catch (e) {
    console.error('Failed to load invitations:', e)
    invitations.value = []
  } finally {
    isLoading.value = false
  }
}

// Load on mount and when team changes
onMounted(loadInvitations)
watch(currentTeam, loadInvitations)

// Handle cancel invitation
async function handleCancel(invitationId: string) {
  loadingInvitationId.value = invitationId
  try {
    await cancelInvitation(invitationId)
    toast.add({
      title: 'Invitation cancelled',
      description: 'The invitation has been cancelled.',
      color: 'success',
    })
    // Remove from list
    invitations.value = invitations.value.filter(i => i.id !== invitationId)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to cancel invitation'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    loadingInvitationId.value = null
  }
}

// Handle accept invitation (user view)
async function handleAccept(invitationId: string) {
  loadingInvitationId.value = invitationId
  try {
    await acceptInvitation(invitationId)
    toast.add({
      title: 'Invitation accepted',
      description: 'You have joined the team.',
      color: 'success',
    })
    // Remove from list
    invitations.value = invitations.value.filter(i => i.id !== invitationId)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to accept invitation'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    loadingInvitationId.value = null
  }
}

// Handle reject invitation (user view)
async function handleReject(invitationId: string) {
  loadingInvitationId.value = invitationId
  try {
    await rejectInvitation(invitationId)
    toast.add({
      title: 'Invitation declined',
      description: 'The invitation has been declined.',
      color: 'info',
    })
    // Remove from list
    invitations.value = invitations.value.filter(i => i.id !== invitationId)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to decline invitation'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    loadingInvitationId.value = null
  }
}

// Format expiry date
function formatExpiry(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) return 'Expired'
  if (diffHours < 1) return 'Less than 1 hour'
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'}`
  return `${diffDays} day${diffDays === 1 ? '' : 's'}`
}

// Role badge color
function roleBadgeColor(role: MemberRole): string {
  switch (role) {
    case 'owner':
      return 'primary'
    case 'admin':
      return 'info'
    default:
      return 'neutral'
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold">
        {{ showUserInvitations ? 'Your Invitations' : 'Pending Invitations' }}
      </h3>
      <p class="text-sm text-muted mt-1">
        {{
          showUserInvitations
            ? 'Invitations you have received to join teams.'
            : 'Invitations waiting to be accepted.'
        }}
      </p>
    </div>

    <!-- Loading State -->
    <div
      v-if="(isLoading || teamLoading) && invitations.length === 0"
      class="py-8 text-center text-muted"
    >
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto mb-2" />
      <p>Loading invitations...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="invitations.length === 0"
      class="py-8 text-center text-muted"
    >
      <UIcon name="i-lucide-mail-open" class="size-8 mx-auto mb-2" />
      <p>No pending invitations</p>
    </div>

    <!-- Invitations List -->
    <div v-else class="divide-y divide-border rounded-lg border border-border overflow-hidden">
      <div
        v-for="invitation in invitations"
        :key="invitation.id"
        class="flex items-center justify-between py-3 px-4 hover:bg-muted/50 transition-colors"
      >
        <div class="flex items-center gap-3">
          <UIcon
            name="i-lucide-mail"
            class="size-5 text-muted-foreground"
          />
          <div>
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ invitation.email }}</span>
              <UBadge
                :color="roleBadgeColor(invitation.role)"
                variant="subtle"
                size="xs"
              >
                {{ invitation.role }}
              </UBadge>
            </div>
            <p class="text-xs text-muted">
              Expires in {{ formatExpiry(invitation.expiresAt) }}
              <template v-if="invitation.inviter">
                &bull; Invited by {{ invitation.inviter.name || invitation.inviter.email }}
              </template>
            </p>
          </div>
        </div>

        <!-- Admin Actions (Cancel) -->
        <div v-if="showTeamInvitations && canManageMembers" class="flex items-center gap-2">
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            color="error"
            size="sm"
            :loading="loadingInvitationId === invitation.id"
            title="Cancel invitation"
            @click="handleCancel(invitation.id)"
          >
            Cancel
          </UButton>
        </div>

        <!-- User Actions (Accept/Reject) -->
        <div v-if="showUserInvitations" class="flex items-center gap-2">
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            size="sm"
            :loading="loadingInvitationId === invitation.id"
            @click="handleReject(invitation.id)"
          >
            Decline
          </UButton>
          <UButton
            icon="i-lucide-check"
            size="sm"
            :loading="loadingInvitationId === invitation.id"
            @click="handleAccept(invitation.id)"
          >
            Accept
          </UButton>
        </div>
      </div>
    </div>

    <!-- Refresh Button -->
    <div v-if="invitations.length > 0" class="flex justify-end">
      <UButton
        variant="ghost"
        size="sm"
        icon="i-lucide-refresh-cw"
        :loading="isLoading"
        @click="loadInvitations"
      >
        Refresh
      </UButton>
    </div>
  </div>
</template>
