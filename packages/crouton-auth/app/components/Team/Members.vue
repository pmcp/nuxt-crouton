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

withDefaults(defineProps<Props>(), {
  showInviteButton: true
})

const emit = defineEmits<{
  /** Emitted when invite is clicked */
  invite: []
}>()

const { t } = useT()
const {
  currentTeam,
  members,
  loadMembers,
  updateMemberRole,
  removeMember,
  canManageMembers,
  canInviteMembers,
  isOwner,
  loading: teamLoading
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
        title: t('teams.roleUpdated'),
        description: t('teams.roleUpdatedDescription'),
        color: 'success'
      })
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('teams.failedToUpdateRole')
    toast.add({
      title: t('errors.generic'),
      description: message,
      color: 'error'
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
        title: t('teams.memberRemoved'),
        description: t('teams.memberRemovedDescription'),
        color: 'success'
      })
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('teams.failedToRemoveMember')
    toast.add({
      title: t('errors.generic'),
      description: message,
      color: 'error'
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
    member: 2
  }
  return [...members.value].sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">
          {{ t('teams.teamMembers') }}
        </h3>
        <p class="text-sm text-muted mt-1">
          {{ t('teams.memberCount', { count: members.length }) }}
        </p>
      </div>
      <UButton
        v-if="showInviteButton && canInviteMembers"
        icon="i-lucide-user-plus"
        @click="emit('invite')"
      >
        {{ t('teams.invite') }}
      </UButton>
    </div>

    <!-- Loading State -->
    <div
      v-if="teamLoading && members.length === 0"
      class="py-8 text-center text-muted"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-6 animate-spin mx-auto mb-2"
      />
      <p>{{ t('teams.loadingMembers') }}</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="members.length === 0"
      class="py-8 text-center text-muted"
    >
      <UIcon
        name="i-lucide-users"
        class="size-8 mx-auto mb-2"
      />
      <p>{{ t('teams.noMembersFound') }}</p>
    </div>

    <!-- Members Grid -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="member in sortedMembers"
        :key="member.id"
        class="relative p-4 rounded-lg border border-default bg-elevated hover:bg-muted/50 transition-colors"
      >
        <!-- Role badge in corner -->
        <div class="absolute top-3 right-3">
          <UBadge
            :color="member.role === 'owner' ? 'primary' : member.role === 'admin' ? 'info' : 'neutral'"
            variant="subtle"
            size="xs"
          >
            {{ member.role }}
          </UBadge>
        </div>

        <!-- Member info centered -->
        <div class="flex flex-col items-center text-center pt-2 pb-4">
          <UAvatar
            :src="member.user?.image"
            :text="(member.user?.name || member.user?.email || '?').slice(0, 2).toUpperCase()"
            size="xl"
            class="mb-3"
          />
          <div class="font-medium truncate max-w-full">
            {{ member.user?.name || member.user?.email || 'Unknown' }}
            <span v-if="member.userId === user?.id" class="text-xs text-muted">({{ t('teams.you') }})</span>
          </div>
          <div class="text-sm text-muted truncate max-w-full">
            {{ member.user?.email }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-center gap-2 pt-3 border-t border-default">
          <USelectMenu
            v-if="canManageMembers && !(member.userId === user?.id && !isOwner) && !(member.role === 'owner' && !isOwner)"
            :model-value="member.role"
            :items="[
              { label: t('teams.member'), value: 'member' },
              { label: t('teams.admin'), value: 'admin' },
              ...(isOwner && member.userId !== user?.id ? [{ label: t('teams.owner'), value: 'owner' }] : [])
            ]"
            value-key="value"
            :disabled="loadingMemberId === member.id"
            size="sm"
            class="w-28"
            @update:model-value="(role: MemberRole) => handleRoleChange(member.id, role)"
          />

          <UButton
            v-if="canManageMembers && member.userId !== user?.id && member.role !== 'owner'"
            icon="i-lucide-user-x"
            variant="ghost"
            color="error"
            size="sm"
            :loading="loadingMemberId === member.id"
            @click="handleRemove(member.id)"
          />

          <!-- Show placeholder if no actions available -->
          <span
            v-if="!canManageMembers || (member.userId === user?.id && !isOwner) || (member.role === 'owner' && !isOwner)"
            class="text-xs text-muted"
          >
            {{ t('teams.noActions') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
