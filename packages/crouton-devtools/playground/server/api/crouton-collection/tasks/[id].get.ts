export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  // Simulate a get operation
  return {
    data: {
      id,
      title: 'Build DevTools',
      completed: false,
      priority: 'high',
      createdAt: new Date().toISOString()
    }
  }
})
