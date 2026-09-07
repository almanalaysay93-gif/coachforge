import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "phase1-test",
      email: "phase1@example.com",
      name: "Phase 1 Test",
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("CoachForge Phase 1", () => {
  it("exposes the approved public marketing content", async () => {
    const result = await appRouter.createCaller(contextFor("user")).marketing();
    expect(result.brand).toBe("CoachForge");
    expect(result.packages).toHaveLength(2);
    expect(result.subhead).toContain("coaching workspace");
  });

  it("blocks client users from trainer-only invite creation", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.trainer.invite({ email: "client@example.com" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
