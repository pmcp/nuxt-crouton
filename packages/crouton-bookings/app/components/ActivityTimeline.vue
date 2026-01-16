<script setup lang="ts">
import { computed } from 'vue'
import { useTimeAgo } from '@vueuse/core'
import type { Booking, EmailTriggerType } from '../types/booking'

interface Props {
  booking: Booking
}

const props = defineProps<Props>()

// Get icon for email trigger type
function getEmailIcon(triggerType: EmailTriggerType, status: string): string {
  if (status === 'failed') return 'i-lucide-mail-x'
  if (status === 'pending') return 'i-lucide-clock'

  switch (triggerType) {
    case 'booking_created': return 'i-lucide-mail-check'
    case 'reminder_before': return 'i-lucide-bell-ring'
    case 'follow_up_after': return 'i-lucide-message-square-reply'
    case 'booking_cancelled': return 'i-lucide-mail-minus'
    default: return 'i-lucide-mail'
  }
}

// Interface for activity item
interface ActivityItem {
  date: Date
  username: string
  action: string
  icon: string
  type: 'booking' | 'email'
}

// Build combined timeline from booking data and email details
const activityItems = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = []
  const booking = props.booking

  // 1. Booking created
  if (booking.createdAt) {
    const createdByName = booking.createdByUser?.name || booking.ownerUser?.name || 'Someone'
    items.push({
      date: new Date(booking.createdAt),
      username: createdByName,
      action: 'created this booking',
      icon: 'i-lucide-calendar-plus',
      type: 'booking',
    })
  }

  // 2. Email events from emailDetails
  if (booking.emailDetails) {
    for (const detail of booking.emailDetails) {
      if (detail.status === 'sent' && detail.sentAt) {
        const emailType = detail.triggerType === 'booking_created' ? 'confirmation'
          : detail.triggerType === 'reminder_before' ? 'reminder'
          : detail.triggerType === 'follow_up_after' ? 'follow-up'
          : detail.triggerType === 'booking_cancelled' ? 'cancellation'
          : ''
        items.push({
          date: new Date(detail.sentAt),
          username: emailType.charAt(0).toUpperCase() + emailType.slice(1),
          action: 'email sent',
          icon: getEmailIcon(detail.triggerType, detail.status),
          type: 'email',
        })
      }
      else if (detail.status === 'failed') {
        items.push({
          date: detail.sentAt ? new Date(detail.sentAt) : new Date(),
          username: 'Email',
          action: 'failed to send',
          icon: getEmailIcon(detail.triggerType, detail.status),
          type: 'email',
        })
      }
    }
  }

  // 3. Booking updated (only if different from created)
  if (booking.updatedAt && booking.createdAt) {
    const createdDate = new Date(booking.createdAt)
    const updatedDate = new Date(booking.updatedAt)
    if (updatedDate.getTime() - createdDate.getTime() > 60000) {
      const updatedByName = booking.createdByUser?.name || 'Someone'
      items.push({
        date: updatedDate,
        username: updatedByName,
        action: 'updated this booking',
        icon: 'i-lucide-pencil',
        type: 'booking',
      })
    }
  }

  // 4. Booking cancelled
  if (booking.status === 'cancelled') {
    const cancelDate = booking.updatedAt ? new Date(booking.updatedAt) : new Date()
    items.push({
      date: cancelDate,
      username: 'Booking',
      action: 'was cancelled',
      icon: 'i-lucide-calendar-x',
      type: 'booking',
    })
  }

  // Sort by date (oldest first)
  return items.sort((a, b) => a.date.getTime() - b.date.getTime())
})

// Convert to timeline items format
const timelineItems = computed(() => {
  return activityItems.value.map((item, index) => ({
    ...item,
    value: index,
  }))
})

// Determine active value (most recent past event)
const activeValue = computed(() => {
  const now = new Date()
  let lastIndex = 0
  for (let i = 0; i < activityItems.value.length; i++) {
    if (activityItems.value[i].date <= now) {
      lastIndex = i
    }
  }
  return lastIndex
})
</script>

<template>
  <div v-if="timelineItems.length > 0" class="w-full">
    <UTimeline
      :items="timelineItems"
      :model-value="activeValue"
      size="xs"
      color="neutral"
      :ui="{
        date: 'float-end ms-1',
        wrapper: 'pb-3',
        indicator: 'bg-elevated text-muted group-data-[state=completed]:bg-elevated group-data-[state=completed]:text-muted group-data-[state=active]:bg-elevated group-data-[state=active]:text-muted',
        separator: 'bg-muted/30 group-data-[state=completed]:bg-muted/30',
      }"
    >
      <template #title="{ item }">
        <span class="font-medium">{{ item.username }}</span>
        <span class="font-normal text-muted">&nbsp;{{ item.action }}</span>
      </template>

      <template #date="{ item }">
        <span class="text-xs text-dimmed">{{ useTimeAgo(item.date).value }}</span>
      </template>
    </UTimeline>
  </div>
  <div v-else class="text-sm text-muted py-2">
    No activity yet
  </div>
</template>
