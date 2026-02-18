// Load and parse a fields schema JSON file into typed Field objects

import fsp from 'node:fs/promises'
import path from 'node:path'
import { mapType } from './helpers.ts'

export interface Field {
  name: string
  type: string
  meta: Record<string, any>
  refTarget?: string
  refScope?: string
  zod: string
  default: string
  tsType: string
}

export async function loadFields(p: string, typeMapping: Record<string, any>): Promise<Field[]> {
  // If path is relative and doesn't exist, check in schemas directory
  if (!path.isAbsolute(p) && !await fsp.access(p).then(() => true).catch(() => false)) {
    const schemasPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'schemas', p)
    if (await fsp.access(schemasPath).then(() => true).catch(() => false)) {
      p = schemasPath
    }
  }
  const raw = await fsp.readFile(p, 'utf8')
  const obj: Record<string, Record<string, any>> = JSON.parse(raw)

  const validTypes = new Set(Object.keys(typeMapping))

  // Convert to array for easier processing
  return Object.entries(obj).map(([name, meta]) => {
    const fieldMeta = meta?.meta || {} as Record<string, any>
    // Set default area if not specified
    if (!fieldMeta.area) {
      fieldMeta.area = 'main'
    }

    const resolvedType = mapType(meta?.type, validTypes)
    return {
      name,
      type: resolvedType,
      meta: fieldMeta,
      refTarget: meta?.refTarget,
      refScope: meta?.refScope,
      zod: typeMapping[resolvedType]?.zod || 'z.string()',
      default: typeMapping[resolvedType]?.default || '\'\'',
      tsType: typeMapping[resolvedType]?.tsType || 'string'
    }
  })
}
