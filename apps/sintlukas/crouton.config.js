export default {
  features: {
    pages: true
  },

  collections: [
    { name: 'categories', fieldsFile: './schemas/categories.json', seed: true },
    { name: 'ateliers', fieldsFile: './schemas/ateliers.json', kind: 'content', seed: true },
    { name: 'persons', fieldsFile: './schemas/persons.json', seed: true },
    { name: 'locations', fieldsFile: './schemas/locations.json', seed: true },
    { name: 'news', fieldsFile: './schemas/news.json', kind: 'content', seed: true },
    { name: 'downloads', fieldsFile: './schemas/downloads.json', seed: true },
    { name: 'assets', fieldsFile: './schemas/assets.json', kind: 'media' },
    { name: 'pages', fieldsFile: './schemas/pages.json', kind: 'content', hierarchy: { enabled: true, parentField: 'parentId', orderField: 'order', pathField: 'path', depthField: 'depth' } }
  ],

  targets: [
    { layer: 'content', collections: ['categories', 'ateliers', 'persons', 'locations', 'news', 'downloads'] },
    { layer: 'crouton', collections: ['assets'] },
    { layer: 'pages', collections: ['pages'] }
  ],

  dialect: 'sqlite'
}
