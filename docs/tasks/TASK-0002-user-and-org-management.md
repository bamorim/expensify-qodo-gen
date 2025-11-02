# Task: FR1/FR2 - User and Organization Management (MVP, Simplified)

## Meta Information

- **Task ID**: TASK-0002
- **Title**: FR1/FR2 - User and Organization Management (MVP)
- **Status**: Not Started
- **Priority**: P0
- **Created**: 2025-11-02
- **Updated**: 2025-11-02
- **Estimated Effort**: 2-3 days
- **Actual Effort**: TBD

## Related Documents

- **PRD**: ../product/prd-main.md
- **ADR**: ../technical/decisions/0001-use-t3-stack.md
- **Dependencies**: TASK-0001

## Description

Simplified MVP scope leveraging existing magic code auth. Implement organizations, invitations, and membership with per-request orgId, console-logged invite links, and support for multiple admins per organization. Enforce org-scoped isolation and RBAC via tRPC procedures.

## Acceptance Criteria

- [ ] org.create: creator becomes ADMIN
- [ ] invitation.create: ADMIN-only; persists PENDING invite with token and expiry; logs accept URL to console
- [ ] invitation.accept: requires authenticated session; session.email matches invite email; creates MEMBER membership (idempotent) and marks ACCEPTED
- [ ] membership.listByOrg: ADMIN-only; lists members and roles
- [ ] Per-request orgId validated with RBAC in all procedures
- [ ] Minimal UI: /orgs (list/create), /orgs/[id]/invitations (create/list), accept flow via token URL
- [ ] Transactional tests for RBAC, isolation, invite lifecycle, and idempotent membership creation

## TODOs

- [ ] Prisma schema: Organization, Membership(role enum), Invitation(token, status, expiresAt) with indexes and FKs; unique(orgId, userId); unique(token)
- [ ] tRPC routers: org.create, org.listMine, invitation.create, invitation.accept, invitation.listByOrg, membership.listByOrg
- [ ] Context helpers: requireAuth(), requireRole(orgId, role)
- [ ] Dev mailer: console log accept URL and token
- [ ] UI: /orgs (list/create), /orgs/[orgId]/invitations (create/list), accept page (token-based)
- [ ] Tests: transactional tests for RBAC, invite lifecycle, and isolation
- [ ] Migrations and minimal seed data

## Progress Updates

### 2025-11-02 - Plan
**Status**: Not Started
**Progress**: Task simplified per decisions: per-request orgId; dev-only invite logging; multiple admins supported
**Blockers**: None
**Next Steps**: Define schema, write migrations, and scaffold tRPC procedures and minimal UI

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review completed

## Notes

- Keep existing magic code auth flow; no new auth system.
- Per-request orgId for all procedures; enforce RBAC via Membership roles.
- Multiple admins per org supported; preventing last-admin removal can be handled later.
- Dev-only invite delivery via console logging; provider integration is future work.
