<script setup lang="ts">
/**
 * Team Members Component
 *
 * Displays list of team members with management actions.
 * Includes role management and member removal.
 * Supports grid (card) and table (list) layouts.
 *
 * @example
 * ```vue
 * <TeamMembers @invite="openInviteModal" />
 * ```
 */
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { MemberRole, Member, MemberWithUser } from '../../../types'

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
const notify = useNotify()

// Layout toggle
const layout = ref<'grid' | 'table'>('grid')

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
      notify.success(t('teams.roleUpdated'), { description: t('teams.roleUpdatedDescription') })
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('teams.failedToUpdateRole')
    notify.error(t('errors.generic'), { description: message })
  } finally {
    loadingMemberId.value = null
  }
}

// Handle member removal
async function handleRemove(memberId: string) {
  loadingMemberId.value = memberId
  try {
    await removeMember(memberId)
    notify.success(t('teams.memberRemoved'), { description: t('teams.memberRemovedDescription') })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('teams.failedToRemoveMember')
    notify.error(t('errors.generic'), { description: message })
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

// Table columns
const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const USelectMenu = resolveComponent('USelectMenu')
const UButton = resolveComponent('UButton')

type MemberRow = Member | MemberWithUser

const columns = computed<TableColumn<MemberRow>[]>(() => {
  const cols: TableColumn<MemberRow>[] = [
    {
      id: 'name',
      header: t('teams.name'),
      cell: ({ row }) => {
        const member = row.original
        const memberUser = 'user' in member ? member.user : undefined
        const displayName = memberUser?.name || memberUser?.email || 'Unknown'
        const initials = (memberUser?.name || memberUser?.email || '?').slice(0, 2).toUpperCase()

        const children = [
          h(UAvatar, {
            src: memberUser?.image,
            text: initials,
            size: 'sm',
            class: 'mr-2'
          }),
          h('span', { class: 'font-medium' }, displayName),
          ...(member.userId === user.value?.id
            ? [h('span', { class: 'text-xs text-muted ml-1' }, `(${t('teams.you')})`)]
            : [])
        ]

        return h('div', { class: 'flex items-center' }, children)
      }
    },
    {
      id: 'email',
      header: t('teams.email'),
      cell: ({ row }) => {
        const member = row.original
        const memberUser = 'user' in member ? member.user : undefined
        return h('span', { class: 'text-sm text-muted' }, memberUser?.email || '')
      }
    },
    {
      id: 'role',
      header: t('teams.role'),
      cell: ({ row }) => {
        const color = ({
          owner: 'primary' as const,
          admin: 'info' as const,
          member: 'neutral' as const
        })[row.original.role]
        return h(UBadge, { color, variant: 'subtle', size: 'xs', class: 'capitalize' }, () => row.original.role)
      }
    }
  ]

  if (canManageMembers.value) {
    cols.push({
      id: 'actions',
      header: t('teams.actions'),
      meta: { class: { td: 'text-right', th: 'text-right' } },
      cell: ({ row }) => {
        const member = row.original
        const isSelf = member.userId === user.value?.id
        const isOwnerRole = member.role === 'owner'
        const canChangeRole = !(isSelf && !isOwner.value) && !(isOwnerRole && !isOwner.value)
        const canRemove = !isSelf && !isOwnerRole

        const children = []

        if (canChangeRole) {
          children.push(h(USelectMenu, {
            'modelValue': member.role,
            'items': [
              { label: t('teams.member'), value: 'member' },
              { label: t('teams.admin'), value: 'admin' },
              ...(isOwner.value && !isSelf ? [{ label: t('teams.owner'), value: 'owner' }] : [])
            ],
            'valueKey': 'value',
            'disabled': loadingMemberId.value === member.id,
            'size': 'sm',
            'class': 'w-28',
            'onUpdate:modelValue': (role: MemberRole) => handleRoleChange(member.id, role)
          }))
        }

        if (canRemove) {
          children.push(h(resolveComponent('CroutonConfirmButton'), {
            label: t('teams.remove'),
            confirmLabel: t('teams.sure'),
            icon: 'i-lucide-user-x',
            loading: loadingMemberId.value === member.id,
            onConfirm: () => handleRemove(member.id)
          }))
        }

        if (!children.length) {
          children.push(h('span', { class: 'text-xs text-muted' }, t('teams.noActions')))
        }

        return h('div', { class: 'flex items-center justify-end gap-2' }, children)
      }
    })
  }

  return cols
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
      <div class="flex items-center gap-2">
        <div class="flex items-center rounded-md border border-default">
          <UButton
            icon="i-lucide-layout-grid"
            :variant="layout === 'grid' ? 'subtle' : 'ghost'"
            :color="layout === 'grid' ? 'primary' : 'neutral'"
            size="xs"
            @click="layout = 'grid'"
          />
          <UButton
            icon="i-lucide-list"
            :variant="layout === 'table' ? 'subtle' : 'ghost'"
            :color="layout === 'table' ? 'primary' : 'neutral'"
            size="xs"
            @click="layout = 'table'"
          />
        </div>

        <UButton
          v-if="showInviteButton && canInviteMembers"
          icon="i-lucide-user-plus"
          @click="emit('invite')"
        >
          {{ t('teams.invite') }}
        </UButton>
      </div>
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

    <!-- Members Table -->
    <UTable
      v-else-if="layout === 'table'"
      :data="sortedMembers"
      :columns="columns"
      class="flex-1"
    />

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
            :src="(member as any).user?.image"
            :text="((member as any).user?.name || (member as any).user?.email || '?').slice(0, 2).toUpperCase()"
            size="xl"
            class="mb-3"
          />
          <div class="font-medium truncate max-w-full">
            {{ (member as any).user?.name || (member as any).user?.email || 'Unknown' }}
            <span v-if="member.userId === user?.id" class="text-xs text-muted">({{ t('teams.you') }})</span>
          </div>
          <div class="text-sm text-muted truncate max-w-full">
            {{ (member as any).user?.email }}
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

          <CroutonConfirmButton
            v-if="canManageMembers && member.userId !== user?.id && member.role !== 'owner'"
            :label="t('teams.remove')"
            :confirm-label="t('teams.sure')"
            icon="i-lucide-user-x"
            :loading="loadingMemberId === member.id"
            @confirm="handleRemove(member.id)"
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
