# Task: Foundation and Architecture Setup (Simplified)

## Meta Information

- **Task ID**: TASK-0001
- **Title**: Foundation and Architecture Setup
- **Status**: Not Started
- **Priority**: P0
- **Created**: 2025-11-02
- **Updated**: 2025-11-02
- **Estimated Effort**: 0.5-1 day
- **Actual Effort**: TBD

## Related Documents

- **PRD**: ../product/prd-main.md
- **ADR**: ../technical/decisions/0001-use-t3-stack.md
- **Dependencies**: None

## Description

Simplified foundation scope to unblock organization and policy work:
- Ensure baseline scripts run locally (dev, build, start, lint, typecheck, test)
- Add minimal architecture notes focused on multi-tenancy (per-request orgId), module boundaries, and placeholders for logging
- Create minimal placeholder routes for /orgs, /policies, /expenses, /reviews

## Acceptance Criteria

- [ ] Scripts: lint, typecheck, test run locally and succeed
- [ ] docs/technical/architecture.md updated with:
  - [ ] Multi-tenancy approach (per-request orgId, enforced in tRPC procedures)
  - [ ] Module boundaries (Auth, Orgs, Policies, Expenses, Reviews)
  - [ ] Logging placeholders: policy resolution and expense state transitions
- [ ] Placeholder routes/pages exist and render: /orgs, /policies, /expenses, /reviews

## TODOs

- [ ] Verify/add scripts in package.json: lint, typecheck, test
- [ ] Update docs/technical/architecture.md with per-request orgId approach and module boundaries
- [ ] Add placeholder routes/pages: /orgs, /policies, /expenses, /reviews
- [ ] Note logging placeholders for policy resolution and expense state changes

## Progress Updates

### 2025-11-02 - Plan
**Status**: Not Started
**Progress**: Task simplified to focus on scripts, minimal architecture notes (per-request orgId), and placeholder routes
**Blockers**: None
**Next Steps**: Update architecture.md and add placeholder routes

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review completed

## Notes

This task is preparatory and unblocks downstream feature delivery.
