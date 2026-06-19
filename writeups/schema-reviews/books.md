### Schema review — `books`

10 fields · 2 relationships

| Field | Type | Required | Translatable | Default | → References |
|---|---|:--:|:--:|---|---|
| `id` 🔑 | string |  |  |  |  |
| `title` | string | ✓ |  |  |  |
| `isbn` ·uniq | string |  |  |  |  |
| `publishedYear` | number |  |  |  |  |
| `description` | text |  |  |  |  |
| `coverImage` | image |  |  |  |  |
| `authorId` | string | ✓ |  |  | `authors` |
| `genreId` | string |  |  |  | `genres` |
| `copiesTotal` | number | ✓ |  | `1` |  |
| `copiesAvailable` | number | ✓ |  | `1` |  |

**Relationships:** `books.authorId` → `authors` · `books.genreId` → `genres`
