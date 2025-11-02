# Task: FR4/FR5 - Policy Management and Resolution Engine

## Meta Information

- **Task ID**: TASK-0004
- **Title**: FR4/FR5 - Policy Management and Resolution Engine
- **Status**: Not Started
- **Priority**: P0
- **Created**: 2025-11-02
- **Updated**: 2025-11-02
- **Estimated Effort**: 4-6 days
- **Actual Effort**: TBD

## Related Documents

- **PRD**: ../product/prd-main.md
- **ADR**: ../technical/decisions/0001-use-t3-stack.md
- **Dependencies**: TASK-0003

## Description

Implement policy management for reimbursement rules and a policy resolution engine that determines the applicable policy for a user/category, including precedence (user-specific > organization-wide). Provide a policy debugging tool for transparency.

## Acceptance Criteria

- [ ] Prisma models: Policy (orgId, categoryId?, userId?, maxAmount, period, reviewMode)
- [ ] Precedence rules implemented and covered by tests
- [ ] tRPC procedures: create/update/delete/list policies (Admin-only)
- [ ] Policy resolution function with clear inputs/outputs
- [ ] Policy debugging endpoint/UI that explains resolution path
- [ ] Tests covering edge cases (multiple applicable, missing category, user in multiple orgs)

## TODOs

- [ ] Migrations for Policy and related indexes
- [ ] Business logic module for resolution with Zod types
- [ ] tRPC router for policies and resolution debug
- [ ] UI: policies management screens + debug view
- [ ] Unit/integration tests with transactional DB

## Progress Updates

### 2025-11-02 - Plan
**Status**: Not Started
**Progress**: Task structured
**Blockers**: None
**Next Steps**: Finalize data model and write migrations

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review completed

## Notes

Period can be simple enum: PER_EXPENSE for MVP. ReviewMode: AUTO_APPROVE | MANUAL_REVIEW.
