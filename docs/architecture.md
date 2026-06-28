# Architecture

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: IndexedDB via Dexie.js
- **AI**: Google Gemini API (`@google/genai`)
- **UI**: Tailwind CSS + shadcn/ui components
- **Animation**: Framer Motion
- **Charts**: Recharts

## Directory Structure

```text
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # API route handlers
│   │   ├── extract-keywords-summary/route.ts
│   │   ├── generate-quiz/route.ts
│   │   ├── fetch-url/route.ts
│   │   └── document/route.ts
│   ├── files/page.tsx      # File management page
│   ├── quizzes/            # Quiz management pages
│   │   ├── page.tsx        # Quiz list
│   │   ├── create/page.tsx # Single-file quiz creation
│   │   ├── create-multi/page.tsx # Multi-file quiz creation
│   │   └── [id]/edit/page.tsx # Quiz editing
│   ├── play/               # Quiz play pages
│   │   ├── page.tsx        # Session setup
│   │   ├── session/page.tsx # Active quiz session
│   │   └── history/page.tsx # Play history
│   ├── results/page.tsx    # Session results
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui base components
│   └── ...                 # Application-specific components
├── lib/                    # Core utilities and business logic
│   ├── db.ts               # Dexie database class and types
│   ├── api-utils.ts        # Gemini API client helpers
│   ├── quiz-normalizer.ts  # AI response normalization
│   ├── quiz-quality.ts     # Quiz quality checks
│   ├── quiz-generation.ts  # Quiz count distribution helpers
│   ├── quiz-export-import.ts # Export/import logic
│   ├── quiz-save.ts        # Save preparation helpers
│   ├── session-integrity.ts # Session integrity checks
│   ├── storage-usage.ts    # Storage usage tracking
│   ├── utils.ts            # General utilities (date, formatting)
│   ├── limits.ts           # Input size limits validation
│   └── ...                 # Other helpers
```

## Data Flow

### File Upload → Quiz Generation

```text
User Uploads File
       ↓
File saved to IndexedDB (files store)
       ↓
Extract keywords + summary (Gemini API via /api/extract-keywords-summary)
       ↓
Keywords + summary saved to file record
       ↓
User configures quiz options (count, difficulty, category)
       ↓
Generate quizzes (Gemini API via /api/generate-quiz)
       ↓
Normalize AI response (quiz-normalizer.ts)
       ↓
Quality check (quiz-quality.ts)
       ↓
User reviews and confirms
       ↓
Save to IndexedDB (quizzes store)
```

### Quiz Play → Results

```text
User selects category / count / time limit
       ↓
Session created (sessions store)
       ↓
Quiz questions presented one by one
       ↓
Each answer saved as a Result record (results store)
       ↓
Session completed → endedAt set
       ↓
Results page shows summary with per-question feedback
       ↓
History page aggregates past sessions for stats
```

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/generate-quiz` | POST | Generate quizzes from file content via Gemini |
| `/api/extract-keywords-summary` | POST | Extract keywords/summary from file content via Gemini |
| `/api/fetch-url` | POST | Fetch and process URL content via Jina Reader |
| `/api/document/[id]` | GET | Serve stored file content (for display/download) |

## Gemini API Integration

The application uses the `@google/genai` library to communicate with the Gemini API.

Key responsibilities of `src/lib/api-utils.ts`:

1. **File-to-payload conversion**: Converts files to base64 `inlineData` for PDF/image, or plain text for text files.
2. **Payload size validation**: Checks file/content size limits before sending.
3. **API error handling**: Maps HTTP errors to user-friendly messages.
4. **Response normalization**: Wraps AI responses through `normalizeGeneratedQuizzes` before returning.

## CORS

The application configures CORS for API routes using the `FRONTEND_URL` environment variable. See `docs/security-and-privacy.md` for details.

## Jina Reader

URL content fetching uses the Jina Reader API (`r.jina.ai`). The URL and page content are sent to this external service. See privacy notice in the UI.
