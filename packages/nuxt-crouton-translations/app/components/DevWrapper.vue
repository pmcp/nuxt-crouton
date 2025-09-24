<template>
  <span
    v-if="isDev"
    :class="wrapperClasses"
    :data-key="translationKey"
    :data-level="level"
    :data-locale="locale"
    @click="handleClick"
  >
    <span v-if="isEditing" class="inline-flex items-center gap-1">
      <UInput
        v-model="editValue"
        size="xs"
        :placeholder="displayValue"
        @keyup.enter="saveTranslation"
        @keyup.escape="cancelEdit"
        @click.stop
        class="inline-block min-w-[100px]"
      />
      <UButton
        icon="i-lucide-check"
        size="xs"
        variant="ghost"
        color="green"
        @click.stop="saveTranslation"
      />
      <UButton
        icon="i-lucide-x"
        size="xs"
        variant="ghost"
        color="gray"
        @click.stop="cancelEdit"
      />
    </span>
    <span v-else>
      <slot>{{ displayValue }}</slot>
    </span>
  </span>
  <span v-else>
    <slot>{{ displayValue }}</slot>
  </span>
</template>

<script setup lang="ts">
interface Props {
  translationKey: string
  value?: string
  locale?: string
  level?: 'system' | 'team' | 'missing'
  teamId?: string
}

const props = withDefaults(defineProps<Props>(), {
  level: 'missing',
  locale: 'en'
})

const { $i18n } = useNuxtApp()
const toast = useToast()
const isDev = process.dev && process.client
const isEditing = ref(false)
const editValue = ref('')

const displayValue = computed(() => {
  if (props.value) return props.value
  if (props.level === 'missing') return `[${props.translationKey}]`
  return props.value || ''
})

const wrapperClasses = computed(() => {
  const classes = ['translation-wrapper', 'cursor-pointer', 'relative']

  if (props.level === 'system') {
    classes.push('translation-system')
  } else if (props.level === 'team') {
    classes.push('translation-team')
  } else if (props.level === 'missing') {
    classes.push('translation-missing')
  }

  if (isEditing.value) {
    classes.push('translation-editing')
  }

  return classes
})

function handleClick(e: MouseEvent) {
  if (!isDev || isEditing.value) return

  e.preventDefault()
  e.stopPropagation()

  editValue.value = props.value || ''
  isEditing.value = true

  nextTick(() => {
    const target = e.currentTarget as HTMLElement
    const input = target?.querySelector('input') as HTMLInputElement | null
    if (input) {
      input.focus()
      input.select()
    }
  })
}

function cancelEdit() {
  isEditing.value = false
  editValue.value = ''
}

async function saveTranslation() {
  if (!editValue.value.trim()) {
    cancelEdit()
    return
  }

  try {
    const endpoint = props.teamId
      ? `/api/teams/${props.teamId}/translations-ui`
      : '/api/super-admin/translations-ui'

    const body = {
      keyPath: props.translationKey,
      translations: {
        [props.locale || 'en']: editValue.value
      },
      locale: props.locale || 'en'
    }

    if (props.level === 'missing' || !props.teamId) {
      // Create new translation
      await $fetch(endpoint, {
        method: 'POST',
        body
      })
    } else {
      // Update existing
      const existingId = await findTranslationId(props.translationKey, props.teamId)
      if (existingId) {
        await $fetch(`${endpoint}/${existingId}`, {
          method: 'PATCH',
          body
        })
      } else {
        await $fetch(endpoint, {
          method: 'POST',
          body
        })
      }
    }

    toast.add({
      title: 'Translation saved',
      description: `Updated "${props.translationKey}"`,
      color: 'success'
    })

    // Refresh the page to show new translation
    await refreshNuxtData()

    cancelEdit()
  } catch (error) {
    console.error('Failed to save translation:', error)
    toast.add({
      title: 'Failed to save',
      description: (error as any).message || 'Unknown error',
      color: 'error'
    })
  }
}

async function findTranslationId(keyPath: string, teamId: string): Promise<string | null> {
  try {
    const data = await $fetch(`/api/teams/${teamId}/translations-ui`, {
      query: { keyPath }
    })
    return data?.[0]?.id || null
  } catch {
    return null
  }
}
</script>

<style>
.translation-wrapper {
  transition: all 0.2s ease;
  border-radius: 0.25rem;
  padding: 0 0.125rem;
}

.translation-system {
  background-color: rgba(59, 130, 246, 0.1);
  border-bottom: 1px dashed rgba(59, 130, 246, 0.5);
}

.translation-system:hover {
  background-color: rgba(59, 130, 246, 0.2);
}

.translation-team {
  background-color: rgba(34, 197, 94, 0.1);
  border-bottom: 1px dashed rgba(34, 197, 94, 0.5);
}

.translation-team:hover {
  background-color: rgba(34, 197, 94, 0.2);
}

.translation-missing {
  background-color: rgba(239, 68, 68, 0.1);
  border-bottom: 1px dashed rgba(239, 68, 68, 0.5);
  animation: pulse-red 2s infinite;
}

.translation-missing:hover {
  background-color: rgba(239, 68, 68, 0.2);
  animation: none;
}

.translation-editing {
  background-color: rgba(251, 191, 36, 0.2) !important;
  border-color: rgba(251, 191, 36, 0.5) !important;
  animation: none !important;
}

@keyframes pulse-red {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>