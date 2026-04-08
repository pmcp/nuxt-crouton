#!/usr/bin/env node
/**
 * Crouton MCP Server
 *
 * MCP server for AI-powered collection generation in Nuxt Crouton applications.
 * Provides tools for schema design, validation, and collection generation.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import {
  handleDesignSchema,
  designSchemaToolDefinition,
  designSchemaInputSchema,
  handleValidateSchema,
  validateSchemaToolDefinition,
  validateSchemaInputSchema,
  handleGenerateCollection,
  generateCollectionToolDefinition,
  generateCollectionInputSchema,
  handleListCollections,
  listCollectionsToolDefinition,
  listCollectionsInputSchema,
  handleListLayers,
  listLayersToolDefinition,
  listLayersInputSchema,
  // New CLI integration tools
  handleCliHelp,
  cliHelpToolDefinition,
  cliHelpInputSchema,
  handleDryRun,
  dryRunToolDefinition,
  dryRunInputSchema,
  handleRollback,
  rollbackToolDefinition,
  rollbackInputSchema,
  handleInitSchema,
  initSchemaToolDefinition,
  initSchemaInputSchema
} from './tools/index.js'

import { FIELD_TYPES, getFieldTypeReference, loadFieldTypes } from './utils/field-types.js'

// Create MCP server
const server = new McpServer({
  name: 'crouton-mcp-server',
  version: '1.0.0'
})

/**
 * Wrap a tool handler with the MCP response envelope.
 * Every tool returns the same `{ content: [{ type: 'text', text: JSON }] }` shape,
 * so this helper centralizes the boilerplate. Handler can be sync or async; arg-less
 * handlers (like list_layers) work because the wrapper just ignores the arg.
 */
function registerTool<TInput>(
  definition: { name: string; description: string },
  inputSchema: any,
  handler: (args: TInput) => unknown | Promise<unknown>
) {
  server.tool(
    definition.name,
    definition.description,
    inputSchema,
    async (args: TInput) => {
      const result = await handler(args)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2)
          }
        ]
      }
    }
  )
}

// Schema & generation tools
registerTool(designSchemaToolDefinition, designSchemaInputSchema, handleDesignSchema)
registerTool(validateSchemaToolDefinition, validateSchemaInputSchema, handleValidateSchema as (args: unknown) => unknown)
registerTool(generateCollectionToolDefinition, generateCollectionInputSchema, handleGenerateCollection)
registerTool(listCollectionsToolDefinition, listCollectionsInputSchema, handleListCollections)
registerTool(listLayersToolDefinition, listLayersInputSchema, () => handleListLayers())

// CLI integration tools
registerTool(cliHelpToolDefinition, cliHelpInputSchema, handleCliHelp)
registerTool(dryRunToolDefinition, dryRunInputSchema, handleDryRun)
registerTool(rollbackToolDefinition, rollbackInputSchema, handleRollback)
registerTool(initSchemaToolDefinition, initSchemaInputSchema, handleInitSchema)

// Register resources
server.resource('crouton://field-types', 'Field Types Reference', async () => {
  return {
    contents: [
      {
        uri: 'crouton://field-types',
        mimeType: 'text/markdown',
        text: getFieldTypeReference()
      }
    ]
  }
})

server.resource('crouton://field-types/json', 'Field Types (JSON)', async () => {
  return {
    contents: [
      {
        uri: 'crouton://field-types/json',
        mimeType: 'application/json',
        text: JSON.stringify(FIELD_TYPES, null, 2)
      }
    ]
  }
})

server.resource('crouton://schema-template', 'Schema Template', async () => {
  const template = {
    id: {
      type: 'string',
      meta: { primaryKey: true }
    },
    name: {
      type: 'string',
      meta: { required: true, maxLength: 255 }
    },
    description: {
      type: 'text',
      meta: { component: 'EditorSimple' }
    }
  }

  return {
    contents: [
      {
        uri: 'crouton://schema-template',
        mimeType: 'application/json',
        text: JSON.stringify(template, null, 2)
      }
    ]
  }
})

// Start server
async function main(): Promise<void> {
  // Load field types from package manifests before accepting connections
  await loadFieldTypes()

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Crouton MCP Server started')
}

main().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
