<template>

  <div class="group relative">

    <div class="bg-white dark:bg-gray-900 rounded-md relative z-10">
      <div class="
      border border-gray-300 dark:border-gray-700 rounded-md
      text-xs text-gray-700 dark:text-gray-200
      p-2
      shadow-sm
      transition delay-150 duration-200 ease-in-out
      bg-white
      dark:bg-gray-800/60 dark:group-hover:bg-gray-800/50"
      >

        <USkeleton v-if="!item" class="h-4 w-full" />
        <span v-else>{{ item.title }}</span>
      </div>

</div>

    <InterfaceCrudMiniButtons
      v-if="item"
      class="absolute -top-1 right-2 transition delay-150 duration-300 ease-in-out group-hover:-translate-y-6 group-hover:scale-110"
      update
      @update="open('update', collection, [id])"
      :update-loading="item.optimisticAction === 'update'"
      buttonClasses="pb-4"
      containerClasses="flex flex-row gap-[2px]"
      :class="item.optimisticAction === 'update' ? 'transition-none -translate-y-6' : ''"
    />


  </div>
</template>

<script setup>
const { open } = useCrud()
const props = defineProps({
  id: {
    type: String,
    required: true
  },
  collection: {
    type: String,
    required: true
  }
})

const item = computed(() => useCollections()[props.collection].value.find(i => i.id === props.id))
</script>