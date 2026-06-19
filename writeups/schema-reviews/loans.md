### Schema review — `loans`

6 fields · 1 relationship

| Field | Type | Required | Translatable | Default | → References |
|---|---|:--:|:--:|---|---|
| `id` 🔑 | string |  |  |  |  |
| `bookId` | string | ✓ |  |  | `books` |
| `borrowerName` | string | ✓ |  |  |  |
| `borrowedAt` | date | ✓ |  |  |  |
| `dueAt` | date | ✓ |  |  |  |
| `returnedAt` | date |  |  |  |  |

**Relationships:** `loans.bookId` → `books`
