<script setup lang="ts">
/**
 * Two-click inline confirmation button.
 *
 * First click shows a confirm state ("Sure?"), second click fires @confirm.
 * Clicking anywhere else resets to the default state.
 *
 * @example
 * ```vue
 * <CroutonConfirmButton
 *   :label="t('teams.remove')"
 *   :confirm-label="t('teams.sure')"
 *   icon="i-lucide-user-x"
 *   :loading="isRemoving"
 *   @confirm="doRemove(member.id)"
 * />
 * ```
 */
interface Props {
  /** Default label text */
  label: string
  /** Label shown in confirmation state */
  confirmLabel?: string
  /** Icon shown in default state */
  icon?: string
  /** Show loading spinner (during async action) */
  loading?: boolean
  /** Disable the button */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: 'Sure?',
  icon: undefined,
  loading: false,
  disabled: false
})

const emit = defineEmits<{
  confirm: []
}>()

const confirming = ref(false)

function handleClick() {
  if (props.disabled) return
  if (confirming.value) {
    emit('confirm')
  } else {
    confirming.value = true
  }
}

// Click-away resets confirmation
function onDocumentClick() {
  if (confirming.value) {
    confirming.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

// Reset when loading finishes (action completed)
watch(() => props.loading, (isLoading, wasLoading) => {
  if (wasLoading && !isLoading) {
    confirming.value = false
  }
})
</script>

<template>
  <button
    class="h-7 rounded-md flex items-center gap-1.5 justify-center shrink-0 transition-all cursor-pointer px-2.5 text-xs font-medium whitespace-nowrap"
    :class="[
      disabled && 'opacity-50 cursor-not-allowed',
      confirming
        ? 'bg-red-500/20 text-red-500'
        : 'text-red-400/60 hover:bg-red-500/20 hover:text-red-500'
    ]"
    :disabled="disabled"
    @click.stop="handleClick"
  >
    <UIcon v-if="loading && confirming" name="i-lucide-loader-2" class="size-3.5 animate-spin" />
    <template v-else-if="confirming">
      {{ confirmLabel }}
    </template>
    <template v-else>
      <UIcon v-if="icon" :name="icon" class="size-3.5" />
      {{ label }}
    </template>
  </button>
</template>
