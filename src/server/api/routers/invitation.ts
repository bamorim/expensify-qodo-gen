import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { Role } from "@prisma/client";
import { requireAdmin } from "./membership";
import { devEmailService } from "~/server/email/service";
import { randomBytes } from "crypto";

export const invitationRouter = createTRPCRouter({
  /**
   * Invite a user to an organization (ADMIN only).
   */
  invite: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        email: z.string().email(),
        role: z.nativeEnum(Role).optional().default(Role.MEMBER),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx, input.orgId);

      // Check if user is already a member
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        const existingMembership = await ctx.db.membership.findUnique({
          where: {
            userId_orgId: {
              userId: existingUser.id,
              orgId: input.orgId,
            },
          },
        });

        if (existingMembership) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is already a member of this organization",
          });
        }
      }

      // Check for existing pending invitation
      const existingInvite = await ctx.db.invitation.findUnique({
        where: {
          orgId_email: {
            orgId: input.orgId,
            email: input.email,
          },
        },
      });

      if (existingInvite && !existingInvite.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An invitation for this email already exists",
        });
      }

      // Generate token and create invitation
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const invitation = await ctx.db.invitation.create({
        data: {
          email: input.email,
          orgId: input.orgId,
          invitedById: ctx.session.user.id,
          role: input.role,
          token,
          expiresAt,
        },
        include: {
          org: true,
        },
      });

      // Send email
      await devEmailService.sendInviteEmail({
        email: input.email,
        orgName: invitation.org.name,
        token,
      });

      return invitation;
    }),

  /**
   * List pending invitations for an org (ADMIN only).
   */
  listPending: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx, input.orgId);

      const invitations = await ctx.db.invitation.findMany({
        where: {
          orgId: input.orgId,
          acceptedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return invitations;
    }),

  /**
   * Accept an invitation using a token.
   */
  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        include: { org: true },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invitation.acceptedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has already been accepted",
        });
      }

      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
        });
      }

      const userEmail = ctx.session.user.email;
      if (invitation.email !== userEmail) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is for a different email address",
        });
      }

      // Create membership and mark invitation as accepted
      const membership = await ctx.db.$transaction(async (tx) => {
        // Check if membership already exists
        const existing = await tx.membership.findUnique({
          where: {
            userId_orgId: {
              userId: ctx.session.user.id,
              orgId: invitation.orgId,
            },
          },
        });

        if (existing) {
          // Just mark invitation as accepted
          await tx.invitation.update({
            where: { id: invitation.id },
            data: { acceptedAt: new Date() },
          });
          return existing;
        }

        // Create new membership
        const newMembership = await tx.membership.create({
          data: {
            userId: ctx.session.user.id,
            orgId: invitation.orgId,
            role: invitation.role,
          },
          include: {
            org: true,
          },
        });

        // Mark invitation as accepted
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });

        return newMembership;
      });

      return {
        membership,
        org: invitation.org,
      };
    }),
});
