<script setup lang="ts">
import { nanoid } from 'nanoid'

interface KvrWerkvergunningensCableItem {
  id: string
  van?: string
  naar?: string
  buitenSpanningGeaard?: boolean
  losgekoppeld?: boolean
  sleufGeidentificeerd?: boolean
}

const model = defineModel<KvrWerkvergunningensCableItem>({ required: true })

if (model.value && !model.value.id) {
  model.value = { ...model.value, id: nanoid() }
}
</script>

<template>
  <div class="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center w-full">
    <UInput v-model="model.van" size="md" placeholder="Van (vertrek)" />
    <UInput v-model="model.naar" size="md" placeholder="Naar (aankomst)" />
    <div class="flex flex-col items-center gap-1 px-2">
      <UCheckbox v-model="model.buitenSpanningGeaard" />
      <span class="text-[10px] text-neutral-500 text-center leading-tight">Buiten spanning<br>en geaard</span>
    </div>
    <div class="flex flex-col items-center gap-1 px-2">
      <UCheckbox v-model="model.losgekoppeld" />
      <span class="text-[10px] text-neutral-500 text-center leading-tight">Losgekoppeld<br>niet geaard</span>
    </div>
    <div class="flex flex-col items-center gap-1 px-2">
      <UCheckbox v-model="model.sleufGeidentificeerd" />
      <span class="text-[10px] text-neutral-500 text-center leading-tight">In de sleuf<br>geïdentificeerd</span>
    </div>
  </div>
</template>
