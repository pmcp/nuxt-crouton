export default {
  dialect: 'sqlite',

  collections: [
    { name: 'tags', fieldsFile: './schemas/tags.json', sortable: true, seed: { count: 10 } },
    { name: 'categories', fieldsFile: './schemas/categories.json', hierarchy: true, seed: { count: 8 } },
    { name: 'posts', fieldsFile: './schemas/posts.json', seed: { count: 15 } },
    { name: 'decisions', fieldsFile: './schemas/decisions.json', hierarchy: true, seed: { count: 6 } },
    { name: 'options', fieldsFile: './schemas/options.json', seed: { count: 5 } }
  ],

  // Global seed settings
  seed: {
    defaultCount: 10,
    defaultTeamId: 'playground-team'
  },

  targets: [
    {
      layer: 'playground',
      collections: ['tags', 'categories', 'posts', 'decisions', 'options']
    }
  ],

  translations: {
    collections: {
      categories: ['name', 'description'],
      posts: ['title', 'excerpt', 'content']
    }
  },

  flags: {
    useMetadata: true,
    force: true
  }
}