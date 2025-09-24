<template>
  <div
    class=""
    :class="containerClasses"
  >
    <!-- DELETE -->
    <div v-if="delete">
    <!-- With tooltip-->
      <UTooltip
        v-if="deleteTooltip.length > 0"
        :popper="{placement: 'left', arrow: false  }"
      >
        <template #text>
          <span class="italic">{{ deleteTooltip }}</span>
        </template>

        <UButton
          :loading="deleteLoading"
          icon="i-ph-trash-duotone"
          color="rose"
          variant="soft"
          size="xs"
          :class="buttonClasses"
          @click="$emit('delete')"
        />
      </UTooltip>

      <!-- Without tooltip-->
      <UButton
        v-else
        :loading="deleteLoading"
        icon="i-ph-trash-duotone"
        color="rose"
        variant="soft"
        size="xs"
        :class="buttonClasses"
        @click="$emit('delete')"
      />
    </div>


    <!-- UPDATE -->
    <div v-if="update">
    <!-- With tooltip-->
      <UTooltip
      v-if="updateTooltip.length > 0"
      :popper="{placement: 'left', arrow: false  }"
      >
        <template #text>
          <span class="italic">{{ updateTooltip }}</span>
        </template>
        <UButton
          :loading="updateLoading"
          icon="i-ph-pencil"
          color="gray"
          size="xs"
          :class="buttonClasses"
          @click="$emit('update')"
        />
      </UTooltip>
      <!-- Without tooltip-->
      <UButton
        v-else
        :loading="updateLoading"
        icon="i-ph-pencil"
        color="gray"
        size="xs"
        :class="buttonClasses"
        @click="$emit('update')"
      />
    </div>
  </div>



</template>
<script setup lang="ts">
const props = defineProps({
  delete: {
    type: Boolean,
    default: false
  },
  update: {
    type: Boolean,
    default: false
  },
  buttonClasses: {
    type: String,
    default: ''
  },
  containerClasses: {
    type: String,
    default: 'flex flex-row gap-2'
    },
  updateTooltip: {
    type: String,
    default: ''
  },
  deleteTooltip: {
    type: String,
    default: ''
  },
  updateLoading: {
    type: Boolean,
    default: false
  },
  deleteLoading: {
    type: Boolean,
    default: false
  }
})
</script>