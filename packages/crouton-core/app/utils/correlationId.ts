/**
 * Generate a unique correlation ID for mutation tracking.
 * Format: crtn_{timestamp}_{random}
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `crtn_${timestamp}_${random}`
}
