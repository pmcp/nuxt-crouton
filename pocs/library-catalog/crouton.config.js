export default {
  // Feature flags - which crouton packages to enable
  features: {
    editor: true,
    assets: true
  },

  // Collections generated from approved schema sign-off (#441)
  collections: [
    { name: 'books', fieldsFile: './schemas/books.json' },
    { name: 'authors', fieldsFile: './schemas/authors.json' },
    { name: 'genres', fieldsFile: './schemas/genres.json' },
    { name: 'loans', fieldsFile: './schemas/loans.json' },
  ],

  targets: [
    { layer: 'library-catalog', collections: ['books', 'authors', 'genres', 'loans'] }
  ],

  dialect: 'sqlite'
}
