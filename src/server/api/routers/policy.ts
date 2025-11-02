import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireAdmin } from "./membership";
import { Period, ReviewMode } from "@prisma/client";
import { resolvePolicy } from "~/server/policy-engine/resolver";
import { Decimal } from "@prisma/client/runtime/library";

export const policyRouter = createTRPCRouter({
  /**
   * Create a new policy (ADMIN only).
   */
  create: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        categoryId: z.string().optional(),
        userId: z.string().optional(),
        maxAmount: z.number().positive(),
        period: z.nativeEnum(Period).default(Period.PER_EXPENSE),
        reviewMode: z.nativeEnum(ReviewMode).default(ReviewMode.MANUAL_REVIEW),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx, input.orgId);

      // Validate category belongs to org if provided
      if (input.categoryId) {
        await ctx.db.category.findFirstOrThrow({
          where: {
            id: input.categoryId,
            orgId: input.orgId,
          },
        });
      }

      // Validate user is member of org if provided
      if (input.userId) {
        await ctx.db.membership.findUniqueOrThrow({
          where: {
            userId_orgId: {
              userId: input.userId,
              orgId: input.orgId,
            },
          },
        });
      }

      const policy = await ctx.db.policy.create({
        data: {
          orgId: input.orgId,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          userId: input.userId,
          maxAmount: new Decimal(input.maxAmount),
          period: input.period,
          reviewMode: input.reviewMode,
        },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        ...policy,
        maxAmount: policy.maxAmount.toString(),
      };
    }),

  /**
   * List all policies for an organization (ADMIN only).
   */
  list: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx, input.orgId);

      const policies = await ctx.db.policy.findMany({
        where: { orgId: input.orgId },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { userId: "asc" },
          { categoryId: "asc" },
          { createdAt: "desc" },
        ],
      });

      return policies.map((policy) => ({
        ...policy,
        maxAmount: policy.maxAmount.toString(),
      }));
    }),

  /**
   * Update a policy (ADMIN only).
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional().nullable(),
        maxAmount: z.number().positive().optional(),
        reviewMode: z.nativeEnum(ReviewMode).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get policy to check org ownership
      const policy = await ctx.db.policy.findUniqueOrThrow({
        where: { id: input.id },
      });

      await requireAdmin(ctx, policy.orgId);

      const updated = await ctx.db.policy.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          maxAmount: input.maxAmount
            ? new Decimal(input.maxAmount)
            : undefined,
          reviewMode: input.reviewMode,
        },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        ...updated,
        maxAmount: updated.maxAmount.toString(),
      };
    }),

  /**
   * Delete a policy (ADMIN only).
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get policy to check org ownership
      const policy = await ctx.db.policy.findUniqueOrThrow({
        where: { id: input.id },
      });

      await requireAdmin(ctx, policy.orgId);

      await ctx.db.policy.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Resolve the applicable policy for a user/category combination.
   * Returns the policy and debug information explaining the resolution.
   */
  resolve: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        userId: z.string(),
        categoryId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user is member of org
      await ctx.db.membership.findUniqueOrThrow({
        where: {
          userId_orgId: {
            userId: ctx.session.user.id,
            orgId: input.orgId,
          },
        },
      });

      // Verify target user is member of org
      await ctx.db.membership.findUniqueOrThrow({
        where: {
          userId_orgId: {
            userId: input.userId,
            orgId: input.orgId,
          },
        },
      });

      // Verify category belongs to org if provided
      if (input.categoryId) {
        await ctx.db.category.findFirstOrThrow({
          where: {
            id: input.categoryId,
            orgId: input.orgId,
          },
        });
      }

      // Get all policies for the organization
      const policies = await ctx.db.policy.findMany({
        where: { orgId: input.orgId },
      });

      // Resolve the policy
      const result = resolvePolicy(policies, input.userId, input.categoryId);

      return {
        policy: result.policy
          ? {
              ...result.policy,
              maxAmount: result.policy.maxAmount.toString(),
            }
          : null,
        debugInfo: {
          ...result.debugInfo,
          applicablePolicies: result.debugInfo.applicablePolicies.map((ap) => ({
            ...ap,
            policy: {
              ...ap.policy,
              maxAmount: ap.policy.maxAmount.toString(),
            },
          })),
          selectedPolicy: result.debugInfo.selectedPolicy
            ? {
                ...result.debugInfo.selectedPolicy,
                maxAmount: result.debugInfo.selectedPolicy.maxAmount.toString(),
              }
            : null,
        },
      };
    }),
});
