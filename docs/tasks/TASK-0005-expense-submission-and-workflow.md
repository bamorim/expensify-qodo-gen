# Task: FR6/FR7 - Expense Submission and Review Workflow

## Meta Information

- **Task ID**: TASK-0005
- **Title**: FR6/FR7 - Expense Submission and Review Workflow
- **Status**: Not Started
- **Priority**: P0
- **Created**: 2025-11-02
- **Updated**: 2025-11-02
- **Estimated Effort**: 5-7 days
- **Actual Effort**: TBD

## Related Documents

- **PRD**: ../product/prd-main.md
- **ADR**: ../technical/decisions/0001-use-t3-stack.md
- **Dependencies**: TASK-0004

## Description

Implement expense submission (date, amount, category, description) with automatic application of policy rules. Over-limit expenses auto-reject. Under-limit expenses auto-approve or route to manual review based on policy. Implement reviewer UI to view assigned expenses and approve/reject with optional comments. Track status transitions with audit trail.

## Acceptance Criteria

- [ ] Prisma models: Expense, ExpenseReview, ExpenseAudit (state changes)
- [ ] tRPC procedures: submit expense, list my expenses, reviewer queue, approve/reject
- [ ] Policy application integrated with resolution engine
- [ ] Auto-reject for over-limit; auto-approve per policy
- [ ] Status states: SUBMITTED -> APPROVED/REJECTED with timestamps
- [ ] UI: submission form, my expenses, reviewer queue with actions
- [ ] Tests for workflow transitions and audit logging

## TODOs

- [ ] Migrations for Expense, ExpenseReview, ExpenseAudit with indexes
- [ ] Business logic: state machine and side effects (audit entries)
- [ ] tRPC routers for expenses and reviews
- [ ] UI components and pages
- [ ] Integration tests for end-to-end submission to decision

## Progress Updates

### 2025-11-02 - Plan
**Status**: Not Started
**Progress**: Task created and linked to policies
**Blockers**: None
**Next Steps**: Define models and state machine

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review completed

## Notes

Reviewer assignment MVP can be simple: all admins of org can review.
