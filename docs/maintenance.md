# Maintenance

## Dependency Updates

### Dependabot Configuration

The repository uses Dependabot for automated dependency updates.

**Grouping:**

- Production patch updates are grouped into a single PR
- Development minor/patch updates are grouped into a single PR
- Security updates are grouped separately for production and development

**Auto-merge Policy:**

- Auto-merge is enabled for patch and minor updates only
- Major updates require manual review and approval
- CI must pass before auto-merge
- A `DEPENDABOT_MERGE_TOKEN` secret is required for auto-merge workflow

### Manual Update Process

1. Check Dependabot PRs daily
2. Review changelog/breaking changes for major updates
3. Run `npm ci && npm run check` locally before approving
4. For major updates, create a dedicated branch and test thoroughly

### Version Policy

- **Patch updates** (`1.0.x → 1.0.y`): Auto-merge if CI passes
- **Minor updates** (`1.x.0 → 1.y.0`): Auto-merge if CI passes
- **Major updates** (`x.0.0 → y.0.0`): Manual review required
- **Security updates**: Prioritize and apply within 7 days

## CI/CD

### GitHub Actions Workflow

The CI workflow runs on every push and pull request:

1. `npm ci` — Clean install
2. `npm run typecheck` — TypeScript type checking
3. `npm run lint` — ESLint
4. `npm run test:unit` — Vitest unit/integration tests
5. `npm run build` — Next.js production build

E2E tests with Playwright run as a separate job (not part of the main `check` command).

### Pre-merge Checklist

- [ ] `npm ci` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test:unit` passes
- [ ] `npm run build` passes
- [ ] `npm run check` passes (includes all of the above)
- [ ] Manual testing completed for affected features
- [ ] Security/privacy impact reviewed

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `FRONTEND_URL` | No | CORS origin (default: `http://localhost:3000`) |
| `ACCESS_CONTROL_ALLOW_ORIGIN` | No | Backward-compatible CORS override |
| `GEMINI_PRIMARY_MODEL` | No | Primary Gemini model |
| `GEMINI_FALLBACK_MODEL` | No | Fallback model |
| `GEMINI_ENABLE_THINKING` | No | Enable thinking config |
| `GEMINI_THINKING_BUDGET` | No | Thinking budget value |

### Adding New Environment Variables

1. Add to `.env.example` with a placeholder
2. Add to the README table
3. Add to this file
4. Update validation logic if needed
5. Never commit real values

## Database

### Schema Changes

See `docs/data-model.md` for migration policy.

Key points:
- Prefer additive changes
- Document version history in `src/lib/db.ts`
- Test migrations with real data before deploying

### Backup

There is no automated backup for IndexedDB data. Users should use the export feature to create JSON backups of their quizzes.

## Testing

### Unit Tests

Run with: `npm run test:unit`

Located in `tests/unit/`. Test pure functions and business logic without external dependencies.

### API Tests

Run with: `npm run test:unit` (included in the same run)

Located in `tests/api/`. Test helper functions used in API routes without external API calls.

### E2E Tests

Run with: `npm run test:e2e`

Located in `tests/e2e/`. Requires Playwright browsers installed (`npx playwright install`).

E2E tests require a running development server (handled automatically by Playwright's webServer config).
