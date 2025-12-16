<script setup lang="ts">
/**
 * Team Members Component
 *
 * Displays list of team members with management actions.
 * Includes role management and member removal.
 *
 * @example
 * ```vue
 * <TeamMembers @invite="openInviteModal" />
 * ```
 */
import type { MemberRole } from '../../../types'

interface Props {
  /** Show invite button */
  showInviteButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showInviteButton: true,
})

const emit = defineEmits<{
  /** Emitted when invite is clicked */
  invite: []
}>()

const {
  currentTeam,
  members,
  loadMembers,
  updateMemberRole,
  removeMember,
  canManageMembers,
  canInviteMembers,
  isOwner,
  loading: teamLoading,
} = useTeam()

const { user } = useSession()
const toast = useToast()

// Local loading state
const loadingMemberId = ref<string | null>(null)

// Load members on mount
onMounted(async () => {
  await loadMembers()
})

// Reload when team changes
watch(currentTeam, async () => {
  await loadMembers()
})

// Handle role change
async function handleRoleChange(memberId: string, role: MemberRole) {
  loadingMemberId.value = memberId
  try {
    // Find member by ID to get userId
    const member = members.value.find(m => m.id === memberId)
    if (member) {
      await updateMemberRole(member.userId, role)
      toast.add({
        title: 'Role updated',
        description: 'Member role has been updated.',
        color: 'success',
      })
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update role'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    loadingMemberId.value = null
  }
}

// Handle member removal
async function handleRemove(memberId: string) {
  loadingMemberId.value = memberId
  try {
    // Find member by ID to get userId
    const member = members.value.find(m => m.id === memberId)
    if (member) {
      await removeMember(member.userId)
      toast.add({
        title: 'Member removed',
        description: 'Member has been removed from the team.',
        color: 'success',
      })
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to remove member'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    loadingMemberId.value = null
  }
}

// Sort members: owners first, then admins, then members
const sortedMembers = computed(() => {
  const roleOrder: Record<MemberRole, number> = {
    owner: 0,
    admin: 1,
    member: 2,
  }
  return [...members.value].sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Team Members</h3>
        <p class="text-sm text-muted mt-1">
          {{ members.length }} member{{ members.length === 1 ? '' : 's' }}
        </p>
      </div>
      <UButton
        v-if="showInviteButton && canInviteMembers"
        icon="i-lucide-user-plus"
        @click="emit('invite')"
      >
        Invite
      </UButton>
    </div>

    <!-- Loading State -->
    <div
      v-if="teamLoading && members.length === 0"
      class="py-8 text-center text-muted"
    >
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto mb-2" />
      <p>Loading members...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="members.length === 0"
      class="py-8 text-center text-muted"
    >
      <UIcon name="i-lucide-users" class="size-8 mx-auto mb-2" />
      <p>No members found</p>
    </div>

    <!-- Members List -->
    <div v-else class="divide-y divide-border rounded-lg border border-border overflow-hidden">
      <TeamMemberRow
        v-for="member in sortedMembers"
        :key="member.id"
        :member="member"
        :current-user-id="user?.id"
        :can-manage="canManageMembers"
        :is-owner="isOwner"
        :loading="loadingMemberId === member.id"
        @role-change="handleRoleChange"
        @remove="handleRemove"
      />
    </div>
  </div>
</template>
