<template>
  <div>
    <div
      v-if="pending"
      class="flex items-center gap-2 text-sm"
    >
      <UIcon
        name="i-lucide-refresh-cw"
        class="animate-spin"
      />
      {{ t('dependent.loadingOptions') }}
    </div>

    <div
      v-else-if="error"
      class="text-sm text-warning"
    >
      {{ t('dependent.failedToLoadOptions') }}
    </div>

    <div
      v-else-if="!dependentValue"
      class="text-sm text-neutral"
    >
      {{ t('dependent.required', { label: dependentLabel }) }}
    </div>

    <div
      v-else-if="!options || options.length === 0"
      class="text-sm text-neutral"
    >
      {{ t('dependent.noOptions') }}
    </div>

    <CroutonFormDependentSelectOption
      v-else
      v-model="localValue"
      :options="options"
      :multiple="multiple"
      :dependent-collection="dependentCollection"
      :dependent-field="dependentField"
      :card-variant="cardVariant"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useT()

interface Option {
  id: string
  [key: string]: any
}

interface Props {
  modelValue?: string[] | null
  options?: Option[]
  pending?: boolean
  error?: any
  dependentValue?: string | null
  dependentLabel?: string
  multiple?: boolean
  dependentCollection: string
  dependentField: string
  cardVariant?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  options: () => [],
  pending: false,
  error: null,
  dependentValue: null,
  dependentLabel: 'Selection',
  multiple: false,
  cardVariant: 'Mini'
})

const emit = defineEmits<{
  'update:modelValue': [value: string[] | null]
}>()

// Local model for v-model binding
const localValue = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
</script>
