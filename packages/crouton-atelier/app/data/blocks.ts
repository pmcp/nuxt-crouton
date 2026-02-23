import type { Block } from '../types/blocks'

export const blocks: Block[] = [
  // ── crouton-bookings ──────────────────────────────────────────
  {
    id: 'schedule',
    label: 'Class schedule',
    description: 'Sessions people can book — shows a calendar/list of available slots',
    icon: 'i-lucide-calendar',
    package: 'crouton-bookings',
    visibility: 'public',
    category: 'interaction',
    collections: [
      {
        name: 'bookings',
        fields: [
          { name: 'location', type: 'reference', meta: { refTarget: 'locations' } },
          { name: 'date', type: 'date' },
          { name: 'slot', type: 'string' },
          { name: 'group', type: 'string' },
          { name: 'quantity', type: 'number', meta: { default: 1 } },
          { name: 'status', type: 'string', meta: { default: 'confirmed' } }
        ],
        seedCount: 5
      },
      {
        name: 'locations',
        fields: [
          { name: 'title', type: 'string', meta: { translatable: true } },
          { name: 'color', type: 'string' },
          { name: 'street', type: 'string' },
          { name: 'city', type: 'string' },
          { name: 'content', type: 'text', meta: { translatable: true } },
          { name: 'slots', type: 'repeater' },
          { name: 'openDays', type: 'array' }
        ],
        seedCount: 3
      }
    ]
  },
  {
    id: 'book-now',
    label: 'Book now',
    description: 'Public booking form — lets visitors pick a slot and reserve',
    icon: 'i-lucide-ticket',
    package: 'crouton-bookings',
    visibility: 'public',
    category: 'interaction',
    collections: [] // reuses schedule collections
  },
  {
    id: 'my-bookings',
    label: 'My bookings',
    description: 'Members can view and manage their own bookings',
    icon: 'i-lucide-bookmark',
    package: 'crouton-bookings',
    visibility: 'auth',
    category: 'member',
    collections: [] // reuses schedule collections
  },
  {
    id: 'manage-bookings',
    label: 'Manage bookings',
    description: 'Admin view to manage all bookings, approve/reject/cancel',
    icon: 'i-lucide-clipboard-list',
    package: 'crouton-bookings',
    visibility: 'admin',
    category: 'admin',
    collections: []
  },
  {
    id: 'manage-locations',
    label: 'Manage locations',
    description: 'Create and edit booking locations, time slots, and capacity',
    icon: 'i-lucide-map-pin',
    package: 'crouton-bookings',
    visibility: 'admin',
    category: 'admin',
    collections: [
      {
        name: 'locations',
        fields: [
          { name: 'title', type: 'string', meta: { translatable: true } },
          { name: 'color', type: 'string' },
          { name: 'street', type: 'string' },
          { name: 'city', type: 'string' },
          { name: 'content', type: 'text', meta: { translatable: true } },
          { name: 'slots', type: 'repeater' },
          { name: 'openDays', type: 'array' }
        ],
        seedCount: 3
      }
    ]
  },

  // ── crouton-pages ─────────────────────────────────────────────
  {
    id: 'hero',
    label: 'Hero section',
    description: 'Eye-catching landing section with title, description, and call-to-action',
    icon: 'i-lucide-image',
    package: 'crouton-pages',
    visibility: 'public',
    category: 'content',
    collections: [] // pure content block, no collection needed
  },
  {
    id: 'text-page',
    label: 'Text page',
    description: 'Rich-text pages with editor — about, terms, privacy, etc.',
    icon: 'i-lucide-file-text',
    package: 'crouton-pages',
    visibility: 'public',
    category: 'content',
    collections: [
      {
        name: 'pages',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'slug', type: 'string', meta: { unique: true } },
          { name: 'pageType', type: 'string', meta: { default: 'core:regular' } },
          { name: 'content', type: 'text' },
          { name: 'status', type: 'string', meta: { default: 'draft' } },
          { name: 'visibility', type: 'string', meta: { default: 'public' } },
          { name: 'showInNavigation', type: 'boolean', meta: { default: true } }
        ],
        seedCount: 3
      }
    ]
  },
  {
    id: 'blog',
    label: 'Blog',
    description: 'Blog with articles, categories, and rich-text editing',
    icon: 'i-lucide-pen-line',
    package: 'crouton-pages',
    visibility: 'public',
    category: 'content',
    collections: [
      {
        name: 'articles',
        fields: [
          { name: 'title', type: 'string' },
          { name: 'slug', type: 'string', meta: { unique: true } },
          { name: 'content', type: 'text' },
          { name: 'status', type: 'string', meta: { default: 'draft' } },
          { name: 'publishedAt', type: 'date' }
        ],
        seedCount: 5
      }
    ]
  },

  // ── crouton-auth ──────────────────────────────────────────────
  {
    id: 'signup',
    label: 'Sign up',
    description: 'User registration and authentication flow',
    icon: 'i-lucide-user-plus',
    package: 'crouton-auth',
    visibility: 'public',
    category: 'member',
    collections: []
  },
  {
    id: 'manage-contacts',
    label: 'Manage contacts',
    description: 'Admin contact management — view users, invite members, manage roles',
    icon: 'i-lucide-users',
    package: 'crouton-auth',
    visibility: 'admin',
    category: 'admin',
    collections: [
      {
        name: 'contacts',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'email', type: 'string' },
          { name: 'phone', type: 'string' },
          { name: 'notes', type: 'text' }
        ],
        seedCount: 10
      }
    ]
  }
]
