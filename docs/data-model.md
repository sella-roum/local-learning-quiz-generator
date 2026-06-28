# Data Model

## IndexedDB Stores

The application uses IndexedDB via Dexie.js with the following stores:

### `files`

Stores uploaded file metadata and content.

| Field | Type | Description |
|---|---|---|
| `id` | `number` (auto-increment) | Primary key |
| `name` | `string` | Original file name |
| `type` | `string` | MIME type (e.g. `application/pdf`) |
| `size` | `number` | File size in bytes |
| `blob` | `Blob` | File binary data |
| `extractedText` | `string?` | Extracted text content (text files only) |
| `keywords` | `string[]` | AI-extracted keywords |
| `summary` | `string?` | AI-generated summary |
| `structure` | `string?` | AI-extracted document structure |
| `uploadedAt` | `Date` | Upload timestamp |

### `quizzes`

Stores generated 4-choice quizzes.

| Field | Type | Description |
|---|---|---|
| `id` | `number` (auto-increment) | Primary key |
| `fileId` | `number?` | Optional reference to source file |
| `category` | `string` | Quiz category |
| `question` | `string` | Question text |
| `options` | `string[]` | Four answer choices |
| `correctOptionIndex` | `number` | Index of correct option (0-3) |
| `explanation` | `string?` | Explanation for the correct answer |
| `createdAt` | `Date` | Creation timestamp |
| `updatedAt` | `Date` | Last update timestamp |

### `results`

Stores individual answer results for quiz sessions.

| Field | Type | Description |
|---|---|---|
| `id` | `number` (auto-increment) | Primary key |
| `quizId` | `number` | Reference to quiz |
| `selectedOptionIndex` | `number` | User's selected answer |
| `isCorrect` | `boolean` | Whether the answer was correct |
| `answeredAt` | `Date` | Answer timestamp |
| `sessionId` | `string?` | Reference to session |

### `sessions`

Stores quiz play session metadata.

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Primary key |
| `startedAt` | `Date` | Session start timestamp |
| `endedAt` | `Date?` | Session end timestamp (absent if incomplete) |
| `quizIds` | `number[]` | Array of quiz IDs in the session |
| `category` | `string?` | Session category filter |
| `score` | `number?` | Computed score (may be derived from results) |
| `totalQuestions` | `number?` | Expected number of questions |

## Date Handling Policy

IndexedDB natively supports `Date` objects. The application stores dates as `Date` instances inside IndexedDB.

### Export (JSON)

When exporting quizzes to JSON, dates are serialized as ISO strings:

```ts
exportedAt: new Date().toISOString()
```

Import/export does not include `createdAt`/`updatedAt` from the original quizzes; imported quizzes get fresh timestamps.

### Import

When importing from JSON, new `Date` objects are created:

```ts
createdAt: new Date(),
updatedAt: new Date(),
```

### Display

The `formatDate` helper in `src/lib/utils.ts` handles date formatting for display. It uses `Intl.DateTimeFormat` with Japanese locale.

### Helper Functions

- `toDateOrNull(value)` — Converts Date, ISO string, or number to a Date object. Returns null for invalid input.
- `toIsoStringOrNull(value)` — Converts a value to ISO string or null.

These helpers should be used whenever processing date values from external sources or user input.

## File Deletion Policy

When a file is deleted from IndexedDB:

- **The associated quizzes are NOT deleted.**
- Quizzes with a `fileId` pointing to a deleted file will show "元ファイル削除済み" (original file deleted) in the quizzes list.
- This policy prevents accidental data loss — users can still study quizzes created from deleted files.

## DB Migration Policy

### Schema Versions

- **v1**: Initial database with basic stores.
- **v2 (current)**: Files, quizzes, results, and sessions stores with current field set.

### Rules

1. **Never mutate existing user data** without an explicit migration plan and version bump.
2. **Prefer adding optional fields** over destructive schema changes.
3. **Document each version change** in `src/lib/db.ts` with rationale.
4. **Legacy data repair** (e.g., fixing corrupted `options` or `correctOptionIndex`) must be implemented as a separate, explicitly tested task.
5. **New required fields** should be avoided; use defaults in application code instead.

## Session Integrity Policy

### Session States

- **Completed session**: Has `endedAt` timestamp set.
- **Incomplete session**: Missing `endedAt` (user abandoned before finishing).
- **Integrity mismatch**: `totalQuestions` does not match actual result count for the session.

### Handling

- `cleanupEmptySessions()` removes sessions with no results and no `endedAt`.
- `getSessionIntegrity()` returns the integrity status of a session.
- The history page (`/play/history`) filters to show only completed sessions with results.
- The results page (`/results`) shows a warning if there is an integrity mismatch.
- Stats calculation excludes incomplete sessions.
