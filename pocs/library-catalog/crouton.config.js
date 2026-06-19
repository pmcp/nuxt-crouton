export default {
  layer: 'library-catalog',
  features: ['auth', 'editor', 'assets'],
  locales: ['en'],
  dialect: 'sqlite',

  collections: [
    { name: 'authors', fieldsFile: './schemas/authors.json' },
    { name: 'genres', fieldsFile: './schemas/genres.json' },
    { name: 'books', fieldsFile: './schemas/books.json' },
    { name: 'loans', fieldsFile: './schemas/loans.json' }
  ],

  targets: [
    { layer: 'library-catalog', collections: ['authors', 'genres', 'books', 'loans'] }
  ]
}
