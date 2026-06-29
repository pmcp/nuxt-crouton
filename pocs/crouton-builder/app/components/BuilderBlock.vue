<script setup lang="ts">
/**
 * BuilderBlock — the app's backend-free demo block (#988 MVP). One adaptive component
 * stands in for the collection blocks a real app would generate (list / form / chart /
 * stats / bars), so the builder proves the compose loop without a database. The layout
 * renderer passes a leaf's sanitized `config` as props; `kind` picks the shape, `variant`
 * (rows / cards / table) demonstrates the bounded display-variant enum (#970), and a
 * `bar` kind reads short because the registry declares `sizing.height: 'hug'` (#986).
 */
withDefaults(defineProps<{
  label?: string
  kind?: 'panel' | 'bar' | 'nav'
  variant?: 'rows' | 'cards' | 'table'
  icon?: string
}>(), { label: 'Block', kind: 'panel', variant: 'rows', icon: 'i-lucide-square' })
</script>

<template>
  <!-- Bar — a short top bar (title + faux search + actions). Hugs its height. -->
  <div
    v-if="kind === 'bar'"
    class="flex h-full w-full items-center gap-3 rounded-lg border border-default bg-elevated/60 px-3 py-2"
  >
    <UIcon :name="icon" class="size-4 text-primary" />
    <span class="text-sm font-semibold">{{ label }}</span>
    <div class="ml-2 h-6 flex-1 rounded-md bg-default/60" />
    <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" />
  </div>

  <!-- Nav — a bottom tab bar. Hugs its height. -->
  <div
    v-else-if="kind === 'nav'"
    class="flex h-full w-full items-center justify-around rounded-lg border border-default bg-elevated/60 px-2 py-1.5"
  >
    <UIcon v-for="n in 4" :key="n" :name="icon" class="size-5 text-muted" />
  </div>

  <!-- Panel — a generic content block, rendered per display variant. Fills its pane. -->
  <div class="flex h-full w-full flex-col gap-2 overflow-auto rounded-lg border border-default bg-elevated/40 p-3">
    <div class="flex items-center gap-2">
      <UIcon :name="icon" class="size-4 text-primary" />
      <span class="text-xs font-semibold">{{ label }}</span>
      <UBadge class="ml-auto" size="xs" color="neutral" variant="subtle">{{ variant }}</UBadge>
    </div>

    <div v-if="variant === 'table'" class="grid grid-cols-3 gap-px overflow-hidden rounded border border-default bg-default/40 text-[10px]">
      <div v-for="n in 9" :key="n" class="bg-elevated/70 px-2 py-1 text-muted">cell {{ n }}</div>
    </div>
    <div v-else-if="variant === 'cards'" class="grid grid-cols-2 gap-2">
      <div v-for="n in 4" :key="n" class="h-10 rounded-md bg-default/50" />
    </div>
    <div v-else class="flex flex-col gap-1.5">
      <div v-for="n in 4" :key="n" class="h-2.5 rounded bg-default/60" :style="{ width: `${95 - n * 9}%` }" />
    </div>
  </div>
</template>
