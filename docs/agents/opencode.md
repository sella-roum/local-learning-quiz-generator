# OpenCode Agent Guide for Local Learning Quiz Generator

## Work Start Procedure

1. Read the relevant plan files listed in `AGENTS.md`.
2. Identify the target TASK number.
3. Confirm target files and out-of-scope items.
4. Briefly organize the implementation approach before making changes.
5. Implement with minimal diff.
6. Use `npm ci` for standard verification.
7. Only tasks that change dependencies should use `npm install` to update the lockfile.
8. Use `npm ci && npm run check` for local verification.
9. If `npm run check` fails, run `npm run typecheck`, `npm run lint`, and `npm run build` individually to isolate the cause.
10. Check security and privacy perspectives.
11. Write the PR body with implementation details, verification results, and any deferred items.

## Task Selection Procedure

- Read the task definition from `docs/plans/2026-06-25_improvement-tasks.md`.
- Read the detailed implementation steps from `docs/plans/2026-06-25_priority-implementation-steps.md`.
- Check `docs/plans/2026-06-25_review-feedback-adjustments.md` for any corrections that take precedence.
- Confirm the task's priority and dependencies on other tasks.

## Pre-Implementation Checks

- Is the task within the scope defined for the current PR?
- Are there any prohibited changes (UI overhaul, prompt changes, PDF.js revival, type safety reduction)?
- Are target files correctly identified?
- Do any changes affect multiple files? Is the scope manageable?

## Post-Implementation Checks

- Run `npm ci && npm run check`.
- If `npm run check` fails, run individual checks to isolate.
- Verify that no unintended files were modified (check with `git diff --stat`).
- Verify that no secrets were committed.
- Verify that the diff does not include any prohibited changes.

## Review Perspectives

- Does the implementation follow the plan?
- Are all target files covered?
- Are any out-of-scope changes included?
- Do the changes maintain or improve type safety?
- Are there any security concerns?
- Are error messages user-friendly?

## Security and Privacy Perspectives

- Are there any path traversal vulnerabilities?
- Is CORS correctly configured with `FRONTEND_URL`?
- Are production logs free of sensitive content (AI responses, file contents, generated quiz text)?
- Are API keys and secrets properly handled?
- Are external API calls clearly communicated to the user?

## PR Creation Template

```markdown
## Summary

- List the key changes

## Scope

- What is covered and what is deferred

## Verification

- [ ] npm ci
- [ ] npm run check
- ...etc

## Notes

- Any additional context
```
