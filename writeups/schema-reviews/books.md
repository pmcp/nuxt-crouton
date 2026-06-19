### Schema review — `books`

10 fields · 2 relationships

| Field | Type | Required | Translatable | Default | → References |
|---|---|:--:|:--:|---|---|
| `id` 🔑 | uuid |  |  |  |  |
| `title` | string | ✓ |  |  |  |
| `isbn` ·uniq | string |  |  |  |  |
| `publishedYear` | number |  |  |  |  |
| `coverImage` | image |  |  |  |  |
| `description` | text |  |  |  |  |
| `authorId` | uuid |  |  |  | `authors` |
| `genreId` | uuid |  |  |  | `genres` |
| `copiesTotal` | number |  |  | `1` |  |
| `copiesAvailable` | number |  |  | `1` |  |

**Relationships:** `books.authorId` → `authors` · `books.genreId` → `genres`
