<script setup lang="ts">
/**
 * UserCreateForm Component
 *
 * Form for creating a new user with email, name, password.
 * Optional: superAdmin toggle.
 */
import { ref } from 'vue'
import { z } from 'zod'
import type { CreateUserPayload } from '../../../types/admin'

interface Props {
  /** Whether the form is submitting */
  loading?: boolean
  /** Show super admin toggle */
  showSuperAdminToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showSuperAdminToggle: true
})

const emit = defineEmits<{
  submit: [payload: CreateUserPayload]
  cancel: []
}>()

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  emailVerified: z.boolean(),
  superAdmin: z.boolean()
})

const state = ref({
  name: '',
  email: '',
  password: '',
  emailVerified: true,
  superAdmin: false
})

// Generate a secure random password
function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  state.value.password = password
}

function handleSubmit() {
  emit('submit', {
    name: state.value.name,
    email: state.value.email,
    password: state.value.password,
    emailVerified: state.value.emailVerified,
    superAdmin: state.value.superAdmin
  })
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="handleSubmit"
  >
    <!-- Name -->
    <UFormField
      label="Name"
      name="name"
      required
    >
      <UInput
        v-model="state.name"
        placeholder="John Doe"
        autocomplete="off"
      />
    </UFormField>

    <!-- Email -->
    <UFormField
      label="Email"
      name="email"
      required
    >
      <UInput
        v-model="state.email"
        type="email"
        placeholder="john@example.com"
        autocomplete="off"
      />
    </UFormField>

    <!-- Password -->
    <UFormField
      label="Password"
      name="password"
      required
    >
      <div class="flex gap-2">
        <UInput
          v-model="state.password"
          type="text"
          placeholder="Enter password"
          autocomplete="new-password"
          class="flex-1"
        />
        <UButton
          color="neutral"
          variant="soft"
          icon="i-heroicons-key"
          @click="generatePassword"
        >
          Generate
        </UButton>
      </div>
    </UFormField>

    <!-- Email Verified -->
    <UFormField name="emailVerified">
      <div class="flex items-center gap-2">
        <USwitch v-model="state.emailVerified" />
        <span class="text-sm text-gray-700 dark:text-gray-300">
          Mark email as verified
        </span>
      </div>
    </UFormField>

    <!-- Super Admin Toggle -->
    <UFormField
      v-if="showSuperAdminToggle"
      name="superAdmin"
    >
      <div class="flex items-center gap-2">
        <USwitch v-model="state.superAdmin" />
        <span class="text-sm text-gray-700 dark:text-gray-300">
          Grant super admin privileges
        </span>
      </div>
      <p
        v-if="state.superAdmin"
        class="mt-1 text-xs text-amber-600 dark:text-amber-400"
      >
        Super admins have full access to the admin panel
      </p>
    </UFormField>

    <!-- Actions -->
    <div class="flex justify-end gap-2 pt-2">
      <UButton
        color="neutral"
        variant="ghost"
        :disabled="loading"
        @click="emit('cancel')"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        color="primary"
        :loading="loading"
      >
        Create User
      </UButton>
    </div>
  </UForm>
</template>
