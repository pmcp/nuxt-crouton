/**
 * Test Connection Endpoint
 *
 * Validates that a source configuration can successfully connect to its API.
 * Used by the admin UI to test configs before saving or to diagnose connection issues.
 *
 * **Endpoint:** POST /api/configs/test-connection
 * **Auth:** Required (team member or admin)
 *
 * **Request Modes:**
 *
 * 1. **Test by ID** - Test an existing configuration
 * ```json
 * {
 *   "type": "id",
 *   "configId": "config_abc123"
 * }
 * ```
 *
 * 2. **Test by Config** - Test a configuration (before saving)
 * ```json
 * {
 *   "type": "config",
 *   "config": {
 *     "sourceType": "figma",
 *     "apiToken": "figd_...",
 *     "notionToken": "secret_...",
 *     "notionDatabaseId": "abc123...",
 *     "teamId": "team_xyz"
 *   }
 * }
 * ```
 *
 * **Response:**
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "sourceConnected": true,
 *     "sourceDetails": { ... },
 *     "notionConnected": true,
 *     "notionDetails": { ... },
 *     "validationErrors": [],
 *     "validationWarnings": [],
 *     "testTime": 1234
 *   }
 * }
 * ```
 */

import type { SourceConfig } from '#layers/discubot/types'
import { getAdapter } from '#layers/discubot/server/adapters'
import { testNotionConnection } from '#layers/discubot/server/services/notion'

/**
 * Request to test by config ID
 */
interface TestByIdRequest {
  type: 'id'
  configId: string
}

/**
 * Partial config for testing (before saving)
 */
interface TestConfig {
  sourceType: string
  apiToken: string
  notionToken: string
  notionDatabaseId: string
  teamId: string
  name?: string
  settings?: Record<string, any>
}

/**
 * Request to test by config object
 */
interface TestByConfigRequest {
  type: 'config'
  config: TestConfig
}

/**
 * Union type of all request modes
 */
type TestConnectionRequest = TestByIdRequest | TestByConfigRequest

/**
 * Validate request payload structure
 */
function validateRequest(body: any): asserts body is TestConnectionRequest {
  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: { error: 'Request body must be a JSON object' },
    })
  }

  if (!body.type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing request type',
      data: { error: 'Request must include "type" field (either "id" or "config")' },
    })
  }

  if (body.type === 'id') {
    if (!body.configId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing config ID',
        data: { error: 'Testing by ID requires "configId" field' },
      })
    }
  }
  else if (body.type === 'config') {
    if (!body.config) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing config object',
        data: { error: 'Testing by config requires "config" field' },
      })
    }

    const required = ['sourceType', 'apiToken', 'notionToken', 'notionDatabaseId', 'teamId']
    const missing = required.filter(field => !body.config[field])

    if (missing.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid config object',
        data: {
          error: `Missing required fields in config: ${missing.join(', ')}`,
        },
      })
    }
  }
  else {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request type',
      data: {
        error: `Invalid type "${body.type}". Must be "id" or "config"`,
      },
    })
  }
}

/**
 * Load config from database by ID
 */
async function loadConfigById(configId: string): Promise<SourceConfig> {
  // TODO Phase 5.5: Implement database query to load config
  // For now, throw an error - will be implemented when database integration is ready
  throw createError({
    statusCode: 501,
    statusMessage: 'Not Implemented',
    data: {
      error: 'Testing by ID is not yet implemented. Use type: "config" instead.',
    },
  })
}

/**
 * Convert TestConfig to SourceConfig for adapter testing
 */
