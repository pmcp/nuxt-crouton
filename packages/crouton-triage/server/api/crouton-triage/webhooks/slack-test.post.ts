/**
 * MINIMAL TEST ENDPOINT
 * No imports, just basic logging to test if route works
 */

export default defineEventHandler(async (event) => {
  logger.debug('========== SLACK TEST ENDPOINT HIT ==========')
  logger.debug('Method:', event.method)
  logger.debug('Path:', event.path)
  logger.debug('Headers:', getHeaders(event))

  const body = await readBody(event)
  logger.debug('Body:', JSON.stringify(body))

  // If it's URL verification, respond
  if (body && body.type === 'url_verification') {
    logger.debug('URL verification challenge received:', body.challenge)
    return { challenge: body.challenge }
  }

  return {
    success: true,
    message: 'Test endpoint reached!',
    timestamp: new Date().toISOString()
  }
})