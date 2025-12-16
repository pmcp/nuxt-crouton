<script setup lang="ts">
/**
 * Team Member Invite Form Component
 *
 * Form to invite a new member to the team.
 * Allows setting the role for the invitation.
 *
 * @example
 * ```vue
 * <TeamMemberInviteForm @success="onInvited" @cancel="closeModal" />
 * ```
 */
import type { FormSubmitEvent, FormError } from '@nuxt/ui'
import type { MemberRole } from '../../../types'

interface Props {
  /** External loading state */
  loading?: boolean
  /** External error message */
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
})

const emit = defineEmits<{
  /** Emitted when invitation is sent successfully */
  success: [email: string, role: MemberRole]
  /** Emitted when form is submitted */
  submit: [data: { email: string, role: MemberRole }]
  /** Emitted when cancel is clicked */
  cancel: []
}>()

const { inviteMember, canInviteMembers, isOwner } = useTeam()
const toast = useToast()

// Form state
const state = reactive({
  email: '',
  role: 'member' as MemberRole,
})

// Role options
const roleOptions = computed(() => {
  const roles: Array<{ label: string, value: MemberRole, description: string }> = [
    {
      label: 'Member',
      value: 'member',
      description: 'Can view and use team resources',
    },
    {
      label: 'Admin',
      value: 'admin',
      description: 'Can manage members and settings',
    },
  ]

  // Only owner can invite other owners
  if (isOwner.value) {
    roles.push({
      label: 'Owner',
      value: 'owner',
      description: 'Full control over the team',
    })
  }

  return roles
})

// Validation
function validate(formState: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []

  if (!formState.email?.trim()) {
    errors.push({ name: 'email', message: 'Email is required' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
    errors.push({ name: 'email', message: 'Invalid email address' })
  }

  return errors
}

// Internal loading state
const internalLoading = ref(false)
const isLoading = computed(() => props.loading || internalLoading.value)

// Handle form submission
async function onSubmit(event: FormSubmitEvent<typeof state>) {
  emit('submit', { email: event.data.email, role: event.data.role })

  if (!canInviteMembers.value) {
    toast.add({
      title: 'Permission denied',
      description: 'You do not have permission to invite members.',
      color: 'error',
    })
    return
  }

  internalLoading.value = true
  try {
    await inviteMember({
      email: event.data.email,
      role: event.data.role,
    })

    toast.add({
      title: 'Invitation sent',
      description: `Invitation has been sent to ${event.data.email}.`,
      color: 'success',
    })

    emit('success', event.data.email, event.data.role)

    // Reset form
    state.email = ''
    state.role = 'member'
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to send invitation'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  } finally {
    internalLoading.value = false
  }
}
</script>

<template>
  <UForm
    :validate="validate"
    :state="state"
    class="space-y-6"
    @submit="onSubmit"
  >
    <div>
      <h3 class="text-lg font-semibold">Invite Team Member</h3>
      <p class="text-sm text-muted mt-1">
        Send an invitation to join your team.
      </p>
    </div>

    <UFormField label="Email address" name="email" required>
      <UInput
        v-model="state.email"
        type="email"
        placeholder="colleague@example.com"
        icon="i-lucide-mail"
        :disabled="isLoading"
      />
    </UFormField>

    <UFormField label="Role" name="role">
      <template #hint>
        <span class="text-xs text-muted">
          The role determines what the member can do.
        </span>
      </template>
      <URadioGroup
        v-model="state.role"
        :items="roleOptions"
        :disabled="isLoading"
      >
        <template #label="{ item }">
          <div>
            <p class="font-medium">{{ item.label }}</p>
            <p class="text-xs text-muted">{{ item.description }}</p>
          </div>
        </template>
      </URadioGroup>
    </UFormField>

    <!-- Error Alert -->
    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
    />

    <div class="flex justify-end gap-3">
      <UButton
        variant="ghost"
        :disabled="isLoading"
        @click="emit('cancel')"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        :loading="isLoading"
        icon="i-lucide-send"
      >
        Send invitation
      </UButton>
    </div>
  </UForm>
</template>
