import type { SchemaProject, CreateProjectPayload, UpdateProjectPayload, CollectionSchema } from '../types'

export function useSchemaProjects() {
  const projects = useState<SchemaProject[]>('schema-projects', () => [])
  const loading = useState('schema-projects-loading', () => false)
  const error = useState<string | null>('schema-projects-error', () => null)

  /**
   * Fetch all projects
   */
  async function fetchProjects(teamId?: string) {
    loading.value = true
    error.value = null

    try {
      const query = teamId ? `?teamId=${teamId}` : ''
      const response = await $fetch<{ projects: SchemaProject[] }>(`/api/schema-projects${query}`)
      projects.value = response.projects
      return response.projects
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch projects'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Get a single project by ID
   */
  async function getProject(id: string) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ project: SchemaProject }>(`/api/schema-projects/${id}`)
      return response.project
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch project'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new project
   */
  async function createProject(payload: CreateProjectPayload) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ project: SchemaProject }>('/api/schema-projects', {
        method: 'POST',
        body: payload
      })

      // Add to local state
      projects.value = [response.project, ...projects.value]

      return response.project
    } catch (e: any) {
      error.value = e.message || 'Failed to create project'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing project
   */
  async function updateProject(id: string, payload: UpdateProjectPayload) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ project: SchemaProject }>(`/api/schema-projects/${id}`, {
        method: 'PUT',
        body: payload
      })

      // Update local state
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value[index] = response.project
      }

      return response.project
    } catch (e: any) {
      error.value = e.message || 'Failed to update project'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a project
   */
  async function deleteProject(id: string) {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/schema-projects/${id}`, {
        method: 'DELETE'
      })

      // Remove from local state
      projects.value = projects.value.filter(p => p.id !== id)

      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete project'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    projects,
    loading,
    error,

    // Methods
    fetchProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject
  }
}
