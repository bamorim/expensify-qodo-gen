import { describe, it, expect, beforeEach, vi } from "vitest";
import { invitationRouter } from "./invitation";
import { db } from "~/server/db";
import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { __emailTestSink } from "~/server/email/service";

vi.mock("~/server/db");
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

describe("invitationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __emailTestSink.drain(); // Clear email test sink
  });

  const createCaller = (userId: string, email: string, name: string) => {
    const mockSession = {
      user: { id: userId, email, name },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };

    return invitationRouter.createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });
  };

  // Factory functions for test data
  const createUser = async (email: string, name: string) => {
    return await db.user.create({
      data: { email, name },
    });
  };

  const createOrg = async (name: string, createdById: string) => {
    return await db.organization.create({
      data: { name, createdById },
    });
  };

  const createMembership = async (
    userId: string,
    orgId: string,
    role: Role,
  ) => {
    return await db.membership.create({
      data: { userId, orgId, role },
    });
  };

  const createInvitation = async (
    email: string,
    orgId: string,
    invitedById: string,
    role: Role,
    token: string,
  ) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return await db.invitation.create({
      data: {
        email,
        orgId,
        invitedById,
        role,
        token,
        expiresAt,
      },
    });
  };

  describe("invite", () => {
    it("should allow ADMIN to invite a user", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const invitation = await caller.invite({
        orgId: org.id,
        email: "invitee@example.com",
        role: Role.MEMBER,
      });

      expect(invitation.email).toBe("invitee@example.com");
      expect(invitation.orgId).toBe(org.id);
      expect(invitation.role).toBe(Role.MEMBER);
      expect(invitation.token).toBeDefined();
      expect(invitation.expiresAt).toBeInstanceOf(Date);

      // Check email was sent
      const emails = __emailTestSink.drain();
      expect(emails).toHaveLength(1);
      expect(emails[0]?.email).toBe("invitee@example.com");
      expect(emails[0]?.orgName).toBe("Test Org");
    });

    it("should reject MEMBER trying to invite", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const member = await createUser("member@example.com", "Member User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const caller = createCaller(member.id, member.email!, member.name!);

      await expect(
        caller.invite({
          orgId: org.id,
          email: "another@example.com",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject duplicate invitation", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);

      await caller.invite({
        orgId: org.id,
        email: "invitee@example.com",
      });

      await expect(
        caller.invite({
          orgId: org.id,
          email: "invitee@example.com",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject inviting existing member", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);

      await expect(
        caller.invite({
          orgId: org.id,
          email: "admin@example.com", // Admin is already a member
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("listPending", () => {
    it("should list pending invitations for ADMIN", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      await createInvitation(
        "user1@example.com",
        org.id,
        admin.id,
        Role.MEMBER,
        "token1",
      );
      await createInvitation(
        "user2@example.com",
        org.id,
        admin.id,
        Role.MEMBER,
        "token2",
      );

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const pending = await caller.listPending({ orgId: org.id });

      expect(pending).toHaveLength(2);
      expect(pending.map((i) => i.email)).toContain("user1@example.com");
      expect(pending.map((i) => i.email)).toContain("user2@example.com");
    });

    it("should not list accepted invitations", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const invitee = await createUser("invitee@example.com", "Invitee User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const invitation = await createInvitation(
        invitee.email!,
        org.id,
        admin.id,
        Role.MEMBER,
        "token1",
      );

      // Accept the invitation
      await db.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const pending = await caller.listPending({ orgId: org.id });

      expect(pending).toHaveLength(0);
    });

    it("should reject MEMBER trying to list pending invitations", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const member = await createUser("member@example.com", "Member User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const caller = createCaller(member.id, member.email!, member.name!);

      await expect(caller.listPending({ orgId: org.id })).rejects.toThrow(
        TRPCError,
      );
    });
  });

  describe("accept", () => {
    it("should allow invitee to accept invitation", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const invitee = await createUser("invitee@example.com", "Invitee User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const invitation = await createInvitation(
        invitee.email!,
        org.id,
        admin.id,
        Role.MEMBER,
        "test-token",
      );

      const caller = createCaller(invitee.id, invitee.email!, invitee.name!);
      const result = await caller.accept({ token: invitation.token });

      expect(result.membership.userId).toBe(invitee.id);
      expect(result.membership.orgId).toBe(org.id);
      expect(result.membership.role).toBe(Role.MEMBER);
      expect(result.org.id).toBe(org.id);
    });

    it("should reject invalid token", async () => {
      const invitee = await createUser("invitee@example.com", "Invitee User");
      const caller = createCaller(invitee.id, invitee.email!, invitee.name!);

      await expect(caller.accept({ token: "invalid-token" })).rejects.toThrow(
        TRPCError,
      );
    });

    it("should reject already accepted invitation", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const invitee = await createUser("invitee@example.com", "Invitee User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const invitation = await createInvitation(
        invitee.email!,
        org.id,
        admin.id,
        Role.MEMBER,
        "test-token",
      );

      const caller = createCaller(invitee.id, invitee.email!, invitee.name!);
      await caller.accept({ token: invitation.token });

      await expect(
        caller.accept({ token: invitation.token }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject wrong email trying to accept", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const invitee = await createUser("invitee@example.com", "Invitee User");
      const wrongUser = await createUser("wrong@example.com", "Wrong User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const invitation = await createInvitation(
        invitee.email!,
        org.id,
        admin.id,
        Role.MEMBER,
        "test-token",
      );

      const caller = createCaller(wrongUser.id, wrongUser.email!, wrongUser.name!);
      await expect(
        caller.accept({ token: invitation.token }),
      ).rejects.toThrow(TRPCError);
    });

    it("should handle expired invitation", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const invitee = await createUser("invitee@example.com", "Invitee User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const invitation = await db.invitation.create({
        data: {
          email: invitee.email!,
          orgId: org.id,
          invitedById: admin.id,
          role: Role.MEMBER,
          token: "expired-token",
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      const caller = createCaller(invitee.id, invitee.email!, invitee.name!);
      await expect(
        caller.accept({ token: invitation.token }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
