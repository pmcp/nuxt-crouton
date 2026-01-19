export default defineEventHandler(async (_event) => {
  // Simulate a list operation
  return {
    data: [
      { id: '1', title: 'Build DevTools', completed: false, priority: 'high', createdAt: new Date().toISOString() },
      { id: '2', title: 'Test Operations Monitor', completed: false, priority: 'medium', createdAt: new Date().toISOString() },
      { id: '3', title: 'Write Documentation', completed: false, priority: 'low', createdAt: new Date().toISOString() }
    ],
    meta: {
      total: 3,
      page: 1,
      limit: 10
    }
  }
})
