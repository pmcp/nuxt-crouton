### Schema review — `books`

9 fields · 2 relationships

| Field | Type | Required | Translatable | Default | → References |
|---|---|:--:|:--:|---|---|
| `title` | string | ✓ |  |  |  |
| `isbn` ·uniq | string |  |  |  |  |
| `publishedYear` | number |  |  |  |  |
| `coverImage` | image |  |  |  |  |
| `description` | text |  |  |  |  |
| `authorId` | string | ✓ |  |  | `authors` |
| `genreId` | string |  |  |  | `genres` |
| `copiesTotal` | number |  |  | `1` |  |
| `copiesAvailable` | number |  |  | `1` |  |

**Relationships:** `books.authorId` → `authors` · `books.genreId` → `genres`
