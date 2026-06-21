export default {
  features: {
    auth: true,
    editor: true,
    assets: true
  },

  collections: [
    { name: 'authors', fieldsFile: './schemas/authors.json' },
    { name: 'genres', fieldsFile: './schemas/genres.json' },
    { name: 'books', fieldsFile: './schemas/books.json', kind: 'content' },
    { name: 'loans', fieldsFile: './schemas/loans.json' }
  ],

  targets: [
    { layer: 'library-catalog', collections: ['authors', 'genres', 'books', 'loans'] }
  ],

  locales: ['en'],

  dialect: 'sqlite'
}
