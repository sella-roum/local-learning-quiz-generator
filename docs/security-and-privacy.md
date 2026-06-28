# Security and Privacy

## Data Storage

### Local (IndexedDB)

The following data is stored exclusively in the browser's IndexedDB and is never sent to any server:

- Uploaded file contents (as Blobs)
- Generated quizzes
- Quiz play results and session history
- Application preferences

### Environment (Server-side)

The following data exists only in environment variables on the server:

- `GEMINI_API_KEY` — API key for Google Gemini
- `FRONTEND_URL` — CORS origin configuration
- Model configuration options

## External Data Transmission

### Google Gemini API

File contents are sent to Google Gemini API for:

1. **Keyword and summary extraction** (`/api/extract-keywords-summary`)
2. **Quiz generation** (`/api/generate-quiz`)

Data sent includes:

- File content (text, base64-encoded PDF/image data)
- File type and metadata
- Extracted keywords and summary (for quiz generation)

**What is NOT sent:**

- Quiz play results
- Session history
- User preferences

### Jina Reader

When a user inputs a URL for content fetching:

- The URL is sent to `r.jina.ai`
- The fetched page content is returned and stored locally

### PDF Processing

PDF files are sent directly to the Gemini API as `application/pdf` inlineData. No local PDF text extraction is performed. This means:

- PDF contents are always sent to an external API
- Users should not upload confidential PDFs

## API Key Handling

- `GEMINI_API_KEY` is set in `.env.local` (or server environment)
- It is never exposed to the client-side code
- It is never logged
- It is never committed to the repository

## Production Logging Policy

In production (`NODE_ENV === "production"`):

- **DO NOT log**: Full AI responses, file contents, generated quiz content
- **OK to log**: Error types, HTTP status codes, model names, input types
- Error messages should be descriptive enough for debugging but should not contain sensitive data

See `AGENTS.md` for the full logging policy.

## CORS Configuration

- Allowed origins are controlled by the `FRONTEND_URL` environment variable
- `ACCESS_CONTROL_ALLOW_ORIGIN` is kept for backward compatibility
- `FRONTEND_URL` takes precedence when both are set
- No wildcard CORS is used in production

## Security Checklist

- [x] No secrets committed to repository
- [x] `.env.local` is in `.gitignore`
- [x] `.env.example` contains only placeholder values
- [x] API keys are server-side only
- [x] File upload size limits enforced
- [x] Path traversal protection on document routes
- [x] CORS restricted to configured origins
- [x] Production logging avoids sensitive content
- [x] External API usage is documented in UI
- [x] PDF direct-send policy is documented
