# Copilot Instructions for Sanctum

You are working in a Next.js 14 + TypeScript + Tailwind project.

## Primary guardrails
- Preserve existing behavior unless the task explicitly requires a change.
- Keep changes minimal and scoped to the requested task.
- Prefer server components; only use client components when state/effects/browser APIs are required.
- Follow existing dark UI conventions (`bg-black`, `bg-slate-800`, `border-slate-700`, white/slate text, neon-green accents).
- Do not introduce secrets or hardcoded credentials.

## Code quality rules
- Reuse existing utilities in `lib/` before adding new abstractions.
- Add or update tests when behavior changes.
- Keep API route logic explicit and defensive (validate inputs and fail with clear status codes).
- Avoid broad refactors in feature PRs.

## Testing and verification
Before completing work, run:
1. `npm test`
2. `npm run build`

If tests fail, propose the smallest fix and re-run impacted checks.

## Preferred workflow
- Create focused commits with clear messages.
- In pull requests, include:
  - What changed
  - Why it changed
  - Validation steps and results
