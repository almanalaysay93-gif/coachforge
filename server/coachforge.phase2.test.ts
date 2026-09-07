import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user"): TrpcContext {
  return { user: { id: 7, openId: "phase2-test", email: "phase2@example.com", name: "Phase 2 Test", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("CoachForge Phase 2 boundaries", () => {
  it("blocks clients from creating courses", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.trainer.createCourse({ title: "Test course", description: "A test", moduleTitle: "Start", summary: "Start here", durationMinutes: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("blocks trainers from creating client tracking entries", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));
    await expect(caller.tracking.workout({ title: "Test workout", durationMinutes: 30 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.tracking.weight({ weight: "70", unit: "kg" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
