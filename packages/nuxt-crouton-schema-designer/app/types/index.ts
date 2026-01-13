export * from './schema'
export * from './package-manifest'

// Project persistence types
export interface SchemaProject {
  id: string
  name: string
  /** Base layer name for custom collections (new format) */
  baseLayerName: string
  /** @deprecated Use baseLayerName instead */
  layerName: string
  /** @deprecated Single collection name - use collections array for multi-collection */
  collectionName: string
  /** @deprecated Single schema - use collections array for multi-collection */
  schema: import('./schema').SchemaDesignerState
  options: import('./schema').CollectionOptions
  /** Selected packages with configuration */
  packages: import('./package-manifest').PackageInstance[]
  /** Multi-collection support - array of collection schemas */
  collections: import('./schema').CollectionSchema[]
  teamId?: string
  userId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectPayload {
  name: string
  /** Base layer name for custom collections (new format) */
  baseLayerName?: string
  /** @deprecated Use baseLayerName instead */
  layerName?: string
  /** Selected packages with configuration */
  packages?: import('./package-manifest').PackageInstance[]
  /** Multi-collection support */
  collections?: import('./schema').CollectionSchema[]
  /** @deprecated Use collections array for multi-collection projects */
  collectionName?: string
  /** @deprecated Use collections array for multi-collection projects */
  schema?: import('./schema').SchemaDesignerState
  options?: import('./schema').CollectionOptions
}

export interface UpdateProjectPayload {
  name?: string
  /** Base layer name for custom collections (new format) */
  baseLayerName?: string
  /** @deprecated Use baseLayerName instead */
  layerName?: string
  /** Selected packages with configuration */
  packages?: import('./package-manifest').PackageInstance[]
  /** Multi-collection support */
  collections?: import('./schema').CollectionSchema[]
  /** @deprecated Use collections array for multi-collection projects */
  collectionName?: string
  /** @deprecated Use collections array for multi-collection projects */
  schema?: import('./schema').SchemaDesignerState
  options?: import('./schema').CollectionOptions
}
