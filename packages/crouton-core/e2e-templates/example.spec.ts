/**
 * Example E2E Test File
 *
 * Shows how to use the collection-crud templates.
 * Copy and customize for your collections.
 */
import { collectionTest } from './collection-crud'

// Basic collection test - uses 'name' field by default
collectionTest('projects')

// Collection with custom name field
collectionTest('posts', {
  nameField: 'title'
})

// Collection with required fields
collectionTest('tasks', {
  nameField: 'title',
  requiredFields: {
    status: 'pending'
  }
})

// Skip certain tests if not applicable
collectionTest('logs', {
  skip: ['create', 'update', 'delete'] // Read-only collection
})
