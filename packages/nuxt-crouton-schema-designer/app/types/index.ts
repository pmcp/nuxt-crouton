export * from './schema'

// Project persistence types
export interface SchemaProject {
  id: string
  name: string
  layerName: string
  /** @deprecated Single collection name - use collections array for multi-collection */
  collectionName: string
  /** @deprecated Single schema - use collections array for multi-collection */
  schema: import('./schema').SchemaDesignerState
  options: import('./schema').CollectionOptions
  /** Multi-collection support - array of collection schemas */
  collections?: import('./schema').CollectionSchema[]
  teamId?: string
  userId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectPayload {
  name: string
  layerName: string
  /** @deprecated Use collections array for multi-collection projects */
  collectionName?: string
  /** @deprecated Use collections array for multi-collection projects */
  schema?: import('./schema').SchemaDesignerState
  options?: import('./schema').CollectionOptions
  /** Multi-collection support */
  collections?: import('./schema').CollectionSchema[]
}

export interface UpdateProjectPayload {
  name?: string
  layerName?: string
  /** @deprecated Use collections array for multi-collection projects */
  collectionName?: string
  /** @deprecated Use collections array for multi-collection projects */
  schema?: import('./schema').SchemaDesignerState
  options?: import('./schema').CollectionOptions
  /** Multi-collection support */
  collections?: import('./schema').CollectionSchema[]
}
