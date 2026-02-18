<script setup lang="ts">
import { resolveComponent } from 'vue'

const props = defineProps<{
  collection?: string
}>()

const { getConfig } = useCollections()
// Use the registry key ('assets' is the canonical key, per CroutonAssetsPicker convention)
// useCollectionQuery needs the registry key, NOT the apiPath URL segment
const collectionName = props.collection || (getConfig('assets') ? 'assets' : 'assetsAssets')

const { items } = await useCollectionQuery(collectionName)

const assetCardComponent = resolveComponent('CroutonAssetsCard')
</script>

<template>
  <CroutonCollection
    :collection="collectionName"
    layout="grid"
    grid-size="compact"
    :rows="items || []"
    :card-component="assetCardComponent"
    create
    class="h-full"
  />
</template>
