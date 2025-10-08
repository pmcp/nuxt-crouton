export default defineAppConfig({
  croutonCollections: {
    // Internal collection example
    tasks: {
      name: 'tasks',
      layer: 'internal',
      apiPath: '/api/crouton-collection/tasks',
      componentName: 'TasksForm',
      meta: {
        label: 'Tasks',
        description: 'Task management collection',
        icon: 'i-heroicons-check-circle'
      },
      defaultValues: {
        title: '',
        completed: false,
        priority: 'medium'
      },
      columns: ['title', 'completed', 'priority', 'createdAt']
    },

    // Another internal collection
    projects: {
      name: 'projects',
      layer: 'internal',
      apiPath: '/api/crouton-collection/projects',
      componentName: 'ProjectsForm',
      meta: {
        label: 'Projects',
        description: 'Project management collection'
      },
      defaultValues: {
        name: '',
        status: 'active'
      },
      columns: ['name', 'status', 'startDate', 'endDate']
    },

    // External collection example
    users: {
      name: 'users',
      layer: 'external',
      apiPath: '/api/crouton-collection/users',
      componentName: null,
      meta: {
        label: 'Users',
        description: 'External user management (read-only)'
      },
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' }
        }
      }
    },

    // Another collection
    notes: {
      name: 'notes',
      layer: 'internal',
      apiPath: '/api/crouton-collection/notes',
      componentName: 'NotesForm',
      meta: {
        label: 'Notes',
        description: 'Quick notes and memos'
      }
    }
  }
})
