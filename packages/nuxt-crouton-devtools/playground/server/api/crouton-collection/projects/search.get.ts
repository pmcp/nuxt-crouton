export default defineEventHandler(async (_event) => {
  // Simulate a list operation with occasional error
  const shouldError = Math.random() > 0.8

  if (shouldError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Simulated server error'
    })
  }

  return {
    data: [
      { id: '1', name: 'Crouton DevTools', status: 'active', startDate: '2025-01-01' },
      { id: '2', name: 'Phase 2 Implementation', status: 'active', startDate: '2025-10-07' }
    ],
    meta: {
      total: 2,
      page: 1,
      limit: 10
    }
  }
})
