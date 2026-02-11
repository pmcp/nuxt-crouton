<script setup lang="ts">
import type { FlowInput } from '#layers/triage/types'

interface Props {
  flowId: string
  teamId: string
  modelValue: boolean
  inputs: FlowInput[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'change': [inputs: FlowInput[]]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const localInputs = ref<FlowInput[]>([...props.inputs])

watch(() => props.inputs, (val) => {
  localInputs.value = [...val]
}, { deep: true })

function onInputsChange(inputs: FlowInput[]) {
  localInputs.value = inputs
  emit('change', inputs)
}
</script>

<template>
  <USlideover v-model:open="isOpen">
    <template #content="{ close }">
      <div class="p-6 h-full overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">Input Sources</h3>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="close"
          />
        </div>

        <CroutonTriageFlowsInputManager
          :flow-id="flowId"
          :team-id="teamId"
          :model-value="localInputs"
          edit-mode
          @update:model-value="onInputsChange"
          @change="onInputsChange"
        />
      </div>
    </template>
  </USlideover>
</template>
