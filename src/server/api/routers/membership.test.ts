import { describe, it, expect, beforeEach, vi } from "vitest";
import { membershipRouter } from "./membership";
import { db } from "~/server/db";
import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";

vi.mock("~/server/db");
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

describe("membershipRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createCaller = (userId: string, email: string, name: string) => {
    const mockSession = {
      user: { id: userId, email, name },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };

    return membershipRouter.createCaller({
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

  describe("my", () => {
    it("should return membership for current user", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const membership = await caller.my({ orgId: org.id });

      expect(membership).toBeDefined();
      expect(membership?.userId).toBe(admin.id);
      expect(membership?.orgId).toBe(org.id);
      expect(membership?.role).toBe(Role.ADMIN);
    });

    it("should return null if user is not a member", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org = await createOrg("Test Org", admin.id);

      const member = await createUser("member@example.com", "Member User");
      const caller = createCaller(member.id, member.email!, member.name!);
      const membership = await caller.my({ orgId: org.id });

      expect(membership).toBeNull();
    });
  });

  describe("list", () => {
    it("should list all members for ADMIN", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const member = await createUser("member@example.com", "Member User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const members = await caller.list({ orgId: org.id });

      expect(members).toHaveLength(2);
      expect(members.map((m) => m.user.email)).toContain("admin@example.com");
      expect(members.map((m) => m.user.email)).toContain("member@example.com");
    });

    it("should reject MEMBER trying to list members", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const member = await createUser("member@example.com", "Member User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const caller = createCaller(member.id, member.email!, member.name!);

      await expect(caller.list({ orgId: org.id })).rejects.toThrow(TRPCError);
    });

    it("should reject non-member trying to list members", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const nonMember = await createUser("other@example.com", "Other User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(nonMember.id, nonMember.email!, nonMember.name!);

      await expect(caller.list({ orgId: org.id })).rejects.toThrow(TRPCError);
    });
  });
});
