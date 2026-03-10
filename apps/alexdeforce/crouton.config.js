export default {
  features: {
    pages: true
  },

  collections: [
    { name: 'articles', fieldsFile: './schemas/articles.json', kind: 'content', seed: true },
    { name: 'tags', fieldsFile: './schemas/tag.json', seed: true },
    { name: 'categories', fieldsFile: './schemas/category.json', seed: true },
    { name: 'agenda', fieldsFile: './schemas/agenda.json', kind: 'content', seed: true },
    { name: 'assets', fieldsFile: './schemas/assets.json', kind: 'media' },
    { name: 'pages', fieldsFile: './schemas/pages.json', kind: 'content', hierarchy: { enabled: true, parentField: 'parentId', orderField: 'order', pathField: 'path', depthField: 'depth' } }
  ],

  targets: [
    { layer: 'content', collections: ['articles', 'agenda', 'tags', 'categories'] },
    { layer: 'crouton', collections: ['assets'] },
    { layer: 'pages', collections: ['pages'] }
  ],

  dialect: 'sqlite'
}
