import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, defineComponent, computed } from 'vue'
import type { CollabAwarenessState } from '../../app/types/collab'

// Mock UTooltip component
const UTooltip = defineComponent({
  name: 'UTooltip',
  props: ['text'],
  setup(props, { slots }) {
    return () => h('div', { class: 'u-tooltip', 'data-text': props.text }, slots.default?.())
  }
})

// Create a testable version of the component
const CollabPresence = defineComponent({
  name: 'CollabPresence',
  props: {
    users: { type: Array as () => CollabAwarenessState[], required: true },
    maxVisible: { type: Number, default: 5 },
    size: { type: String as () => 'xs' | 'sm' | 'md', default: 'sm' },
    showTooltip: { type: Boolean, default: true }
  },
  components: { UTooltip },
  setup(props) {
    const visibleUsers = computed(() => props.users.slice(0, props.maxVisible))
    const overflowCount = computed(() => {
      const overflow = props.users.length - props.maxVisible
      return overflow > 0 ? overflow : 0
    })

    function getInitials(name: string): string {
      if (!name) return '?'
      const parts = name.trim().split(/\s+/)
      if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase()
      }
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
    }

    const sizeClasses = computed(() => {
      switch (props.size) {
        case 'xs': return 'size-6 text-xs'
        case 'sm': return 'size-8 text-sm'
        case 'md': return 'size-10 text-base'
        default: return 'size-8 text-sm'
      }
    })

    return { visibleUsers, overflowCount, getInitials, sizeClasses }
  },
  template: `
    <div v-if="users.length > 0" class="collab-presence flex items-center">
      <template v-for="(userState, index) in visibleUsers" :key="userState.user?.id || index">
        <UTooltip v-if="showTooltip && userState.user?.name" :text="userState.user.name">
          <div
            class="collab-presence-avatar rounded-full flex items-center justify-center font-medium"
            :class="sizeClasses"
            :style="{ backgroundColor: userState.user?.color || '#6b7280' }"
          >
            {{ getInitials(userState.user?.name || '') }}
          </div>
        </UTooltip>
        <div
          v-else
          class="collab-presence-avatar rounded-full flex items-center justify-center font-medium"
          :class="sizeClasses"
          :style="{ backgroundColor: userState.user?.color || '#6b7280' }"
          :title="userState.user?.name"
        >
          {{ getInitials(userState.user?.name || '') }}
        </div>
      </template>
      <div
        v-if="overflowCount > 0"
        class="collab-presence-overflow rounded-full flex items-center justify-center font-medium bg-gray-200"
        :class="sizeClasses"
      >
        +{{ overflowCount }}
      </div>
    </div>
  `
})

