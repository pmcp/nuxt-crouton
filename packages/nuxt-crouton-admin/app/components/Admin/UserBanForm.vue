<script setup lang="ts">
/**
 * UserBanForm Component
 *
 * Form for banning a user with reason and duration.
 */
import { ref } from 'vue'
import { z } from 'zod'
import type { AdminUserListItem, BanDuration } from '../../../types/admin'
import { BAN_DURATIONS } from '../../../types/admin'

interface Props {
  /** The user being banned */
  user: AdminUserListItem
  /** Whether the form is submitting */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  submit: [payload: { reason: string, duration: number | null }]
  cancel: []
}>()

const schema = z.object({
  reason: z.string().min(1, 'Please provide a reason for the ban'),
  duration: z.string()
})

const state = ref({
  reason: '',
  duration: '7_days' as BanDuration
})

const durationOptions = BAN_DURATIONS.map(d => ({
  value: d.value,
  label: d.label
}))

function handleSubmit() {
  const selectedDuration = BAN_DURATIONS.find(d => d.value === state.value.duration)
  emit('submit', {
    reason: state.value.reason,
    duration: selectedDuration?.hours ?? null
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
    <!-- User info -->
    <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Banning user
      </p>
      <p class="font-medium text-gray-900 dark:text-white">
        {{ user.name }} ({{ user.email }})
      </p>
    </div>

    <!-- Reason -->
    <UFormField
      label="Reason"
      name="reason"
      required
    >
      <UTextarea
        v-model="state.reason"
        placeholder="Enter the reason for banning this user..."
        :rows="3"
      />
    </UFormField>

    <!-- Duration -->
    <UFormField
      label="Duration"
      name="duration"
    >
      <USelect
        v-model="state.duration"
        :items="durationOptions"
        value-key="value"
        class="w-full"
      />
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
        color="error"
        :loading="loading"
      >
        Ban User
      </UButton>
    </div>
  </UForm>
</template>
