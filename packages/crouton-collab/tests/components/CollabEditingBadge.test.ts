import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, defineComponent, computed, ref, toRef } from 'vue'
import type { CollabAwarenessState } from '../../app/types/collab'

// Mock $fetch
const mockFetch = vi.fn()

// Mock UTooltip component
const UTooltip = defineComponent({
  name: 'UTooltip',
  props: ['delayDuration'],
  setup(props, { slots }) {
    return () => h('div', { class: 'u-tooltip' }, [
      slots.default?.(),
      h('div', { class: 'tooltip-content' }, slots.content?.())
    ])
  }
})

// Simplified CollabEditingBadge for testing
const CollabEditingBadge = defineComponent({
  name: 'CollabEditingBadge',
  props: {
    roomId: { type: String, required: true },
    roomType: { type: String, default: 'page' },
    currentUserId: { type: String, default: undefined },
    pollInterval: { type: Number, default: 5000 },
    size: { type: String as () => 'xs' | 'sm' | 'md', default: 'xs' },
    showAvatars: { type: Boolean, default: true },
    maxAvatars: { type: Number, default: 5 }
  },
  components: { UTooltip },
  setup(props) {
    const users = ref<CollabAwarenessState[]>([])
    const loading = ref(true)

    const otherUsers = computed(() => {
      if (!props.currentUserId) return users.value
      return users.value.filter(u => u.user?.id !== props.currentUserId)
    })

    const otherCount = computed(() => otherUsers.value.length)

    const badgeText = computed(() => {
      if (otherCount.value === 0) return ''
      if (otherCount.value === 1) return '1 editing'
      return `${otherCount.value} editing`
    })

    const sizeClasses = computed(() => {
      switch (props.size) {
        case 'xs': return { badge: 'text-xs px-1.5 py-0.5', avatar: 'size-4 text-xs' }
        case 'sm': return { badge: 'text-sm px-2 py-0.5', avatar: 'size-5 text-sm' }
        case 'md': return { badge: 'text-md px-2 py-1', avatar: 'size-6 text-md' }
        default: return { badge: 'text-xs px-1.5 py-0.5', avatar: 'size-4 text-xs' }
      }
    })

    const visibleUsers = computed(() => otherUsers.value.slice(0, props.maxAvatars))

    function getInitials(name: string): string {
      if (!name) return '?'
      const parts = name.trim().split(/\s+/)
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
    }

    // Simulate fetch on mount
    mockFetch(`/api/collab/${props.roomId}/users`, { query: { type: props.roomType } })
      .then((response: { users: CollabAwarenessState[] }) => {
        users.value = response.users || []
        loading.value = false
      })
      .catch(() => {
        loading.value = false
      })

    return { otherUsers, otherCount, badgeText, sizeClasses, visibleUsers, getInitials, loading }
  },
  template: `
    <div v-if="otherCount > 0 && !loading" class="collab-editing-badge inline-flex items-center">
      <UTooltip v-if="showAvatars" :delay-duration="200">
        <template #default>
          <div
            class="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-600 font-medium"
            :class="sizeClasses.badge"
          >
            <div class="flex -space-x-1">
              <div
                v-for="(user, index) in visibleUsers.slice(0, 3)"
                :key="user.user?.id || index"
                class="collab-avatar rounded-full flex items-center justify-center font-medium"
                :class="sizeClasses.avatar"
                :style="{ backgroundColor: user.user?.color || '#6b7280' }"
              >
                {{ getInitials(user.user?.name || '') }}
              </div>
            </div>
            <span class="badge-text">{{ badgeText }}</span>
          </div>
        </template>
        <template #content>
          <div class="tooltip-users">
            <p>Currently editing:</p>
            <div v-for="(user, index) in visibleUsers" :key="user.user?.id || index" class="user-item">
              {{ user.user?.name || 'Unknown' }}
            </div>
          </div>
        </template>
      </UTooltip>
      <div
        v-else
        class="inline-flex items-center rounded-full bg-primary-50 text-primary-600 font-medium"
        :class="sizeClasses.badge"
      >
        <span class="badge-text">{{ badgeText }}</span>
      </div>
    </div>
  `
})

// TODO: This test file tests an inline mock component, not the actual CollabEditingBadge.vue component.
// The inline mock doesn't use useCollabRoomUsers composable like the real component does.
// These tests need to be rewritten to test the actual component.
// Skipping entire test suite until this is fixed.

