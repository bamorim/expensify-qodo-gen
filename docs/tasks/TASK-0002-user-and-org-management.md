# Task: FR1/FR2 - User and Organization Management (MVP, Simplified)

## Meta Information

- **Task ID**: TASK-0002
- **Title**: FR1/FR2 - User and Organization Management (MVP)
- **Status**: Complete
- **Priority**: P0
- **Created**: 2025-11-02
- **Updated**: 2025-01-02
- **Estimated Effort**: 2-3 days
- **Actual Effort**: 1 day

## Related Documents

- **PRD**: ../product/prd-main.md
- **ADR**: ../technical/decisions/0001-use-t3-stack.md
- **Dependencies**: TASK-0001

## Description

Simplified MVP scope leveraging existing magic code auth. Implement organizations, invitations, and membership with per-request orgId, console-logged invite links, and support for multiple admins per organization. Enforce org-scoped isolation and RBAC via tRPC procedures.

## Acceptance Criteria

- [x] org.create: creator becomes ADMIN
- [x] invitation.create: ADMIN-only; persists PENDING invite with token and expiry; logs accept URL to console
- [x] invitation.accept: requires authenticated session; session.email matches invite email; creates MEMBER membership (idempotent) and marks ACCEPTED
- [x] membership.listByOrg: ADMIN-only; lists members and roles
- [x] Per-request orgId validated with RBAC in all procedures
- [x] Minimal UI: /orgs (list/create), /orgs/[id]/invitations (create/list), accept flow via token URL
- [x] Transactional tests for RBAC, isolation, invite lifecycle, and idempotent membership creation

## TODOs

- [x] Prisma schema: Organization, Membership(role enum), Invitation(token, status, expiresAt) with indexes and FKs; unique(orgId, userId); unique(token)
- [x] tRPC routers: org.create, org.list, invitation.invite, invitation.accept, invitation.listPending, membership.my, membership.list
- [x] Context helpers: requireMembership(), requireAdmin()
- [x] Dev mailer: console log accept URL and token
- [x] UI: /orgs (list/create), /orgs/[orgId]/invitations (create/list), accept page (token-based)
- [x] Tests: transactional tests for RBAC, invite lifecycle, and isolation
- [x] Migrations and minimal seed data

## Progress Updates

### 2025-01-02 - Task Complete
**Status**: Complete
**Progress**: 
- ✅ Prisma schema updated with Organization, Membership, Invitation models
- ✅ Database migration applied successfully
- ✅ tRPC routers implemented: org, membership, invitation
- ✅ RBAC helpers: requireMembership, requireAdmin
- ✅ Email service abstraction with dev logger
- ✅ Comprehensive test suite (23 tests passing)
- ✅ All tests use factory functions for isolation
- ✅ Lint and type checking passing
- ✅ UI implemented: /orgs page with list/create/invite/members
- ✅ UI implemented: /orgs/accept page for invitation acceptance

**Blockers**: None
**Next Steps**: Task complete. Ready for next task in backlog.

### 2025-01-02 - Backend Implementation Complete
**Status**: In Progress
**Progress**: 
- ✅ Prisma schema updated with Organization, Membership, Invitation models
- ✅ Database migration applied successfully
- ✅ tRPC routers implemented: org, membership, invitation
- ✅ RBAC helpers: requireMembership, requireAdmin
- ✅ Email service abstraction with dev logger
- ✅ Comprehensive test suite (23 tests passing)
- ✅ All tests use factory functions for isolation
- ✅ Lint and type checking passing

**Blockers**: None
**Next Steps**: Implement minimal UI for org management and invitation flows

### 2025-11-02 - Plan
**Status**: Not Started
**Progress**: Task simplified per decisions: per-request orgId; dev-only invite logging; multiple admins supported
**Blockers**: None
**Next Steps**: Define schema, write migrations, and scaffold tRPC procedures and minimal UI

## Completion Checklist

- [x] All acceptance criteria met
- [x] Code follows project standards
- [x] Tests written and passing
- [x] Documentation updated
- [ ] Code review completed

## Notes

- Keep existing magic code auth flow; no new auth system.
- Per-request orgId for all procedures; enforce RBAC via Membership roles.
- Multiple admins per org supported; preventing last-admin removal can be handled later.
- Dev-only invite delivery via console logging; provider integration is future work.
