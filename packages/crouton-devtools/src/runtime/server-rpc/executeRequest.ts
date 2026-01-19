import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { method, path, params, requestBody, headers } = body

  const startTime = Date.now()

  try {
    // Build full URL with path parameters
    let finalPath = path

    // Replace path parameters (e.g., :id)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (finalPath.includes(`:${key}`)) {
          finalPath = finalPath.replace(`:${key}`, String(value))
        }
      }
    }

    // Build query string for GET requests
    const queryParams = new URLSearchParams()
    if (method === 'GET' && params) {
      for (const [key, value] of Object.entries(params)) {
        if (!finalPath.includes(`:${key}`) && value !== undefined && value !== '') {
          queryParams.append(key, String(value))
        }
      }
    }

    // Append query string if present
    const queryString = queryParams.toString()
    if (queryString) {
      finalPath += `?${queryString}`
    }

    // Make the request
    const response = await $fetch(finalPath, {
      method,
      body: requestBody || undefined,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    })

    return {
      success: true,
      status: 200,
      data: response,
      duration: Date.now() - startTime
    }
  } catch (error: any) {
    return {
      success: false,
      status: error.statusCode || error.response?.status || 500,
      error: error.message || 'Request failed',
      data: error.data || error.response?.data || null,
      duration: Date.now() - startTime
    }
  }
})
