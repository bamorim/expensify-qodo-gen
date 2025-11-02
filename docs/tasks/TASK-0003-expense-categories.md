# Task: FR3 - Expense Categories

## Meta Information

- **Task ID**: TASK-0003
- **Title**: FR3 - Expense Categories
- **Status**: Not Started
- **Priority**: P0
- **Created**: 2025-11-02
- **Updated**: 2025-11-02
- **Estimated Effort**: 1-2 days
- **Actual Effort**: TBD

## Related Documents

- **PRD**: ../product/prd-main.md
- **ADR**: ../technical/decisions/0001-use-t3-stack.md
- **Dependencies**: TASK-0002

## Description

Implement organization-scoped Expense Categories with CRUD operations accessible to Admins. Categories have name and optional description.

## Acceptance Criteria

- [ ] Prisma model for Category (orgId, name, description?) with unique(orgId, name)
- [ ] Admin-only CRUD tRPC procedures with Zod validation
- [ ] UI to list/create/edit/delete categories scoped by org
- [ ] Tests for RBAC and constraints (unique per org)

## TODOs

- [ ] Migration for Category model and indexes
- [ ] tRPC router: categoryRouter with procedures
- [ ] UI: categories page with forms
- [ ] Tests: unit/integration for router

## Progress Updates

### 2025-11-02 - Plan
**Status**: Not Started
**Progress**: Task created
**Blockers**: None
**Next Steps**: Add model and router skeleton

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review completed

## Notes

Ensure org-scoped uniqueness and access control.
