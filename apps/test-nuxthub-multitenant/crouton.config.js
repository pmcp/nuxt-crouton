export default {
  collections: [
    {
      name: 'projects',
      fieldsFile: './schemas/projects.json',
      sortable: true,
      seed: { count: 5 }
    },
    {
      name: 'tasks',
      fieldsFile: './schemas/tasks.json',
      sortable: true,
      seed: { count: 15 }
    },
    {
      name: 'notes',
      fieldsFile: './schemas/notes.json',
      sortable: true,
      seed: { count: 10 }
    }
  ],
  targets: [
    { layer: 'project-management', collections: ['projects', 'tasks'] },
    { layer: 'knowledge-base', collections: ['notes'] }
  ],
  dialect: 'sqlite',
  flags: {
    useMetadata: true,
    force: true
  }
}