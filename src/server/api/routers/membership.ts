import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { Role, type PrismaClient } from "@prisma/client";

type AuthContext = {
  db: PrismaClient;
  session: { user: { id: string } };
};

/**
 * Helper to require membership in an org.
 */
async function requireMembership(ctx: AuthContext, orgId: string) {
  const membership = await ctx.db.membership.findUnique({
    where: {
      userId_orgId: {
        userId: ctx.session.user.id,
        orgId,
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this organization",
    });
  }

  return membership;
}

/**
 * Helper to require ADMIN role in an org.
 */
async function requireAdmin(ctx: AuthContext, orgId: string) {
  const membership = await requireMembership(ctx, orgId);

  if (membership.role !== Role.ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin of this organization",
    });
  }

  return membership;
}

export const membershipRouter = createTRPCRouter({
  /**
   * Get current user's membership in an org.
   */
  my: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db.membership.findUnique({
        where: {
          userId_orgId: {
            userId: ctx.session.user.id,
            orgId: input.orgId,
          },
        },
      });

      return membership;
    }),

  /**
   * List all members of an org (ADMIN only).
   */
  list: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx, input.orgId);

      const memberships = await ctx.db.membership.findMany({
        where: { orgId: input.orgId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return memberships;
    }),
});

export { requireMembership, requireAdmin };
