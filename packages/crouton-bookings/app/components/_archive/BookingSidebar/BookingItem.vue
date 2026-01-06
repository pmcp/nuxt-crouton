<script setup lang="ts">
interface EmailStats {
  total: number
  sent: number
  pending: number
  failed: number
}

type TriggerType = 'booking_confirmed' | 'reminder_before' | 'booking_cancelled' | 'follow_up_after'

interface AvailableEmailAction {
  triggerType: TriggerType
  label: string
  icon: string
}

interface Props {
  id: string
  locationTitle: string
  slotLabel: string
  slotColor?: string
  date: string | Date
  groupLabel?: string | null
  status?: 'active' | 'cancelled' | string
  showStatus?: boolean
  actionType?: 'remove' | 'cancel' | 'delete'
  loading?: boolean
  showConfirmation?: boolean
  // Position indicator props
  totalSlots?: number
  slotPosition?: number
  // Inventory mode
  isInventoryMode?: boolean
  // Admin metadata props
  userName?: string | null
  userAvatar?: string | null
  createdAt?: string | Date | null
  emailStats?: EmailStats | null
  // Highlight when date matches selected calendar date
  highlighted?: boolean
  // Available email actions (based on templates for this location)
  emailActions?: AvailableEmailAction[]
  // Which email action is currently being sent
  sendingEmailType?: TriggerType | null
}

const props = withDefaults(defineProps<Props>(), {
  slotColor: '#9ca3af',
  showStatus: false,
  actionType: 'remove',
  loading: false,
  showConfirmation: false,
  totalSlots: 0,
  slotPosition: -1,
  isInventoryMode: false,
  userName: null,
  userAvatar: null,
  createdAt: null,
  emailStats: null,
  highlighted: false,
  emailActions: () => [],
  sendingEmailType: null,
})

const emit = defineEmits<{
  remove: []
  cancel: []
  delete: []
  'show-confirmation': []
  'hide-confirmation': []
  'resend-email': [triggerType: TriggerType]
}>()

const { t } = useI18n()
const { getStatusLabel } = useBookingOptions()

// Check if we have valid position info
const hasPositionInfo = computed(() => props.totalSlots > 0 && props.slotPosition >= 0)

// Date badge variant based on status
const dateBadgeVariant = computed(() => {
  return props.status === 'cancelled' ? 'error' : 'primary'
})

// Status badge color
function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'success'
    case 'cancelled':
      return 'error'
    default:
      return 'neutral'
  }
}

// Check if we have any admin metadata to show
const hasAdminMetadata = computed(() => props.userName || props.createdAt || props.emailStats?.total)

