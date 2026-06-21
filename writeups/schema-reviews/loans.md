### Schema review — `loans`

5 fields · 1 relationship

| Field | Type | Required | Translatable | Default | → References |
|---|---|:--:|:--:|---|---|
| `bookId` | string | ✓ |  |  | `books` |
| `borrowerName` | string | ✓ |  |  |  |
| `borrowedAt` | date |  |  |  |  |
| `dueAt` | date |  |  |  |  |
| `returnedAt` | date |  |  |  |  |

**Relationships:** `loans.bookId` → `books`
