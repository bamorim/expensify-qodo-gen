import { describe, it, expect, beforeEach, vi } from "vitest";
import { policyRouter } from "./policy";
import { db } from "~/server/db";
import { Role, ReviewMode } from "@prisma/client";
import { TRPCError } from "@trpc/server";

vi.mock("~/server/db");
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

describe("policyRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Factory functions
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

  const createCategory = async (orgId: string, name: string) => {
    return await db.category.create({
      data: { orgId, name },
    });
  };

  const createCaller = (userId: string, email: string, name: string) => {
    const mockSession = {
      user: { id: userId, email, name },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };

    return policyRouter.createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });
  };

  describe("create", () => {
    it("should allow ADMIN to create an org-wide policy", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const policy = await caller.create({
        orgId: org.id,
        name: "Default Policy",
        maxAmount: 100,
        reviewMode: ReviewMode.AUTO_APPROVE,
      });

      expect(policy.name).toBe("Default Policy");
      expect(policy.maxAmount).toBe("100");
      expect(policy.reviewMode).toBe(ReviewMode.AUTO_APPROVE);
      expect(policy.categoryId).toBeNull();
      expect(policy.userId).toBeNull();
    });

    it("should allow ADMIN to create a category-specific policy", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      const category = await createCategory(org.id, "Travel");

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const policy = await caller.create({
        orgId: org.id,
        name: "Travel Policy",
        categoryId: category.id,
        maxAmount: 500,
      });

      expect(policy.categoryId).toBe(category.id);
      expect(policy.userId).toBeNull();
    });

    it("should allow ADMIN to create a user-specific policy", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const policy = await caller.create({
        orgId: org.id,
        name: "VIP Policy",
        userId: member.id,
        maxAmount: 1000,
      });

      expect(policy.userId).toBe(member.id);
      expect(policy.categoryId).toBeNull();
    });

    it("should allow ADMIN to create a user+category-specific policy", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);
      const category = await createCategory(org.id, "Travel");

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const policy = await caller.create({
        orgId: org.id,
        name: "VIP Travel Policy",
        userId: member.id,
        categoryId: category.id,
        maxAmount: 2000,
      });

      expect(policy.userId).toBe(member.id);
      expect(policy.categoryId).toBe(category.id);
    });

    it("should reject MEMBER trying to create a policy", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const caller = createCaller(member.id, member.email!, member.name!);

      await expect(
        caller.create({
          orgId: org.id,
          name: "Policy",
          maxAmount: 100,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("list", () => {
    it("should list all policies for ADMIN", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      await caller.create({
        orgId: org.id,
        name: "Policy 1",
        maxAmount: 100,
      });
      await caller.create({
        orgId: org.id,
        name: "Policy 2",
        maxAmount: 200,
      });

      const policies = await caller.list({ orgId: org.id });

      expect(policies).toHaveLength(2);
    });

    it("should reject MEMBER trying to list policies", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const caller = createCaller(member.id, member.email!, member.name!);

      await expect(caller.list({ orgId: org.id })).rejects.toThrow(TRPCError);
    });
  });

  describe("update", () => {
    it("should allow ADMIN to update a policy", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const policy = await caller.create({
        orgId: org.id,
        name: "Old Name",
        maxAmount: 100,
      });

      const updated = await caller.update({
        id: policy.id,
        name: "New Name",
        maxAmount: 200,
      });

      expect(updated.name).toBe("New Name");
      expect(updated.maxAmount).toBe("200");
    });

    it("should reject MEMBER trying to update a policy", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const adminCaller = createCaller(admin.id, admin.email!, admin.name!);
      const policy = await adminCaller.create({
        orgId: org.id,
        name: "Policy",
        maxAmount: 100,
      });

      const memberCaller = createCaller(member.id, member.email!, member.name!);

      await expect(
        memberCaller.update({
          id: policy.id,
          name: "Updated",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should allow ADMIN to delete a policy", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);

      const caller = createCaller(admin.id, admin.email!, admin.name!);
      const policy = await caller.create({
        orgId: org.id,
        name: "Policy",
        maxAmount: 100,
      });

      const result = await caller.delete({ id: policy.id });

      expect(result.success).toBe(true);
    });

    it("should reject MEMBER trying to delete a policy", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);

      const adminCaller = createCaller(admin.id, admin.email!, admin.name!);
      const policy = await adminCaller.create({
        orgId: org.id,
        name: "Policy",
        maxAmount: 100,
      });

      const memberCaller = createCaller(member.id, member.email!, member.name!);

      await expect(
        memberCaller.delete({ id: policy.id }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("resolve - precedence rules", () => {
    it("should select user+category policy over all others", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);
      const category = await createCategory(org.id, "Travel");

      const caller = createCaller(admin.id, admin.email!, admin.name!);

      // Create all 4 types of policies
      await caller.create({
        orgId: org.id,
        name: "Org-wide",
        maxAmount: 100,
      });
      await caller.create({
        orgId: org.id,
        name: "Org-Category",
        categoryId: category.id,
        maxAmount: 200,
      });
      await caller.create({
        orgId: org.id,
        name: "User-wide",
        userId: member.id,
        maxAmount: 300,
      });
      const userCategory = await caller.create({
        orgId: org.id,
        name: "User-Category",
        userId: member.id,
        categoryId: category.id,
        maxAmount: 400,
      });

      const result = await caller.resolve({
        orgId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.policy?.id).toBe(userCategory.id);
      expect(result.debugInfo.applicablePolicies).toHaveLength(4);
      expect(result.debugInfo.applicablePolicies[0]?.specificity).toBe(
        "user-category",
      );
    });

    it("should select org-category policy over user-wide policy", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);
      const category = await createCategory(org.id, "Travel");

      const caller = createCaller(admin.id, admin.email!, admin.name!);

      await caller.create({
        orgId: org.id,
        name: "Org-wide",
        maxAmount: 100,
      });
      const orgCategory = await caller.create({
        orgId: org.id,
        name: "Org-Category",
        categoryId: category.id,
        maxAmount: 200,
      });
      await caller.create({
        orgId: org.id,
        name: "User-wide",
        userId: member.id,
        maxAmount: 300,
      });

      const result = await caller.resolve({
        orgId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.policy?.id).toBe(orgCategory.id);
      expect(result.debugInfo.applicablePolicies[0]?.specificity).toBe(
        "org-category",
      );
    });

    it("should select org-category policy when no user policies exist", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);
      const category = await createCategory(org.id, "Travel");

      const caller = createCaller(admin.id, admin.email!, admin.name!);

      await caller.create({
        orgId: org.id,
        name: "Org-wide",
        maxAmount: 100,
      });
      const orgCategory = await caller.create({
        orgId: org.id,
        name: "Org-Category",
        categoryId: category.id,
        maxAmount: 200,
      });

      const result = await caller.resolve({
        orgId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.policy?.id).toBe(orgCategory.id);
      expect(result.debugInfo.applicablePolicies[0]?.specificity).toBe(
        "org-category",
      );
    });

    it("should select org-wide policy as fallback", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);
      const category = await createCategory(org.id, "Travel");

      const caller = createCaller(admin.id, admin.email!, admin.name!);

      const orgWide = await caller.create({
        orgId: org.id,
        name: "Org-wide",
        maxAmount: 100,
      });

      const result = await caller.resolve({
        orgId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.policy?.id).toBe(orgWide.id);
      expect(result.debugInfo.applicablePolicies[0]?.specificity).toBe(
        "org-wide",
      );
    });

    it("should return null when no policies exist", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);
      const category = await createCategory(org.id, "Travel");

      const caller = createCaller(admin.id, admin.email!, admin.name!);

      const result = await caller.resolve({
        orgId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.policy).toBeNull();
      expect(result.debugInfo.applicablePolicies).toHaveLength(0);
    });

    it("should provide debug information explaining selection", async () => {
      const admin = await createUser("admin@example.com", "Admin");
      const member = await createUser("member@example.com", "Member");
      const org = await createOrg("Test Org", admin.id);
      await createMembership(admin.id, org.id, Role.ADMIN);
      await createMembership(member.id, org.id, Role.MEMBER);
      const category = await createCategory(org.id, "Travel");

      const caller = createCaller(admin.id, admin.email!, admin.name!);

      await caller.create({
        orgId: org.id,
        name: "Org-wide",
        maxAmount: 100,
      });
      await caller.create({
        orgId: org.id,
        name: "Org-Category",
        categoryId: category.id,
        maxAmount: 200,
      });

      const result = await caller.resolve({
        orgId: org.id,
        userId: member.id,
        categoryId: category.id,
      });

      expect(result.debugInfo.selectionReason).toContain("org-category");
      expect(result.debugInfo.applicablePolicies).toHaveLength(2);
      expect(result.debugInfo.applicablePolicies[0]?.reason).toBeTruthy();
    });
  });
});
