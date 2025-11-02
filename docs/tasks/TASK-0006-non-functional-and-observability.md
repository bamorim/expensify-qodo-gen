# Task: NFRs and Observability Baseline

## Meta Information

- **Task ID**: TASK-0006
- **Title**: NFRs and Observability Baseline
- **Status**: Not Started
- **Priority**: P1
- **Created**: 2025-11-02
- **Updated**: 2025-11-02
- **Estimated Effort**: 2-3 days
- **Actual Effort**: TBD

## Related Documents

- **PRD**: ../product/prd-main.md
- **ADR**: ../technical/decisions/0001-use-t3-stack.md
- **Dependencies**: TASK-0001

## Description

Implement baseline for non-functional requirements: performance budgets, accessibility, security posture, and logging/monitoring hooks. Ensure page load <2s, set up basic tracing/logging, and document practices.

## Acceptance Criteria

- [ ] Performance budgets defined and tracked (bundle size, key routes SSR/CSR)
- [ ] Lighthouse/AXE checks integrated into CI for AA
- [ ] Logging: structured logs for key operations (policy resolution, state changes)
- [ ] Security: org data isolation checks tested; input validation in Zod everywhere
- [ ] Documentation: practices in technical/architecture.md

## TODOs

- [ ] Add CI steps for Lighthouse/AXE (can be local scripts initially)
- [ ] Implement simple logger wrapper
- [ ] Add performance metrics and thresholds
- [ ] Review Zod schemas across routers

## Progress Updates

### 2025-11-02 - Plan
**Status**: Not Started
**Progress**: Task added to cover NFRs
**Blockers**: None
**Next Steps**: Define budgets and add scripts

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code review completed

## Notes

NFRs are ongoing; treat this as baseline with iterative improvements.
