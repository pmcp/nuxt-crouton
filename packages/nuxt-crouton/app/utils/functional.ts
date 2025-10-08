// Immutable collection operations
export const addToCollection = <T>(collection: T[], item: T): T[] =>
  [...collection, item]

export const removeFromCollection = <T extends { id: string | number }>(
  collection: T[],
  ids: (string | number)[]
): T[] =>
  collection.filter(item => !ids.includes(item.id))

export const updateInCollection = <T extends { id: string | number }>(
  collection: T[],
  id: string | number,
  updates: Partial<T>
): T[] =>
  collection.map(item =>
    item.id === id ? { ...item, ...updates } : item
  )

export const findInCollection = <T extends { id: string | number }>(
  collection: T[],
  id: string | number
): T | undefined =>
  collection.find(item => item.id === id)

export const findIndexInCollection = <T extends { id: string | number }>(
  collection: T[],
  id: string | number
): number =>
  collection.findIndex(item => item.id === id)

// Functional composition utilities
export const pipe = <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduce((acc, fn) => fn(acc), value)

export const compose = <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduceRight((acc, fn) => fn(acc), value)

// Identity function for default transforms
export const identity = <T>(x: T): T => x

// Curried API builder
export const createApiCall = (method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE') =>
  (endpoint: string) =>
    (data?: any, options?: RequestInit) =>
      $fetch(endpoint, {
        method: method as any,
        body: data,
        ...options
      })

// Specific API methods
export const apiGet = createApiCall('GET')
export const apiPost = createApiCall('POST')
export const apiPatch = createApiCall('PATCH')
export const apiDelete = createApiCall('DELETE')