import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user"): TrpcContext {
  return { user: { id: 8, openId: "phase3-test", email: "phase3@example.com", name: "Phase 3 Test", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("CoachForge trends and feedback", () => {
  it("keeps the feedback queue trainer-only", async () => {
    await expect(appRouter.createCaller(contextFor("user")).tracking.feedback()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("keeps feedback writing trainer-only", async () => {
    await expect(appRouter.createCaller(contextFor("user")).tracking.addFeedback({ clientUserId: 1, targetType: "checkIn", targetId: 1, body: "Keep going" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
