# 01 — Green test suite

**Goal:** `bun test` at repo root passes 145/145. Four tests fail today on a clean
tree (verified 2026-07-12, commit `b895eec`).

## Context — read first
- `packages/core/tests/decorators.test.ts` (2 failures)
- `packages/core/src/` — find the shared decorator implementation that backs
  `UseFilters` / `listAppliedFilters` (grep for `listAppliedFilters`)
- `packages/microservices/tests/decorators.test.ts` (1 failure)
- `packages/auth/tests/options.test.ts` (1 failure) and the `normalizeModuleOptions`
  implementation in `packages/auth/src/`

## Failures

1. **`Shared Decorators > deduplicates filters while preserving order`**
   (`core/tests/decorators.test.ts:68`) — expects `@UseFilters(FilterB, FilterA)`
   to yield `[FilterB, FilterA]`; implementation loses or reorders one.
2. **`Shared Decorators > prioritizes handler filters ahead of controller filters`**
   (`core/tests/decorators.test.ts:79`) — expects `['MethodFilter',
   'ControllerFilter']`; actual output is missing `'MethodFilter'` first (received
   array starts with `ControllerFilter`).
3. **`Message Pattern Decorators > captures guard/interceptor/pipe/filter metadata
   for handlers`** (`microservices/tests/decorators.test.ts:68`) — metadata listing
   for handlers doesn't match; likely the same ordering root cause as 1–2 since
   microservices re-exports the shared decorators.
4. **`normalizeModuleOptions > maps legacy adapter into the database option`**
   (`auth/tests/options.test.ts:61`) — legacy `adapter` input isn't mapped into
   `database`.

## Approach

For each failure decide **which side is wrong**:
- Check git history of the implementation and the test
  (`git log -p -- <file>`) to see which changed last and what the intended
  contract was.
- Filter ordering contract to enforce (matches NestJS semantics and the docs-site
  exception-filters page — verify against
  `docs-site/src/app/docs/exception-filters/page.mdx`): **method-level filters run
  before controller-level filters; within a level, declaration order is preserved;
  duplicates keep first occurrence.**
- For the auth failure: if `adapter` is a documented legacy alias (check
  `packages/auth/README.md` and docs-site auth pages), implement the mapping in
  `normalizeModuleOptions`; if it was intentionally dropped, update the test AND
  add a deprecation note to the README.

## Acceptance criteria
- `bun test` passes with 0 failures at repo root.
- No test deleted. A test's expectation may change only with a comment in the PR
  description (not code comments) explaining why the contract changed.
- If implementation changed: the fix is in the shared decorator logic used by both
  core and microservices (one root fix, not two patches).
