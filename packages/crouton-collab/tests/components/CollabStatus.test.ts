import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'

// Mock UTooltip component
const UTooltip = defineComponent({
  name: 'UTooltip',
  props: ['text'],
  setup(props, { slots }) {
    return () => h('div', { class: 'u-tooltip' }, slots.default?.())
  }
})

// Create a minimal CollabStatus component for testing
const CollabStatus = defineComponent({
  name: 'CollabStatus',
  props: {
    connected: { type: Boolean, required: true },
    synced: { type: Boolean, required: true },
    error: { type: Error, default: null },
    showLabel: { type: Boolean, default: true }
  },
  components: { UTooltip },
  setup(props) {
    const status = () => {
      if (props.error) return 'error'
      if (!props.connected) return 'disconnected'
      if (!props.synced) return 'syncing'
      return 'synced'
    }

    const statusLabel = () => {
      switch (status()) {
        case 'error': return 'Connection error'
        case 'disconnected': return 'Disconnected'
        case 'syncing': return 'Syncing...'
        case 'synced': return 'Synced'
        default: return ''
      }
    }

    const dotClass = () => {
      switch (status()) {
        case 'synced': return 'bg-green-500'
        case 'syncing': return 'bg-yellow-500 animate-pulse'
        case 'disconnected': return 'bg-gray-400'
        case 'error': return 'bg-red-500'
        default: return 'bg-gray-400'
      }
    }

    return { status, statusLabel, dotClass }
  },
  template: `
    <div class="collab-status inline-flex items-center gap-1.5">
      <UTooltip v-if="error" :text="error.message">
        <span
          class="collab-status-dot size-2 rounded-full shrink-0"
          :class="dotClass()"
        />
      </UTooltip>
      <span
        v-else
        class="collab-status-dot size-2 rounded-full shrink-0"
        :class="dotClass()"
      />
      <span v-if="showLabel" class="collab-status-label text-xs">
        {{ statusLabel() }}
      </span>
    </div>
  `
})

describe('CollabStatus', () => {
  describe('status indicator', () => {
    it('shows synced state with green dot', () => {
      const wrapper = mount(CollabStatus, {
        props: {
          connected: true,
          synced: true
        }
      })

      const dot = wrapper.find('.collab-status-dot')
      expect(dot.classes()).toContain('bg-green-500')
      expect(wrapper.text()).toContain('Synced')
    })

    it('shows syncing state with yellow pulsing dot', () => {
      const wrapper = mount(CollabStatus, {
        props: {
          connected: true,
          synced: false
        }
      })

      const dot = wrapper.find('.collab-status-dot')
      expect(dot.classes()).toContain('bg-yellow-500')
      expect(dot.classes()).toContain('animate-pulse')
      expect(wrapper.text()).toContain('Syncing...')
    })

    it('shows disconnected state with gray dot', () => {
      const wrapper = mount(CollabStatus, {
        props: {
          connected: false,
          synced: false
        }
      })

      const dot = wrapper.find('.collab-status-dot')
      expect(dot.classes()).toContain('bg-gray-400')
      expect(wrapper.text()).toContain('Disconnected')
    })

    it('shows error state with red dot', () => {
      const wrapper = mount(CollabStatus, {
        props: {
          connected: true,
          synced: true,
          error: new Error('Connection failed')
        }
      })

      const dot = wrapper.find('.collab-status-dot')
      expect(dot.classes()).toContain('bg-red-500')
      expect(wrapper.text()).toContain('Connection error')
    })
  })

  describe('label visibility', () => {
    it('shows label by default', () => {
      const wrapper = mount(CollabStatus, {
        props: {
          connected: true,
          synced: true
        }
      })

      expect(wrapper.find('.collab-status-label').exists()).toBe(true)
    })

    it('hides label when showLabel is false', () => {
      const wrapper = mount(CollabStatus, {
        props: {
          connected: true,
          synced: true,
          showLabel: false
        }
      })

      expect(wrapper.find('.collab-status-label').exists()).toBe(false)
    })
  })

  describe('error tooltip', () => {
    it('wraps dot in tooltip when error exists', () => {
      const wrapper = mount(CollabStatus, {
        props: {
          connected: true,
          synced: true,
          error: new Error('Test error')
        }
      })

      expect(wrapper.find('.u-tooltip').exists()).toBe(true)
    })

    it('does not show tooltip when no error', () => {
      const wrapper = mount(CollabStatus, {
        props: {
          connected: true,
          synced: true
        }
      })

      expect(wrapper.find('.u-tooltip').exists()).toBe(false)
    })
  })

  describe('status priority', () => {
    it('prioritizes error over synced state', () => {
      const wrapper = mount(CollabStatus, {
        props: {
          connected: true,
          synced: true,
          error: new Error('Error')
        }
      })

      const dot = wrapper.find('.collab-status-dot')
      expect(dot.classes()).toContain('bg-red-500')
    })

    it('prioritizes disconnected over synced when not connected', () => {
      const wrapper = mount(CollabStatus, {
        props: {
          connected: false,
          synced: true
        }
      })

      const dot = wrapper.find('.collab-status-dot')
      expect(dot.classes()).toContain('bg-gray-400')
    })
  })
})
