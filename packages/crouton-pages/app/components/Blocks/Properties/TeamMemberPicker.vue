<script setup lang="ts">
/**
 * Team Member Picker for Block Properties
 *
 * Loads team members and provides a searchable select to pick one.
 * Returns the member's userId as the model value.
 */

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { members, loadMembers } = useTeam()

// Load members on mount
const loading = ref(true)
onMounted(async () => {
  await loadMembers()
  loading.value = false
})

// Build select items from members
const memberItems = computed(() => {
  return members.value
    .filter(m => 'user' in m && m.user)
    .map((m) => {
      const member = m as { userId: string; role: string; user: { id: string; name?: string | null; email: string; image?: string | null } }
      const name = member.user.name || member.user.email
      return {
        label: name,
        value: member.userId,
        avatar: member.user.image || undefined,
        email: member.user.email
      }
    })
})

// Find selected member for display
const selectedMember = computed(() => {
  return memberItems.value.find(m => m.value === props.modelValue)
})
</script>

<template>
  <div class="space-y-2">
    <USelectMenu
      :model-value="modelValue"
      :items="memberItems"
      value-key="value"
      :loading="loading"
      placeholder="Select a team member..."
      searchable
      class="w-full"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <template #leading>
        <UAvatar
          v-if="selectedMember?.avatar"
          :src="selectedMember.avatar"
          size="3xs"
        />
        <UIcon
          v-else
          name="i-lucide-user"
          class="size-4 text-muted"
        />
      </template>
      <template #item="{ item }">
        <div class="flex items-center gap-2">
          <UAvatar
            :src="item.avatar"
            :text="(item.label || '?').slice(0, 2).toUpperCase()"
            size="2xs"
          />
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{{ item.label }}</p>
            <p v-if="item.email !== item.label" class="text-xs text-muted truncate">{{ item.email }}</p>
          </div>
        </div>
      </template>
    </USelectMenu>

    <!-- Preview selected member -->
    <div
      v-if="selectedMember"
      class="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30 text-sm"
    >
      <UAvatar
        :src="selectedMember.avatar"
        :text="(selectedMember.label || '?').slice(0, 2).toUpperCase()"
        size="xs"
      />
      <div class="min-w-0">
        <p class="font-medium truncate">{{ selectedMember.label }}</p>
        <p v-if="selectedMember.email !== selectedMember.label" class="text-xs text-muted truncate">{{ selectedMember.email }}</p>
      </div>
    </div>
  </div>
</template>
