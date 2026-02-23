import type { Template } from '../types/blocks'

export const templates: Template[] = [
  {
    id: 'yoga-studio',
    label: 'Yoga Studio',
    description: 'Booking-driven studio with schedule, member portal, and location management',
    icon: 'i-lucide-heart',
    blocks: [
      { blockId: 'hero', visibility: 'public' },
      { blockId: 'schedule', visibility: 'public' },
      { blockId: 'signup', visibility: 'public' },
      { blockId: 'my-bookings', visibility: 'auth' },
      { blockId: 'manage-bookings', visibility: 'admin' },
      { blockId: 'manage-locations', visibility: 'admin' },
      { blockId: 'manage-contacts', visibility: 'admin' }
    ],
    identity: {
      name: 'My Yoga Studio',
      description: 'Book classes, manage your schedule, and connect with your community'
    }
  },
  {
    id: 'sports-club',
    label: 'Sports Club',
    description: 'Club with event scheduling, member bookings, and team management',
    icon: 'i-lucide-trophy',
    blocks: [
      { blockId: 'hero', visibility: 'public' },
      { blockId: 'schedule', visibility: 'public' },
      { blockId: 'my-bookings', visibility: 'auth' },
      { blockId: 'manage-bookings', visibility: 'admin' },
      { blockId: 'manage-contacts', visibility: 'admin' }
    ],
    identity: {
      name: 'My Sports Club',
      description: 'Book sessions, track your activities, and stay connected with the club'
    }
  },
  {
    id: 'charity',
    label: 'Charity',
    description: 'Content-focused site with pages, blog, and contact management',
    icon: 'i-lucide-hand-heart',
    blocks: [
      { blockId: 'hero', visibility: 'public' },
      { blockId: 'text-page', visibility: 'public' },
      { blockId: 'manage-contacts', visibility: 'admin' }
    ],
    identity: {
      name: 'My Charity',
      description: 'Share our mission, publish updates, and connect with supporters'
    }
  },
  {
    id: 'blank',
    label: 'Blank',
    description: 'Start from scratch — add blocks as you go',
    icon: 'i-lucide-square-dashed-bottom',
    blocks: [],
    identity: {
      name: '',
      description: ''
    }
  }
]
