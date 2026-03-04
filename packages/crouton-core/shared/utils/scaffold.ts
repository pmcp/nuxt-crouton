/**
 * Shared scaffold utilities used by crouton-designer and crouton-atelier.
 */

import type { ScaffoldArtifact } from '../types/scaffold'

export const SCAFFOLD_CATEGORY_ICONS: Record<ScaffoldArtifact['category'], string> = {
  config: 'i-lucide-settings',
  app: 'i-lucide-layout',
  server: 'i-lucide-server',
  schema: 'i-lucide-file-json',
  seed: 'i-lucide-sprout',
}

export const FOLDER_NAME_REGEX = /^[a-z][a-z0-9-]*$/

export function toKebabAppName(name: string): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function groupArtifactsByCategory(
  artifacts: ScaffoldArtifact[]
): Record<string, { icon: string; artifacts: ScaffoldArtifact[] }> {
  const groups: Record<string, { icon: string; artifacts: ScaffoldArtifact[] }> = {}

  for (const artifact of artifacts) {
    if (!groups[artifact.category]) {
      groups[artifact.category] = {
        icon: SCAFFOLD_CATEGORY_ICONS[artifact.category],
        artifacts: [],
      }
    }
    groups[artifact.category]!.artifacts.push(artifact)
  }

  return groups
}