// Format created date for display
function formatCreatedDate(date: string | Date | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

// Email status helpers
const emailStatusColor = computed((): 'success' | 'warning' | 'error' | 'neutral' => {
  if (!props.emailStats?.total) return 'neutral'
  if (props.emailStats.failed > 0) return 'error'
  if (props.emailStats.pending > 0) return 'warning'
  if (props.emailStats.sent === props.emailStats.total) return 'success'
  return 'neutral'
})

const emailStatusIcon = computed(() => {
  if (!props.emailStats?.total) return 'i-lucide-mail'
  if (props.emailStats.failed > 0) return 'i-lucide-mail-x'
  if (props.emailStats.pending > 0) return 'i-lucide-mail-question'
  if (props.emailStats.sent === props.emailStats.total) return 'i-lucide-mail-check'
  return 'i-lucide-mail'
})

const emailStatusText = computed(() => {
  if (!props.emailStats?.total) return ''
  if (props.emailStats.failed > 0) {
    return t('bookings.meta.emailsFailed', { failed: props.emailStats.failed, total: props.emailStats.total })
  }
  return t('bookings.meta.emailsSent', { sent: props.emailStats.sent, total: props.emailStats.total })
})

// Handle action click
function handleAction() {
  if (props.actionType === 'remove') {
    emit('remove')
  }
  else {
    emit('show-confirmation')
  }
}

// Confirm action
function confirmAction() {
  if (props.actionType === 'cancel') {
    emit('cancel')
  }
  else if (props.actionType === 'delete') {
    emit('delete')
  }
}
</script>

<template>
  <div
    class="bg-elevated/50 rounded-lg overflow-hidden group transition-all duration-200"
    :class="{ 'ring-2 ring-primary/50 bg-primary/5': highlighted }"
  >
    <div class="p-3 flex items-center gap-3">
      <!-- Date card -->
      <CroutonBookingDateBadge :date="date" :variant="dateBadgeVariant" :highlighted="highlighted" :highlight-color="slotColor" />

      <!-- Content -->
      <div class="flex-1 flex flex-col gap-1">
        <p class="text-sm font-medium truncate flex items-center gap-1.5">
          <span class="truncate capitalize">{{ locationTitle }}</span>
        </p>
        <div class="mt-1 flex items-center">
          <!-- Inventory mode indicator -->
          <div v-if="isInventoryMode" class="flex items-center gap-1.5">
            <UIcon name="i-lucide-box" class="w-3 h-3 text-primary" />
            <span class="text-xs">{{ slotLabel }}</span>
          </div>
          <!-- Slot indicator -->
          <div v-else class="flex items-center gap-1.5">
            <span
              class="w-2 h-2 rounded-full shrink-0 inline-block"
              :style="{ backgroundColor: slotColor || '#22c55e' }"
            />
            <span class="text-xs">{{ slotLabel }}</span>
          </div>
        </div>
        <div class="relative" style="left:-0.07em;margin-top: 0.15em">
          <UBadge v-if="groupLabel" color="neutral" variant="subtle" size="md" >
            {{ groupLabel }}
          </UBadge>
        </div>

        <!-- Admin metadata row -->
        <div v-if="hasAdminMetadata" class="flex items-center gap-1.5 text-xs text-muted mt-1 flex-wrap">
          <!-- User avatar + name -->
          <div v-if="userName" class="flex items-center gap-1">
            <UAvatar
              v-if="userAvatar"
              :src="userAvatar"
              :alt="userName"
              size="3xs"
            />
            <UIcon v-else name="i-lucide-user" class="w-3 h-3" />
            <span class="truncate max-w-[100px]">{{ userName }}</span>
          </div>

          <!-- Created date -->
          <template v-if="createdAt">
            <span v-if="userName" class="text-muted/50">•</span>
            <span>{{ t('bookings.meta.bookedOn', { date: formatCreatedDate(createdAt) }) }}</span>
          </template>

          <!-- Email status -->
          <template v-if="emailStats?.total">
            <span v-if="userName || createdAt" class="text-muted/50">•</span>
            <span class="flex items-center gap-0.5" :class="{
              'text-success': emailStatusColor === 'success',
              'text-warning': emailStatusColor === 'warning',
              'text-error': emailStatusColor === 'error',
            }">
              <UIcon :name="emailStatusIcon" class="w-3 h-3" />
              <span>{{ emailStatusText }}</span>
            </span>
          </template>
        </div>
      </div>

      <!-- Status + Action -->
      <div class="flex items-center gap-2 shrink-0">
        <UBadge
          v-if="showStatus && status"
          :color="getStatusColor(status)"
          variant="subtle"
          size="sm"
        >
          {{ getStatusLabel(status) }}
        </UBadge>

        <!-- Email action buttons (inline) -->
        <div v-if="emailActions.length > 0 && !showConfirmation" class="flex items-center gap-1">
          <UTooltip
            v-for="action in emailActions"
            :key="action.triggerType"
            :text="action.label"
          >
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              :icon="action.icon"
              :loading="sendingEmailType === action.triggerType"
              :disabled="!!sendingEmailType"
              class="transition-all duration-200 hover:scale-110 hover:text-primary"
              @click="emit('resend-email', action.triggerType)"
            />
          </UTooltip>
        </div>

        <!-- Action button -->
        <UButton
          v-if="!showConfirmation"
          variant="ghost"
          :color="actionType === 'delete' ? 'error' : 'neutral'"
          size="xs"
          :icon="actionType === 'delete' ? 'i-lucide-trash-2' : 'i-lucide-x'"
          class="transition-all duration-200 hover:scale-110"
          :class="actionType !== 'delete' && 'hover:rotate-90 hover:text-error'"
          @click="handleAction"
        />
      </div>
    </div>

    <!-- Confirmation row -->
    <div v-if="showConfirmation" class="px-3 pb-3">
      <div class="flex items-center justify-between gap-2 bg-error/10 rounded-lg px-3 py-2">
        <span class="text-xs text-muted">
          {{ actionType === 'delete' ? t('bookings.confirm.delete') : t('bookings.confirm.cancel') }}
        </span>
        <div class="flex items-center gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            @click="emit('hide-confirmation')"
          >
            {{ t('bookings.buttons.keep') }}
          </UButton>
          <UButton
            variant="soft"
            color="error"
            size="xs"
            :loading="loading"
            @click="confirmAction"
          >
            {{ actionType === 'delete' ? t('common.delete') : t('common.cancel') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
