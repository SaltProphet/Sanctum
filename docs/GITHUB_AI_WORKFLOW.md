# GitHub AI Workflow: Role-Based Rules You Can Swap Quickly

This document describes a practical setup for running multiple AI coding agents (including GitHub Copilot) with predictable behavior in this repository.

## 1) Core concept: separate **global repo rules** from **task-specific modes**

Use two layers:

1. **Stable repo guardrails** (always on)
   - Put these in `.github/copilot-instructions.md`.
   - Keep this short and durable: architecture constraints, security rules, testing expectations.

2. **Task mode prompts** (swap on demand)
   - Keep lightweight templates in `docs/prompts/` (optional) and paste/select as needed in your AI tool.
   - Example modes:
     - `feature-builder`
     - `bug-fixer`
     - `refactor-safe`
     - `release-hardening`

This gives you “swap-on-the-fly” behavior without constantly editing your core rules.

## 2) Recommended repository-level Copilot setup

### A. Keep `.github/copilot-instructions.md` as your source of truth
Put only high-signal rules there:
- Tech stack + architectural defaults
- Security requirements
- Testing commands
- PR expectations

Avoid long policy documents; short, strict, and explicit performs better.

### B. Use branch naming to signal intent
Use branches like:
- `feat/...` (new functionality)
- `fix/...` (bug fix)
- `refactor/...` (no behavior change)
- `chore/...` (maintenance)

Then mirror that intent in your prompt mode selection.

### C. Use PR templates/checklists to enforce outcomes
Even if AI writes code, humans approve output quality.
Add a PR checklist (manually or via template) with:
- [ ] Scope is limited to requested task
- [ ] Tests added/updated
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] No secrets or unsafe shortcuts

## 3) Suggested mode templates (copy/paste)

### Feature Builder Mode
> Implement the requested feature with minimal surface area changes. Reuse existing patterns in `app/` and `lib/`. Add tests for new behavior. Do not refactor unrelated code.

### Bug Fix Mode
> Identify the smallest root-cause fix. Add regression coverage. Avoid changing interfaces unless required. Keep the patch narrowly scoped.

### Refactor-Safe Mode
> Refactor for readability/maintainability with no behavior changes. Preserve API contracts. Add tests only when needed to prove parity.

### Release Hardening Mode
> Prioritize correctness and safety. Validate edge cases and error handling. Ensure `npm test` and `npm run build` pass. Flag risk areas explicitly.

## 4) Practical “optimal setup” for this project

1. Keep `.github/copilot-instructions.md` short and enforceable.
2. Use a small set of reusable mode prompts from this doc.
3. Require PR checklist completion before merge.
4. Use CI to run:
   - `npm test`
   - `npm run build`
5. Resolve conflicts from trusted update branches using a deliberate default (incoming changes) but still run checks after conflict resolution.

## 5) Conflict-heavy AI workflow (fast but safer)

If you frequently merge AI branches and accept incoming conflict hunks:

1. Resolve conflicts with your default policy.
2. Immediately run validation checks.
3. If checks fail, fix forward in a follow-up commit instead of force-merging broken state.

That keeps your high-speed workflow while preventing silent breakage.

## 6) Governance tips for multi-agent teams

- Assign each agent a narrow scope (API, UI, tests, docs) per branch.
- Merge smaller PRs more often.
- Prefer deterministic tasks for automation; reserve architecture decisions for humans.
- Track recurring AI mistakes and encode them into `.github/copilot-instructions.md` as explicit “do/don’t” rules.
