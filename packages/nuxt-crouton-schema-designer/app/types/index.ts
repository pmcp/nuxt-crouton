export * from './schema'

// Project persistence types
export interface SchemaProject {
  id: string
  name: string
  layerName: string
  collectionName: string
  schema: import('./schema').SchemaDesignerState
  options: import('./schema').CollectionOptions
  teamId?: string
  userId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectPayload {
  name: string
  layerName: string
  collectionName: string
  schema: import('./schema').SchemaDesignerState
  options: import('./schema').CollectionOptions
}

export interface UpdateProjectPayload {
  name?: string
  layerName?: string
  collectionName?: string
  schema?: import('./schema').SchemaDesignerState
  options?: import('./schema').CollectionOptions
}
