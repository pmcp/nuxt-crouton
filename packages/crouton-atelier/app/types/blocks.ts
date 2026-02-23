export type Visibility = 'public' | 'auth' | 'admin'
export type BlockCategory = 'content' | 'data' | 'interaction' | 'member' | 'admin'

export interface BlockField {
  name: string
  type: string
  meta?: Record<string, unknown>
}

export interface BlockCollection {
  name: string
  fields: BlockField[]
  seedCount?: number
}

export interface Block {
  id: string
  label: string
  description: string
  icon: string
  package: string
  visibility: Visibility
  collections: BlockCollection[]
  category: BlockCategory
}

export interface SelectedBlock {
  blockId: string
  visibility: Visibility
  order: number
}

export interface AppIdentity {
  name: string
  description: string
  icon: string
}

export interface AppComposition {
  identity: AppIdentity
  selectedBlocks: SelectedBlock[]
  enabledPackages: string[]
}

export interface Template {
  id: string
  label: string
  description: string
  icon: string
  blocks: Array<{ blockId: string, visibility?: Visibility }>
  identity: { name: string, description: string }
}

export interface AtelierProject {
  id: string
  teamId: string
  name: string
  composition: AppComposition
  createdAt: number
  updatedAt: number
}
