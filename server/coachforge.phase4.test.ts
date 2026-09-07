import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user"): TrpcContext {
  return { user: { id: 9, openId: "phase4-test", email: "phase4@example.com", name: "Phase 4 Test", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("CoachForge calendar, notifications, and threads", () => {
  it("rejects invalid tracking ranges", async () => {
    await expect(appRouter.createCaller(contextFor("user")).tracking.range({ start: "2026-02-02", end: "2026-01-01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("keeps notification reads client-only", async () => {
    await expect(appRouter.createCaller(contextFor("admin")).tracking.notifications()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("keeps feedback edits trainer-only", async () => {
    await expect(appRouter.createCaller(contextFor("user")).tracking.editFeedback({ feedbackId: 1, body: "Updated" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
