# Local Learning Quiz Generator

[![Powered by Next.js](https://img.shields.io/badge/Powered%20by-Next.js-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Using TypeScript](https://img.shields.io/badge/Using-TypeScript-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Styled with Tailwind CSS](https://img.shields.io/badge/Styled%20with-Tailwind%20CSS-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Components by shadcn/ui](https://img.shields.io/badge/Components-shadcn/ui-black?style=flat)](https://ui.shadcn.com/)
[![AI by Google Gemini](https://img.shields.io/badge/AI%20by-Google%20Gemini-4285F4?style=flat&logo=google)](https://ai.google.dev/)

A web application that automatically creates 4-choice quizzes from local text, image, and PDF files using Google Gemini AI. Quizzes are stored in IndexedDB in the browser.

## Features

- **File upload**: Upload text (.txt), image (.jpg, .jpeg, .png), and PDF (.pdf) files
- **URL content fetching**: Fetch content from URLs using Jina Reader
- **AI content analysis**: Extract keywords, summaries, and structure via Google Gemini
- **AI quiz generation**: Generate 4-choice quizzes with configurable count, difficulty, and category
- **Single/multi file quiz creation**: Create quizzes from one file or multiple files at once
- **Quiz management**: View, search, filter, edit, and delete quizzes
- **Quiz play**: Timed quiz sessions with category selection
- **Learning history**: Session history with stats and per-question results
- **Import/Export**: Quiz data in JSON format
- **PWA support**: Offline quiz browsing and study (AI features require network)
- **Theme switching**: Light and dark mode

## Input Support

| Input Type | Supported | Notes |
|---|---|---|
| Text (.txt) | ✅ | Direct text content |
| PDF (.pdf) | ✅ | Sent directly to Gemini as `inlineData` — no local PDF.js extraction |
| Image (.jpg, .jpeg, .png) | ✅ | Sent as base64 to Gemini |
| URL | ✅ | Content fetched via Jina Reader, then processed as text |

## How It Works

1. **Upload files** or **fetch URL content** → stored in browser IndexedDB
2. **AI extracts** keywords, summary, and structure (Gemini API)
3. **You configure** quiz options (count, difficulty, category, prompt)
4. **AI generates** 4-choice quizzes (Gemini API)
5. **You review and edit** quizzes before saving
6. **Quiz data is saved** to IndexedDB
7. **You play quizzes** in timed sessions
8. **Results are tracked** with per-question feedback

## External Services

| Service | Purpose | Data Sent |
|---|---|---|
| Google Gemini API | Keyword extraction, summary, quiz generation | File contents, extracted metadata |
| Jina Reader (`r.jina.ai`) | URL content fetching | URL, page content |

### PDF Processing Policy

PDF files are **not** parsed locally. They are sent directly to the Gemini API as `application/pdf` inlineData. This means:
- PDF content always leaves your browser
- Do not upload confidential or sensitive PDFs
- Maximum PDF file size (upload limit): 14MB pre-base64 (post-base64 fits within Gemini's ~20MB per-request inline limit)
- The 14MB pre-base64 limit is enforced by the app UI; the Gemini API's inline data limit is approximately 20MB after base64 encoding

### File Deletion Policy

When a file is deleted from IndexedDB, quizzes that were generated from that file are **not** deleted. They remain available for study and are marked as "元ファイル削除済み" (original file deleted) in the quiz list.

## Data Storage

All data is stored locally in your browser's IndexedDB:
- Uploaded file contents (as Blobs)
- Generated quizzes
- Quiz play results and session history

No data is stored on external servers. The external APIs (Gemini, Jina Reader) process data in transit but do not retain it.

## Local Development

### Prerequisites

- Node.js 22 (recommended)
- A Google Gemini API key ([Google AI Studio](https://aistudio.google.com/app/apikey))

### Setup

```bash
# Clone the repository
git clone https://github.com/sella-roum/local-learning-quiz-generator.git
cd local-learning-quiz-generator

# Install dependencies
npm ci

# Set up environment variables
cp .env.example .env.local
# Then edit .env.local and set your GEMINI_API_KEY
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Gemini API key (set in `.env.local`) |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS allowed origin |
| `ACCESS_CONTROL_ALLOW_ORIGIN` | No | `http://localhost:3000` | Legacy CORS override (FRONTEND_URL takes precedence) |
| `GEMINI_PRIMARY_MODEL` | No | `gemini-2.0-flash` | Primary Gemini model |
| `GEMINI_FALLBACK_MODEL` | No | (empty) | Fallback model (built-in list used if empty) |
| `GEMINI_ENABLE_THINKING` | No | `false` | Enable thinking config |
| `GEMINI_THINKING_BUDGET` | No | `0` | Thinking budget (0 = disabled) |

### Commands

```bash
# Development server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Unit tests
npm run test:unit

# E2E tests (requires Playwright browsers: npx playwright install)
npm run test:e2e

# Full check (typecheck + lint + tests + build)
npm run check

# Production build
npm run build

# Production start
npm start
```

### PWA Limitations

The PWA works offline for browsing and studying existing quizzes, but AI-powered features (quiz generation, keyword extraction) require network access to the Gemini API.

## Project Architecture

See the following docs for detailed information:

- [Architecture](docs/architecture.md) — Directory structure, data flow, API routes
- [Data Model](docs/data-model.md) — IndexedDB schema, date handling, migration policy
- [Security and Privacy](docs/security-and-privacy.md) — Data storage, external transmission, logging
- [Maintenance](docs/maintenance.md) — Dependencies, CI/CD, testing

## Input Limits

| Input Type | Limit |
|---|---|---|
| Text content | 100,000 characters |
| URL content | 100,000 characters |
| PDF file | 14MB (pre-base64; app-enforced upload limit) |
| Image file | 10MB (pre-base64; app-enforced upload limit) |

These limits apply before data is sent to the Gemini API. They are separate from IndexedDB storage limits.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **UI**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [Dexie.js](https://dexie.org/)
- **AI**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
- **PWA**: [next-pwa](https://github.com/shadowwalker/next-pwa)

## License

MIT
