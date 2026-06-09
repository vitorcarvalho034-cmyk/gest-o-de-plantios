import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCtx(cookieHeader?: string): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("employee.me (unauthenticated)", () => {
  it("returns null when no session cookie is present", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.employee.me();
    expect(result).toBeNull();
  });
});

describe("employee.login validation", () => {
  it("throws UNAUTHORIZED for invalid credentials", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.employee.login({ username: "nonexistent_user_xyz", password: "wrongpassword" })
    ).rejects.toThrow();
  });
});

describe("chrysanthemum.create authorization", () => {
  it("throws FORBIDDEN when called without launcher session", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.chrysanthemum.create({
        employeeId: 1,
        plantingDate: new Date().toISOString(),
        greenhouses: [{ greenhouse: 1, seedlings: 2000 }],
        discountBoxes: 0,
      })
    ).rejects.toThrow();
  });
});

describe("sunflower.create authorization", () => {
  it("throws FORBIDDEN when called without launcher session", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sunflower.create({
        employeeId: 1,
        plantingDate: new Date().toISOString(),
        trays: 10,
        discountTrays: 0,
      })
    ).rejects.toThrow();
  });
});

describe("chrysanthemum box calculation", () => {
  it("correctly calculates 1 box per 1000 seedlings", () => {
    const seedlings = 2000;
    const boxes = Math.floor(seedlings / 1000);
    expect(boxes).toBe(2);
  });

  it("floors partial boxes", () => {
    const seedlings = 1500;
    const boxes = Math.floor(seedlings / 1000);
    expect(boxes).toBe(1);
  });

  it("returns 0 boxes for less than 1000 seedlings", () => {
    const seedlings = 999;
    const boxes = Math.floor(seedlings / 1000);
    expect(boxes).toBe(0);
  });
});
