import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireAdmin } from "./membership";

export const categoryRouter = createTRPCRouter({
  /**
   * Create a new category (ADMIN only).
   */
  create: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx, input.orgId);

      const category = await ctx.db.category.create({
        data: {
          orgId: input.orgId,
          name: input.name,
          description: input.description,
        },
      });

      return category;
    }),

  /**
   * List all categories for an organization.
   */
  list: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Any member can list categories
      await ctx.db.membership.findUniqueOrThrow({
        where: {
          userId_orgId: {
            userId: ctx.session.user.id,
            orgId: input.orgId,
          },
        },
      });

      const categories = await ctx.db.category.findMany({
        where: { orgId: input.orgId },
        orderBy: { name: "asc" },
      });

      return categories;
    }),

  /**
   * Update a category (ADMIN only).
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First get the category to check org ownership
      const category = await ctx.db.category.findUniqueOrThrow({
        where: { id: input.id },
      });

      await requireAdmin(ctx, category.orgId);

      const updated = await ctx.db.category.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
        },
      });

      return updated;
    }),

  /**
   * Delete a category (ADMIN only).
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First get the category to check org ownership
      const category = await ctx.db.category.findUniqueOrThrow({
        where: { id: input.id },
      });

      await requireAdmin(ctx, category.orgId);

      await ctx.db.category.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
