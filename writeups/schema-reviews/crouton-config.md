### crouton.config.js — library-catalog

**Layer:** `library-catalog`
**Dialect:** `sqlite`
**Locales:** `['en']`
**Features:** `['auth', 'editor', 'assets']`

#### Collections

| Collection | Fields file | Description |
|---|---|---|
| `books` | `schemas/books.json` | Book records with author/genre relations and copy counts |
| `authors` | `schemas/authors.json` | Author records |
| `genres` | `schemas/genres.json` | Genre taxonomy |
| `loans` | `schemas/loans.json` | Loan records tracking who borrowed what and when |

#### Config rationale

- `editor` feature: `books.description` uses rich text (`EditorSimple`) — requires `crouton-editor`
- `assets` feature: `books.coverImage` is an image field — requires `crouton-assets`
- `auth` feature: auth-gated app — required for the deploy target login flow
- `dialect: sqlite`: local dev + Cloudflare D1 at deploy via NuxtHub
- Single locale `en`: no i18n needed for this POC

#### Proposed crouton.config.js

```js
export default {
  layer: 'library-catalog',
  dialect: 'sqlite',
  locales: ['en'],
  features: ['auth', 'editor', 'assets'],
  collections: [
    { name: 'books',   fieldsFile: 'schemas/books.json' },
    { name: 'authors', fieldsFile: 'schemas/authors.json' },
    { name: 'genres',  fieldsFile: 'schemas/genres.json' },
    { name: 'loans',   fieldsFile: 'schemas/loans.json' },
  ],
}
```
