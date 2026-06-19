export default {
  // No optional crouton packages beyond the core bundle (auth + admin + i18n).
  // Collections (books, authors, genres, borrowings) will be added by subsequent
  // sub-issues once the scaffold is in place.
  features: {},

  // Library catalog collections — to be generated via the crouton CLI (`crouton config`).
  collections: [],

  targets: [],

  dialect: 'sqlite'
}