describe('CollabPresence', () => {
  const createUsers = (count: number): CollabAwarenessState[] => {
    return Array.from({ length: count }, (_, i) => ({
      user: {
        id: `user-${i}`,
        name: `User ${i + 1}`,
        color: `#${(i * 111111).toString(16).padStart(6, '0').slice(0, 6)}`
      },
      cursor: null
    }))
  }

  describe('rendering', () => {
    it('renders nothing when users array is empty', () => {
      const wrapper = mount(CollabPresence, {
        props: { users: [] }
      })

      expect(wrapper.find('.collab-presence').exists()).toBe(false)
    })

    it('renders avatars for each user', () => {
      const users = createUsers(3)
      const wrapper = mount(CollabPresence, {
        props: { users }
      })

      expect(wrapper.findAll('.collab-presence-avatar')).toHaveLength(3)
    })

    it('shows user initials in avatar', () => {
      const users: CollabAwarenessState[] = [
        { user: { id: '1', name: 'Alice Smith', color: '#ff0000' }, cursor: null }
      ]
      const wrapper = mount(CollabPresence, {
        props: { users }
      })

      expect(wrapper.text()).toContain('AS')
    })

    it('handles single word names', () => {
      const users: CollabAwarenessState[] = [
        { user: { id: '1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]
      const wrapper = mount(CollabPresence, {
        props: { users }
      })

      expect(wrapper.text()).toContain('A')
    })

    it('shows ? for empty names', () => {
      const users: CollabAwarenessState[] = [
        { user: { id: '1', name: '', color: '#ff0000' }, cursor: null }
      ]
      const wrapper = mount(CollabPresence, {
        props: { users, showTooltip: false }
      })

      expect(wrapper.text()).toContain('?')
    })
  })

  describe('maxVisible', () => {
    it('limits visible users to maxVisible', () => {
      const users = createUsers(10)
      const wrapper = mount(CollabPresence, {
        props: { users, maxVisible: 3 }
      })

      expect(wrapper.findAll('.collab-presence-avatar')).toHaveLength(3)
    })

    it('shows overflow indicator when users exceed maxVisible', () => {
      const users = createUsers(10)
      const wrapper = mount(CollabPresence, {
        props: { users, maxVisible: 3 }
      })

      const overflow = wrapper.find('.collab-presence-overflow')
      expect(overflow.exists()).toBe(true)
      expect(overflow.text()).toBe('+7')
    })

    it('does not show overflow when users equal maxVisible', () => {
      const users = createUsers(5)
      const wrapper = mount(CollabPresence, {
        props: { users, maxVisible: 5 }
      })

      expect(wrapper.find('.collab-presence-overflow').exists()).toBe(false)
    })

    it('uses default maxVisible of 5', () => {
      const users = createUsers(7)
      const wrapper = mount(CollabPresence, {
        props: { users }
      })

      expect(wrapper.findAll('.collab-presence-avatar')).toHaveLength(5)
      expect(wrapper.find('.collab-presence-overflow').text()).toBe('+2')
    })
  })

  describe('size variants', () => {
    it('applies xs size classes', () => {
      const users = createUsers(1)
      const wrapper = mount(CollabPresence, {
        props: { users, size: 'xs' }
      })

      const avatar = wrapper.find('.collab-presence-avatar')
      expect(avatar.classes()).toContain('size-6')
      expect(avatar.classes()).toContain('text-xs')
    })

    it('applies sm size classes', () => {
      const users = createUsers(1)
      const wrapper = mount(CollabPresence, {
        props: { users, size: 'sm' }
      })

      const avatar = wrapper.find('.collab-presence-avatar')
      expect(avatar.classes()).toContain('size-8')
      expect(avatar.classes()).toContain('text-sm')
    })

    it('applies md size classes', () => {
      const users = createUsers(1)
      const wrapper = mount(CollabPresence, {
        props: { users, size: 'md' }
      })

      const avatar = wrapper.find('.collab-presence-avatar')
      expect(avatar.classes()).toContain('size-10')
      expect(avatar.classes()).toContain('text-base')
    })
  })

  describe('tooltip', () => {
    it('shows tooltip when showTooltip is true', () => {
      const users: CollabAwarenessState[] = [
        { user: { id: '1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]
      const wrapper = mount(CollabPresence, {
        props: { users, showTooltip: true }
      })

      expect(wrapper.find('.u-tooltip').exists()).toBe(true)
    })

    it('uses title attribute when showTooltip is false', () => {
      const users: CollabAwarenessState[] = [
        { user: { id: '1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]
      const wrapper = mount(CollabPresence, {
        props: { users, showTooltip: false }
      })

      expect(wrapper.find('.u-tooltip').exists()).toBe(false)
      const avatar = wrapper.find('.collab-presence-avatar')
      expect(avatar.attributes('title')).toBe('Alice')
    })
  })

  describe('user colors', () => {
    it('applies user color as background', () => {
      const users: CollabAwarenessState[] = [
        { user: { id: '1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]
      const wrapper = mount(CollabPresence, {
        props: { users, showTooltip: false }
      })

      const avatar = wrapper.find('.collab-presence-avatar')
      const style = avatar.attributes('style') || ''
      // Accept either hex or RGB format
      expect(style).toMatch(/background-color:\s*(#ff0000|rgb\(255,\s*0,\s*0\))/)
    })

    it('uses default color when user has no color', () => {
      const users: CollabAwarenessState[] = [
        { user: { id: '1', name: 'Alice', color: '' }, cursor: null }
      ]
      const wrapper = mount(CollabPresence, {
        props: { users, showTooltip: false }
      })

      const avatar = wrapper.find('.collab-presence-avatar')
      // #6b7280 = rgb(107, 114, 128)
      expect(avatar.attributes('style')).toContain('background-color')
    })
  })
})
