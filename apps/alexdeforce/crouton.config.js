export default {
  features: {
    pages: true
  },

  collections: [
    { name: 'articles', fieldsFile: './schemas/articles.json' },
    { name: 'tags', fieldsFile: './schemas/tag.json' },
    { name: 'agenda', fieldsFile: './schemas/agenda.json' },
    { name: 'pages', fieldsFile: './schemas/pages.json', formComponent: 'CroutonPagesForm', hierarchy: { enabled: true, parentField: 'parentId', orderField: 'order', pathField: 'path', depthField: 'depth' } }
  ],

  targets: [
    { layer: 'content', collections: ['articles', 'agenda', 'tags'] },
    { layer: 'pages', collections: ['pages'] }
  ],

  dialect: 'sqlite'
}
