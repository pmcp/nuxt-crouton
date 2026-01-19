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

import { FIELD_TYPES, getFieldTypeReference } from './utils/field-types.js'

// Create MCP server
const server = new McpServer({
  name: 'crouton-mcp-server',
  version: '1.0.0'
})

// Register tools with Zod schemas
server.tool(
  designSchemaToolDefinition.name,
  designSchemaToolDefinition.description,
  designSchemaInputSchema,
  async (args) => {
    const result = handleDesignSchema(args)
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

server.tool(
  validateSchemaToolDefinition.name,
  validateSchemaToolDefinition.description,
  validateSchemaInputSchema,
  async (args) => {
    const result = handleValidateSchema(args as Parameters<typeof handleValidateSchema>[0])
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

server.tool(
  generateCollectionToolDefinition.name,
  generateCollectionToolDefinition.description,
  generateCollectionInputSchema,
  async (args) => {
    const result = await handleGenerateCollection(args)
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

server.tool(
  listCollectionsToolDefinition.name,
  listCollectionsToolDefinition.description,
  listCollectionsInputSchema,
  async (args) => {
    const result = await handleListCollections(args)
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

server.tool(
  listLayersToolDefinition.name,
  listLayersToolDefinition.description,
  listLayersInputSchema,
  async () => {
    const result = await handleListLayers()
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

// CLI integration tools
server.tool(
  cliHelpToolDefinition.name,
  cliHelpToolDefinition.description,
  cliHelpInputSchema,
  async (args) => {
    const result = await handleCliHelp(args)
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

server.tool(
  dryRunToolDefinition.name,
  dryRunToolDefinition.description,
  dryRunInputSchema,
  async (args) => {
    const result = await handleDryRun(args)
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

server.tool(
  rollbackToolDefinition.name,
  rollbackToolDefinition.description,
  rollbackInputSchema,
  async (args) => {
    const result = await handleRollback(args)
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

server.tool(
  initSchemaToolDefinition.name,
  initSchemaToolDefinition.description,
  initSchemaInputSchema,
  async (args) => {
    const result = handleInitSchema(args)
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
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Crouton MCP Server started')
}

main().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
