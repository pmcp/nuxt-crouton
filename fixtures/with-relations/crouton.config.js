export default {
  // Feature flags - which crouton packages to enable
  features: {
  },

  // Two configured locales so the e2e harness keeps the i18n locale-switch check
  // available (same as `minimal`); the focus of this fixture is relations, not i18n.
  locales: ['en', 'nl'],
  defaultLocale: 'en',

  // Relations e2e fixture: two collections in one layer joined by a foreign key.
  // `books.authorId` (refTarget: authors) exercises the generator's relation
  // handling — FK column, multi-table migration, and the CroutonFormReferenceSelect
  // that loads options from the parent collection — none of which the single-`items`
  // fixtures touch (#224). The FK is left OPTIONAL so the text-field-only CRUD
  // harness can still create a book row.
  //
  // Names are deliberately neutral (`authors`/`books`, not `products`/`categories`):
  // the CLI's formComponent auto-detect scans ALL package contributions, so a
  // collection named `products` would wrongly adopt crouton-sales' `SalesProductForm`
  // even though crouton-sales isn't a dependency (see writeups report for #224).
  collections: [
    { name: 'authors', fieldsFile: './schemas/authors.json' },
    { name: 'books', fieldsFile: './schemas/books.json' }
  ],

  targets: [
    { layer: 'main', collections: ['authors', 'books'] }
  ],

  dialect: 'sqlite'
}
