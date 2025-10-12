/**
 * Proxy endpoint for Club Planner API
 * Fetches event/reservation data from Club Planner
 */

export default defineEventHandler(async (event) => {
  try {
    // Read and validate the request body
    const body = await readBody(event)

    // Validate required fields based on your needs
    if (!body.calendarGroupId && !body.reservationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either calendarGroupId or reservationId is required'
      })
    }

    // Generate a browser ID (or use a static one for server-side requests)
    const browserID = crypto.randomUUID()

    // Make the request to Club Planner API
    const response = await $fetch('https://repsclub.clubplanner.app/api/v1/registration/reservation/events/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-BROWSER-ID': browserID,
      },
      body: body
    })

    return response
  } catch (error: any) {
    console.error('Club Planner API error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.data?.Message || error.message || 'Failed to fetch events from Club Planner'
    })
  }
})