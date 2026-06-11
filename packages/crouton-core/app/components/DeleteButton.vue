<!--
  CroutonDeleteButton
  Two-step pill delete (originated in crouton-triage's flow rows): idle shows a
  trash icon that expands to a "delete" label on hover; the first click arms it
  ("sure?"), the second click emits `confirm`. Moving the pointer away disarms.

  Props:
  - loading  — shows a spinner and ignores clicks (parent performs the delete)
  - expanded — always show the label (for form footers; collapsed icon-pill
               hover-expand needs a pointer, so touch-first surfaces want this)
-->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  loading?: boolean
  expanded?: boolean
}>(), {
  loading: false,
  expanded: false
})

const emit = defineEmits<{ confirm: [] }>()
const { t } = useT()

const armed = ref(false)

function handleClick() {
  if (props.loading) return
  if (!armed.value) {
    armed.value = true
    return
  }
  armed.value = false
  emit('confirm')
}

function disarm() {
  if (!props.loading) armed.value = false
}
</script>

<template>
  <!-- rounded-md + free height so it lines up with Nuxt UI buttons: in a
       `flex items-stretch` row it matches the neighboring button's height -->
  <button
    type="button"
    class="group/del relative min-h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
    :class="[
      armed || loading
        ? 'bg-red-500/20 text-red-500 px-3'
        : expanded
          ? 'px-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-500'
          : 'w-7 h-7 hover:!w-auto hover:!px-2.5 bg-gray-500/10 text-gray-400 hover:!bg-red-500/20 hover:!text-red-500'
    ]"
    @click.stop="handleClick"
    @mouseleave="disarm"
  >
    <UIcon v-if="loading" name="i-lucide-loader-2" class="w-3.5 h-3.5 animate-spin" />
    <span v-else-if="armed" class="text-sm font-medium whitespace-nowrap">{{ t('deleteConfirm.sure') }}</span>
    <template v-else-if="expanded">
      <span class="text-sm font-medium whitespace-nowrap">{{ t('common.delete') }}</span>
    </template>
    <template v-else>
      <UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5 group-hover/del:hidden" />
      <span class="hidden group-hover/del:inline text-xs font-medium whitespace-nowrap">{{ t('common.delete') }}</span>
    </template>
  </button>
</template>
