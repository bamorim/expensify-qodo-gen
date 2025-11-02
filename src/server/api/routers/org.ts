import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { Role } from "@prisma/client";

export const orgRouter = createTRPCRouter({
  /**
   * Create a new organization. Creator becomes ADMIN.
   */
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const org = await ctx.db.organization.create({
        data: {
          name: input.name,
          createdById: userId,
          memberships: {
            create: {
              userId,
              role: Role.ADMIN,
            },
          },
        },
        include: {
          memberships: {
            where: { userId },
          },
        },
      });

      return org;
    }),

  /**
   * List all organizations the current user is a member of.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const memberships = await ctx.db.membership.findMany({
      where: { userId },
      include: {
        org: true,
      },
      orderBy: {
        org: { name: "asc" },
      },
    });

    return memberships.map((m) => ({
      org: m.org,
      role: m.role,
    }));
  }),
});
