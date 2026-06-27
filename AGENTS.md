# Local Learning Quiz Generator — AI Agent Instructions

## Repository Purpose

A web application that automatically creates 4-choice quizzes from local text, image, and PDF files using Google Gemini AI. Quizzes are stored in IndexedDB in the browser.

## Plans to Read Before Starting Work

- `docs/plans/2026-06-27_opencode-environment-setup-plan.md`
- `docs/plans/2026-06-25_improvement-tasks.md`
- `docs/plans/2026-06-25_priority-implementation-steps.md`
- `docs/plans/2026-06-25_review-feedback-adjustments.md`
- `README.md`
- `package.json`
- `tsconfig.json`

When `docs/plans/2026-06-25_review-feedback-adjustments.md` contradicts other plans, the adjustments file takes precedence.

## Task Priority

- P0: Build failure, data corruption, security risk — fix first
- P1: Essential for practical use and continued development
- P2: Maintainability, quality, operability improvements
- P3: UX, learning experience, extensibility

Priority order for initial tasks:
1. TASK-001: React/React DOM/type definition version inconsistency
2. TASK-002: `GenerateQuiz.options` type fix
3. TASK-016: AI response validation enhancement
4. TASK-003: `/api/document` path traversal prevention
5. TASK-004: Quality gates and npm scripts setup
6. TASK-005: Production log suppression
7. TASK-006: PDF processing unification

## Prohibited Actions

- Do not perform UI overhauls unrelated to the highest-priority task.
- Do not significantly change the quiz generation prompt.
- Do not revive PDF.js-based local PDF extraction.
- Do not increase `any` or type assertions as a workaround for type errors.
- Do not lower type safety by modifying `skipLibCheck`, `strict`, or similar settings.
- Even if `skipLibCheck: true` exists in `tsconfig.json`, do not change it in this PR to work around type errors.
- Do not commit `.env.local`, API keys, or secrets.
- Do not add new `ACCESS_CONTROL_ALLOW_ORIGIN` references.
- CORS allowed origins should use `FRONTEND_URL`.
- Do not output full AI responses, file contents, or generated quiz content in production logs.

## Scope Restrictions

- Keep changes within the scope of the active task/PR.
- If the active plan limits work to environment/tooling setup, do not mix in unrelated application-level fixes.
- Record deferred follow-ups in the PR body or the active plan instead of expanding scope here.

## Verification Commands After Implementation

```bash
npm ci
npm run check
```

If `npm run check` fails, run individually:
```bash
npm run typecheck
npm run lint
npm run build
```

Use `npm ci` for standard verification. Use `npm install` only when changing dependencies (lockfile update required).

## PR Body Template

```markdown
## Summary

- List of changes made

## Scope

What this PR covers and what it explicitly does not cover.

## Verification

- [ ] npm ci
- [ ] npm run check
- [ ] npm run typecheck (if check failed)
- [ ] npm run lint (if check failed)
- [ ] npm run build (if check failed)
- [ ] opencode debug config (if OpenCode CLI available)

## Notes

- Any skipped verifications with reasons
- OpenCode CLI availability
- Unresolved issues
```

## Secrets Handling

- Never commit `.env.local`, API keys, or any secrets.
- `.env.example` is safe to commit and should not contain real keys.
- The `.env` file (without suffix) contains a real API key and must NOT be committed.

## PDF / External AI API Sending

- PDF files are sent directly to the Gemini API as `inlineData` (base64-encoded `application/pdf`).
- PDF.js-based local text extraction must not be revived.
- The UI and README must clearly state that files are sent to external AI APIs.
- Maximum PDF file size: 14MB (post-base64 fits within Gemini's 20MB inline limit).

## CORS Policy

- Allowed origins use `FRONTEND_URL` environment variable.
- Do not add `ACCESS_CONTROL_ALLOW_ORIGIN`.
- Do not add new CORS-related environment variables.

## Production Log Suppression

- Do not output full AI responses, file contents, or generated quiz text in production logs.
- In production (`NODE_ENV === "production"`), limit logs to error types, HTTP status codes, model names, and input types.
- Do not suppress error messages to the point where debugging becomes impossible.
