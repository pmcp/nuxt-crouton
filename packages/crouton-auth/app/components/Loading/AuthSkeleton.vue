<!--
  AuthSkeleton Component

  Generic skeleton loader for auth-related content.
  Provides smooth loading state visualization.

  @example
  <AuthSkeleton type="form" />
  <AuthSkeleton type="card" />
  <AuthSkeleton type="list" :count="3" />
-->
<script setup lang="ts">
interface Props {
  type?: 'form' | 'card' | 'list' | 'profile' | 'table'
  count?: number
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'form',
  count: 3,
  animated: true
})

const animationClass = computed(() =>
  props.animated ? 'animate-pulse' : ''
)
</script>

<template>
  <!-- Form Skeleton -->
  <div
    v-if="type === 'form'"
    class="space-y-4"
    :class="animationClass"
  >
    <div class="space-y-2">
      <div class="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div class="space-y-2">
      <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div class="space-y-2">
      <div class="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded mt-6" />
  </div>

  <!-- Card Skeleton -->
  <div
    v-else-if="type === 'card'"
    class="p-6 border border-gray-200 dark:border-gray-700 rounded-lg"
    :class="animationClass"
  >
    <div class="flex items-center gap-4 mb-4">
      <div class="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div class="space-y-2 flex-1">
        <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div class="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
    <div class="space-y-2">
      <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
      <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
    </div>
  </div>

  <!-- List Skeleton -->
  <div
    v-else-if="type === 'list'"
    class="space-y-3"
    :class="animationClass"
  >
    <div
      v-for="i in count"
      :key="i"
      class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
    >
      <div class="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div class="flex-1 space-y-2">
        <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div class="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div class="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  </div>

  <!-- Profile Skeleton -->
  <div
    v-else-if="type === 'profile'"
    class="space-y-6"
    :class="animationClass"
  >
    <div class="flex items-center gap-4">
      <div class="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div class="space-y-2">
        <div class="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
    <div class="space-y-4">
      <div class="space-y-2">
        <div class="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div class="space-y-2">
        <div class="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  </div>

  <!-- Table Skeleton -->
  <div
    v-else-if="type === 'table'"
    :class="animationClass"
  >
    <!-- Header -->
    <div class="flex gap-4 p-3 border-b border-gray-200 dark:border-gray-700">
      <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      <div class="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
      <div class="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded ml-auto" />
    </div>
    <!-- Rows -->
    <div
      v-for="i in count"
      :key="i"
      class="flex gap-4 p-3 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      <div class="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
      <div class="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded ml-auto" />
    </div>
  </div>
</template>
