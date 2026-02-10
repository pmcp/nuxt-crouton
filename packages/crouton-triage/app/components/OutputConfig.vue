<script setup lang="ts">
import type { FlowOutput } from '#layers/triage/types'

interface Props {
  flowId: string
  teamId: string
  availableDomains: string[]
  modelValue: boolean
  outputs: FlowOutput[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'change': [outputs: FlowOutput[]]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const localOutputs = ref<FlowOutput[]>([...props.outputs])

watch(() => props.outputs, (val) => {
  localOutputs.value = [...val]
}, { deep: true })

function onOutputsChange(outputs: FlowOutput[]) {
  localOutputs.value = outputs
  emit('change', outputs)
}
</script>

<template>
  <USlideover v-model="isOpen">
    <template #content="{ close }">
      <div class="p-6 h-full overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">Output Destinations</h3>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="close"
          />
        </div>

        <CroutonTriageFlowsOutputManager
          :flow-id="flowId"
          :team-id="teamId"
          :available-domains="availableDomains"
          :model-value="localOutputs"
          edit-mode
          @update:model-value="onOutputsChange"
          @change="onOutputsChange"
        />
      </div>
    </template>
  </USlideover>
</template>
