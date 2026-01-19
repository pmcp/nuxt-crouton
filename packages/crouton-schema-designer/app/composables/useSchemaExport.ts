import type { SchemaDesignerState, SchemaField } from '../types/schema'

export function useSchemaExport() {
  /**
   * Convert state to JSON schema format
   */
  function exportSchema(state: SchemaDesignerState): string {
    const schema: Record<string, any> = {}

    // Add id field first
    schema.id = { type: 'uuid', meta: { primaryKey: true } }

    // Add user fields
    for (const field of state.fields) {
      if (!field.name) continue

      const fieldDef: Record<string, any> = {
        type: field.type
      }

      // Add meta if there are any properties set
      const meta: Record<string, any> = {}
      if (field.meta.required) meta.required = true
      if (field.meta.maxLength) meta.maxLength = field.meta.maxLength
      if (field.meta.label) meta.label = field.meta.label
      if (field.meta.translatable) meta.translatable = true
      if (field.meta.area) meta.area = field.meta.area
      if (field.meta.unique) meta.unique = true
      if (field.meta.default !== undefined) meta.default = field.meta.default
      if (field.meta.group) meta.group = field.meta.group
      if (field.meta.precision) meta.precision = field.meta.precision
      if (field.meta.scale) meta.scale = field.meta.scale

      if (Object.keys(meta).length > 0) {
        fieldDef.meta = meta
      }

      // Add refTarget if set
      if (field.refTarget) {
        fieldDef.refTarget = field.refTarget
      }

      schema[field.name] = fieldDef
    }

    return JSON.stringify(schema, null, 2)
  }

  /**
   * Generate crouton.config.js snippet
   */
  function exportConfig(state: SchemaDesignerState): string {
    const collectionConfig: Record<string, any> = {
      name: state.collectionName,
      fieldsFile: `./schemas/${state.collectionName}.json`
    }

    if (state.options.hierarchy) collectionConfig.hierarchy = true
    if (state.options.sortable) collectionConfig.sortable = true
    if (state.options.translatable) collectionConfig.translatable = true
    if (state.options.seed) {
      collectionConfig.seed = state.options.seedCount !== 25
        ? { count: state.options.seedCount }
        : true
    }

    const config = {
      dialect: 'sqlite',
      collections: [collectionConfig],
      targets: [
        { layer: state.layerName, collections: [state.collectionName] }
      ],
      flags: {
        useMetadata: true
      }
    }

    // Format as JS export
    const jsonStr = JSON.stringify(config, null, 2)
    return `export default ${jsonStr}`
  }

  /**
   * Generate CLI command
   */
  function exportCliCommand(state: SchemaDesignerState): string {
    const args = [
      `pnpm crouton ${state.layerName} ${state.collectionName}`,
      `--fields-file=./schemas/${state.collectionName}.json`
    ]

    if (state.options.hierarchy) args.push('--hierarchy')
    if (state.options.sortable) args.push('--sortable')
    if (state.options.seed) {
      args.push(`--seed --count=${state.options.seedCount}`)
    }

    return args.join(' \\\n  ')
  }

  /**
   * Generate Card.vue component file content
   */
  function exportCardComponent(state: SchemaDesignerState): string {
    const template = state.cardTemplate || `<div>{{ item.name || item.title || 'Item' }}</div>`

    return `<script setup lang="ts">
interface Props {
  item: any
  layout: 'list' | 'grid' | 'cards'
  collection: string
}

defineProps<Props>()
</script>

<template>
${template}
</template>
`
  }

  /**
   * Download schema as JSON file
   */
  function downloadSchema(state: SchemaDesignerState) {
    const schema = exportSchema(state)
    const blob = new Blob([schema], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${state.collectionName || 'schema'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Download Card.vue component file
   */
  function downloadCardComponent(state: SchemaDesignerState) {
    const cardCode = exportCardComponent(state)
    const blob = new Blob([cardCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Card.vue'
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    exportSchema,
    exportConfig,
    exportCliCommand,
    exportCardComponent,
    downloadSchema,
    downloadCardComponent
  }
}
