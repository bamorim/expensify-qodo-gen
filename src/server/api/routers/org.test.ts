import { describe, it, expect, beforeEach, vi } from "vitest";
import { orgRouter } from "./org";
import { db } from "~/server/db";
import { Role } from "@prisma/client";

vi.mock("~/server/db");
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

describe("orgRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createUser = async (email: string, name: string) => {
    return await db.user.create({
      data: { email, name },
    });
  };

  const createCaller = (userId: string, email: string, name: string) => {
    const mockSession = {
      user: { id: userId, email, name },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };

    return orgRouter.createCaller({
      db,
      session: mockSession,
      headers: new Headers(),
    });
  };

  describe("create", () => {
    it("should create an organization with creator as ADMIN", async () => {
      const user = await createUser("test@example.com", "Test User");
      const caller = createCaller(user.id, user.email!, user.name!);

      const result = await caller.create({ name: "Test Org" });

      expect(result.name).toBe("Test Org");
      expect(result.createdById).toBe(user.id);
      expect(result.memberships).toHaveLength(1);
      expect(result.memberships[0]?.role).toBe(Role.ADMIN);
      expect(result.memberships[0]?.userId).toBe(user.id);
    });

    it("should reject empty organization name", async () => {
      const user = await createUser("test@example.com", "Test User");
      const caller = createCaller(user.id, user.email!, user.name!);

      await expect(caller.create({ name: "" })).rejects.toThrow();
    });
  });

  describe("list", () => {
    it("should list organizations user is a member of", async () => {
      const user = await createUser("test@example.com", "Test User");
      const caller = createCaller(user.id, user.email!, user.name!);

      // Create two orgs
      await caller.create({ name: "Org 1" });
      await caller.create({ name: "Org 2" });

      const list = await caller.list();

      expect(list).toHaveLength(2);
      expect(list.map((item) => item.org.name)).toContain("Org 1");
      expect(list.map((item) => item.org.name)).toContain("Org 2");
      expect(list.every((item) => item.role === Role.ADMIN)).toBe(true);
    });

    it("should only list orgs for the current user", async () => {
      const user1 = await createUser("user1@example.com", "User 1");
      const caller1 = createCaller(user1.id, user1.email!, user1.name!);
      await caller1.create({ name: "User 1 Org" });

      // Different user
      const user2 = await createUser("user2@example.com", "User 2");
      const caller2 = createCaller(user2.id, user2.email!, user2.name!);
      await caller2.create({ name: "User 2 Org" });

      const list1 = await caller1.list();
      const list2 = await caller2.list();

      expect(list1).toHaveLength(1);
      expect(list1[0]?.org.name).toBe("User 1 Org");

      expect(list2).toHaveLength(1);
      expect(list2[0]?.org.name).toBe("User 2 Org");
    });
  });
});
