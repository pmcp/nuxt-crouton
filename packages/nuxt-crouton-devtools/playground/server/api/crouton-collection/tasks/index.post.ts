export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Simulate a create operation
  return {
    data: {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
      createdAt: new Date().toISOString()
    }
  }
})
