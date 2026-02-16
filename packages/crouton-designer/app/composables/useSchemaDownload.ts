import { zipSync, strToU8 } from 'fflate'
import type { CollectionWithFields } from './useCollectionEditor'
import type { ProjectConfig } from '../types/schema'

export interface ArtifactFile {
  filename: string
  content: string
  status: 'new' | 'pending' | 'ready'
}

export function useSchemaDownload(
  collections: Ref<CollectionWithFields[]>,
  config: Ref<ProjectConfig>
) {
  const { schemaFiles, getAllSchemasAsJson } = useSchemaExport(collections)

  // Build artifact list with status
  const artifacts = computed<ArtifactFile[]>(() => {
    return schemaFiles.value.map(file => ({
      filename: `schemas/${file.name}.json`,
      content: JSON.stringify(file.schema, null, 2),
      status: 'ready' as const
    }))
  })

  // CLI command to show after download
  const cliCommand = computed(() => {
    const layerName = config.value.name
      ? config.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'my-app'
    const collectionNames = schemaFiles.value.map(f => f.name)
    if (collectionNames.length === 0) return ''

    const commands = collectionNames.map(name =>
      `pnpm crouton generate ${layerName} ${name} --fields-file=./schemas/${name}.json`
    )
    return commands.join('\n')
  })

  /**
   * Create and download a ZIP file containing all schema JSONs
   */
  function downloadZip() {
    const schemas = getAllSchemasAsJson()
    if (schemas.size === 0) return

    // Build file structure for fflate
    const files: Record<string, Uint8Array> = {}
    for (const [filename, content] of schemas) {
      files[`schemas/${filename}`] = strToU8(content)
    }

    // Create ZIP
    const zipped = zipSync(files)

    // Trigger download
    const blob = new Blob([zipped as unknown as ArrayBuffer], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.value.name || 'schemas'}-schemas.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    artifacts,
    cliCommand,
    downloadZip
  }
}
