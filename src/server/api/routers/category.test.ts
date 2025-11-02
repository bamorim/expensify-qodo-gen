import { describe, it, expect, beforeEach, vi } from "vitest";
import { categoryRouter } from "./category";
import { db } from "~/server/db";
import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";

vi.mock("~/server/db");
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

describe("categoryRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  const createCaller = (userId: string, email: string, name: string) => {
    const mockSession = {
      user: { id: userId, email, name },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };

    return categoryRouter.createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });
  };

  describe("create", () => {
    it("should allow ADMIN to create a category", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const category = await caller.create({
        orgId: org.id,
        name: "Travel",
        description: "Travel expenses",
      });

      expect(category.name).toBe("Travel");
      expect(category.description).toBe("Travel expenses");
      expect(category.orgId).toBe(org.id);
    });

    it("should reject MEMBER trying to create a category", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const member = await createUser("member@example.com", "Member User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const caller = createCaller(member.id, member.email!, member.name!);

      await expect(
        caller.create({
          orgId: org.id,
          name: "Travel",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject non-member trying to create a category", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const nonMember = await createUser("other@example.com", "Other User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(nonMember.id, nonMember.email!, nonMember.name!);

      await expect(
        caller.create({
          orgId: org.id,
          name: "Travel",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should enforce unique category names per org", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      await caller.create({
        orgId: org.id,
        name: "Travel",
      });

      await expect(
        caller.create({
          orgId: org.id,
          name: "Travel",
        }),
      ).rejects.toThrow();
    });
  });

  describe("list", () => {
    it("should list categories for org members", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const member = await createUser("member@example.com", "Member User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const adminCaller = createCaller(admin.id, admin.email!, admin.name!);
      await adminCaller.create({ orgId: org.id, name: "Travel" });
      await adminCaller.create({ orgId: org.id, name: "Meals" });

      const memberCaller = createCaller(member.id, member.email!, member.name!);
      const categories = await memberCaller.list({ orgId: org.id });

      expect(categories).toHaveLength(2);
      expect(categories.map((c) => c.name)).toContain("Travel");
      expect(categories.map((c) => c.name)).toContain("Meals");
    });

    it("should reject non-member trying to list categories", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const nonMember = await createUser("other@example.com", "Other User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(nonMember.id, nonMember.email!, nonMember.name!);

      await expect(caller.list({ orgId: org.id })).rejects.toThrow();
    });

    it("should only list categories for the specified org", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org1 = await createOrg("Org 1", admin.id);
      const org2 = await createOrg("Org 2", admin.id);
      await createMembership(admin.id, org1.id, Role.ADMIN);
      await createMembership(admin.id, org2.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      await caller.create({ orgId: org1.id, name: "Org1 Category" });
      await caller.create({ orgId: org2.id, name: "Org2 Category" });

      const org1Categories = await caller.list({ orgId: org1.id });
      const org2Categories = await caller.list({ orgId: org2.id });

      expect(org1Categories).toHaveLength(1);
      expect(org1Categories[0]?.name).toBe("Org1 Category");

      expect(org2Categories).toHaveLength(1);
      expect(org2Categories[0]?.name).toBe("Org2 Category");
    });
  });

  describe("update", () => {
    it("should allow ADMIN to update a category", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const category = await caller.create({
        orgId: org.id,
        name: "Travel",
        description: "Old description",
      });

      const updated = await caller.update({
        id: category.id,
        name: "Business Travel",
        description: "New description",
      });

      expect(updated.name).toBe("Business Travel");
      expect(updated.description).toBe("New description");
    });

    it("should reject MEMBER trying to update a category", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const member = await createUser("member@example.com", "Member User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const adminCaller = createCaller(admin.id, admin.email!, admin.name!);
      const category = await adminCaller.create({
        orgId: org.id,
        name: "Travel",
      });

      const memberCaller = createCaller(member.id, member.email!, member.name!);

      await expect(
        memberCaller.update({
          id: category.id,
          name: "Updated Travel",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should prevent updating category from different org", async () => {
      const admin1 = await createUser("admin1@example.com", "Admin 1");
      const admin2 = await createUser("admin2@example.com", "Admin 2");
      const org1 = await createOrg("Org 1", admin1.id);
      const org2 = await createOrg("Org 2", admin2.id);
      await createMembership(admin1.id, org1.id, Role.ADMIN);
      await createMembership(admin2.id, org2.id, Role.ADMIN);

      const caller1 = createCaller(admin1.id, admin1.email!, admin1.name!);
      const category = await caller1.create({
        orgId: org1.id,
        name: "Travel",
      });

      const caller2 = createCaller(admin2.id, admin2.email!, admin2.name!);

      await expect(
        caller2.update({
          id: category.id,
          name: "Updated Travel",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should allow ADMIN to delete a category", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const category = await caller.create({
        orgId: org.id,
        name: "Travel",
      });

      const result = await caller.delete({ id: category.id });

      expect(result.success).toBe(true);

      // Verify it's deleted
      const categories = await caller.list({ orgId: org.id });
      expect(categories).toHaveLength(0);
    });

    it("should reject MEMBER trying to delete a category", async () => {
      const admin = await createUser("admin@example.com", "Admin User");
      const member = await createUser("member@example.com", "Member User");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const adminCaller = createCaller(admin.id, admin.email!, admin.name!);
      const category = await adminCaller.create({
        orgId: org.id,
        name: "Travel",
      });

      const memberCaller = createCaller(member.id, member.email!, member.name!);

      await expect(
        memberCaller.delete({ id: category.id }),
      ).rejects.toThrow(TRPCError);
    });

    it("should prevent deleting category from different org", async () => {
      const admin1 = await createUser("admin1@example.com", "Admin 1");
      const admin2 = await createUser("admin2@example.com", "Admin 2");
      const org1 = await createOrg("Org 1", admin1.id);
      const org2 = await createOrg("Org 2", admin2.id);
      await createMembership(admin1.id, org1.id, Role.ADMIN);
      await createMembership(admin2.id, org2.id, Role.ADMIN);

      const caller1 = createCaller(admin1.id, admin1.email!, admin1.name!);
      const category = await caller1.create({
        orgId: org1.id,
        name: "Travel",
      });

      const caller2 = createCaller(admin2.id, admin2.email!, admin2.name!);

      await expect(
        caller2.delete({ id: category.id }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
