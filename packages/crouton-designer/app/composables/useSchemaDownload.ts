import { zipSync, strToU8 } from 'fflate'
import type { CollectionWithFields } from './useCollectionEditor'
import type { ProjectConfig, SeedDataMap } from '../types/schema'

export interface ArtifactFile {
  filename: string
  content: string
  status: 'new' | 'pending' | 'ready'
}

export function useSchemaDownload(
  collections: Ref<CollectionWithFields[]>,
  config: Ref<ProjectConfig>,
  seedData?: Ref<SeedDataMap>
) {
  const { schemaFiles, getAllSchemasAsJson } = useSchemaExport(collections)

  // Build artifact list with status
  const artifacts = computed<ArtifactFile[]>(() => {
    const schemaArtifacts = schemaFiles.value.map(file => {
      const output = file.display
        ? { display: file.display, fields: file.schema }
        : file.schema
      return {
        filename: `schemas/${file.name}.json`,
        content: JSON.stringify(output, null, 2),
        status: 'ready' as const
      }
    })

    // Add seed data artifacts
    const seedArtifacts: ArtifactFile[] = []
    if (seedData?.value) {
      for (const [collectionName, entries] of Object.entries(seedData.value)) {
        if (entries.length > 0) {
          // Strip _id from entries (synthetic field, not needed by CLI)
          const cleaned = entries.map(({ _id, ...rest }) => rest)
          seedArtifacts.push({
            filename: `seed/${collectionName}.seed.json`,
            content: JSON.stringify(cleaned, null, 2),
            status: 'ready' as const
          })
        }
      }
    }

    return [...schemaArtifacts, ...seedArtifacts]
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

    // Add seed data files
    if (seedData?.value) {
      for (const [collectionName, entries] of Object.entries(seedData.value)) {
        if (entries.length > 0) {
          const cleaned = entries.map(({ _id, ...rest }) => rest)
          files[`seed/${collectionName}.seed.json`] = strToU8(JSON.stringify(cleaned, null, 2))
        }
      }
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