describe.skip('CollabEditingBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('visibility', () => {
    it('shows nothing when no other users are editing', async () => {
      mockFetch.mockResolvedValue({ users: [], count: 0 })

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123' }
      })

      await flushPromises()

      expect(wrapper.find('.collab-editing-badge').exists()).toBe(false)
    })

    it('shows badge when other users are editing', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 1 })

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123' }
      })

      await flushPromises()

      expect(wrapper.find('.collab-editing-badge').exists()).toBe(true)
    })

    it('hides badge while loading', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123' }
      })

      expect(wrapper.find('.collab-editing-badge').exists()).toBe(false)
    })
  })

  describe('badge text', () => {
    it('shows "1 editing" for single user', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 1 })

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123' }
      })

      await flushPromises()

      expect(wrapper.find('.badge-text').text()).toBe('1 editing')
    })

    it('shows "N editing" for multiple users', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null },
        { user: { id: 'user-2', name: 'Bob', color: '#00ff00' }, cursor: null },
        { user: { id: 'user-3', name: 'Charlie', color: '#0000ff' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 3 })

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123' }
      })

      await flushPromises()

      expect(wrapper.find('.badge-text').text()).toBe('3 editing')
    })
  })

  describe('current user exclusion', () => {
    it('excludes current user from count', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null },
        { user: { id: 'current', name: 'Me', color: '#0000ff' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 2 })

      const wrapper = mount(CollabEditingBadge, {
        props: {
          roomId: 'test-123',
          currentUserId: 'current'
        }
      })

      await flushPromises()

      expect(wrapper.find('.badge-text').text()).toBe('1 editing')
    })

    it('hides badge when only current user is present', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'current', name: 'Me', color: '#0000ff' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 1 })

      const wrapper = mount(CollabEditingBadge, {
        props: {
          roomId: 'test-123',
          currentUserId: 'current'
        }
      })

      await flushPromises()

      expect(wrapper.find('.collab-editing-badge').exists()).toBe(false)
    })
  })

  describe('avatars', () => {
    it('shows user avatars when showAvatars is true', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null },
        { user: { id: 'user-2', name: 'Bob', color: '#00ff00' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 2 })

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123', showAvatars: true }
      })

      await flushPromises()

      expect(wrapper.findAll('.collab-avatar')).toHaveLength(2)
    })

    it('limits visible avatars to 3 in badge', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null },
        { user: { id: 'user-2', name: 'Bob', color: '#00ff00' }, cursor: null },
        { user: { id: 'user-3', name: 'Charlie', color: '#0000ff' }, cursor: null },
        { user: { id: 'user-4', name: 'Dave', color: '#ff00ff' }, cursor: null },
        { user: { id: 'user-5', name: 'Eve', color: '#00ffff' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 5 })

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123', showAvatars: true }
      })

      await flushPromises()

      // Only first 3 avatars shown in main badge
      expect(wrapper.findAll('.collab-avatar')).toHaveLength(3)
    })

    it('hides avatars when showAvatars is false', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 1 })

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123', showAvatars: false }
      })

      await flushPromises()

      expect(wrapper.find('.u-tooltip').exists()).toBe(false)
      expect(wrapper.find('.collab-avatar').exists()).toBe(false)
    })
  })

  describe('tooltip', () => {
    it('shows tooltip with user names', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice Smith', color: '#ff0000' }, cursor: null },
        { user: { id: 'user-2', name: 'Bob Jones', color: '#00ff00' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 2 })

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123', showAvatars: true }
      })

      await flushPromises()

      const tooltipContent = wrapper.find('.tooltip-users')
      expect(tooltipContent.text()).toContain('Alice Smith')
      expect(tooltipContent.text()).toContain('Bob Jones')
    })
  })

  describe('API calls', () => {
    it('calls API with correct room ID and type', async () => {
      mockFetch.mockResolvedValue({ users: [], count: 0 })

      mount(CollabEditingBadge, {
        props: { roomId: 'my-room-123', roomType: 'flow' }
      })

      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/collab/my-room-123/users',
        { query: { type: 'flow' } }
      )
    })

    it('uses default roomType of page', async () => {
      mockFetch.mockResolvedValue({ users: [], count: 0 })

      mount(CollabEditingBadge, {
        props: { roomId: 'test-123' }
      })

      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/collab/test-123/users',
        { query: { type: 'page' } }
      )
    })
  })

  describe('size variants', () => {
    it('applies xs size classes', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 1 })

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123', size: 'xs', showAvatars: true }
      })

      await flushPromises()

      const badge = wrapper.find('.rounded-full')
      expect(badge.classes()).toContain('text-xs')
    })

    it('applies sm size classes', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]
      mockFetch.mockResolvedValue({ users: mockUsers, count: 1 })

      const wrapper = mount(CollabEditingBadge, {
        props: { roomId: 'test-123', size: 'sm', showAvatars: true }
      })

      await flushPromises()

      const badge = wrapper.find('.rounded-full')
      expect(badge.classes()).toContain('text-sm')
    })
  })
})
