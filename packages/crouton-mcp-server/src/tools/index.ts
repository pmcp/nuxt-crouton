/**
 * Tool exports for the Crouton MCP Server
 */

export {
  handleDesignSchema,
  designSchemaToolDefinition,
  designSchemaInputSchema,
  type DesignSchemaInput,
  type DesignSchemaResult
} from './design-schema.js'

export {
  handleValidateSchema,
  validateSchemaToolDefinition,
  validateSchemaInputSchema,
  type ValidateSchemaInput,
  type ValidationResult,
  type SchemaField
} from './validate-schema.js'

export {
  handleGenerateCollection,
  generateCollectionToolDefinition,
  generateCollectionInputSchema,
  type GenerateCollectionInput,
  type GenerateResult
} from './generate.js'

export {
  handleListCollections,
  handleListLayers,
  listCollectionsToolDefinition,
  listCollectionsInputSchema,
  listLayersToolDefinition,
  listLayersInputSchema,
  type ListCollectionsInput,
  type ListCollectionsResult,
  type ListLayersResult
} from './list-collections.js'