function buildSourceConfig(config: TestConfig): SourceConfig {
  return {
    id: 'test', // Temporary ID for testing
    teamId: config.teamId,
    sourceType: config.sourceType,
    name: config.name || 'Test Configuration',
    apiToken: config.apiToken,
    notionToken: config.notionToken,
    notionDatabaseId: config.notionDatabaseId,
    anthropicApiKey: undefined,
    aiEnabled: false,
    autoSync: false,
    settings: config.settings || {},
    active: true,
  }
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    // 1. Read and validate request
    const body = await readBody(event)

    logger.debug('[Test Connection] Received request', {
      type: body?.type,
      configId: body?.configId,
      sourceType: body?.config?.sourceType,
    })

    validateRequest(body)

    // 2. TODO Phase 5.5: Authenticate user
    // const user = await requireAuth(event)
    // const canAccess = await checkTeamAccess(user.id, teamId)
    // if (!canAccess) {
    //   throw createError({
    //     statusCode: 403,
    //     statusMessage: 'Forbidden',
    //     data: { error: 'You do not have access to this team' }
    //   })
    // }

    // 3. Load or build config
    let config: SourceConfig

    if (body.type === 'id') {
      logger.debug('[Test Connection] Loading config from database', {
        configId: body.configId,
      })
      config = await loadConfigById(body.configId)
    }
    else {
      logger.debug('[Test Connection] Building config from request', {
        sourceType: body.config.sourceType,
      })
      config = buildSourceConfig(body.config)
    }

    // 4. Validate config structure
    const adapter = getAdapter(config.sourceType)
    const validation = await adapter.validateConfig(config)

    logger.debug('[Test Connection] Config validation complete', {
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    })

    // 5. Test source connection
    let sourceConnected = false
    let sourceDetails: any = null
    let sourceError: string | null = null

    try {
      logger.debug('[Test Connection] Testing source API connection', {
        sourceType: config.sourceType,
      })

      sourceConnected = await adapter.testConnection(config)

      if (sourceConnected) {
        logger.debug('[Test Connection] Source API connection successful')
        sourceDetails = {
          sourceType: config.sourceType,
          message: `Successfully connected to ${config.sourceType} API`,
        }
      }
      else {
        logger.warn('[Test Connection] Source API connection failed (returned false)')
        sourceError = 'Connection test returned false - check API token'
      }
    }
    catch (error) {
      logger.error('[Test Connection] Source API connection error:', error)
      sourceConnected = false
      sourceError = (error as Error).message || 'Unknown error'
    }

    // 6. Test Notion connection
    let notionConnected = false
    let notionDetails: any = null
    let notionError: string | null = null

    try {
      logger.debug('[Test Connection] Testing Notion API connection', {
        databaseId: config.notionDatabaseId.substring(0, 8) + '...',
      })

      const notionResult = await testNotionConnection({
        apiKey: config.notionToken,
        databaseId: config.notionDatabaseId,
      })

      notionConnected = notionResult.connected
      notionDetails = notionResult.details
      notionError = notionResult.error || null

      if (notionConnected) {
        logger.debug('[Test Connection] Notion API connection successful', {
          databaseTitle: notionDetails?.title,
        })
      }
      else {
        logger.warn('[Test Connection] Notion API connection failed', {
          error: notionError,
        })
      }
    }
    catch (error) {
      logger.error('[Test Connection] Notion API connection error:', error)
      notionConnected = false
      notionError = (error as Error).message || 'Unknown error'
    }

    const testTime = Date.now() - startTime

    logger.debug('[Test Connection] Test complete', {
      sourceConnected,
      notionConnected,
      validationValid: validation.valid,
      testTime: `${testTime}ms`,
    })

    // 7. Return results
    const overallSuccess = sourceConnected && notionConnected && validation.valid

    return {
      success: overallSuccess,
      data: {
        // Source API test results
        sourceConnected,
        sourceDetails,
        sourceError,

        // Notion API test results
        notionConnected,
        notionDetails,
        notionError,

        // Config validation results
        validationErrors: validation.errors,
        validationWarnings: validation.warnings,

        // Performance
        testTime,
      },
    }
  }
  catch (error) {
    logger.error('[Test Connection] Test failed:', error)

    // If this is already a H3Error from createError(), re-throw it
    if ((error as any).statusCode) {
      throw error
    }

    // Otherwise, wrap in a generic error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: {
        error: (error as Error).message,
      },
    })
  }
})
