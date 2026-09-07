import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createClientInvite, ensureDemoData, acknowledgeClientDisclaimer, completeClientModule, getClientWorkspace, getTrainerDashboard, unlockModuleForClient, getDb, getInviteByToken, acceptClientInvite, createCourseWithModule, getTrainerCourses, addWorkoutLog, addWeightEntry, addFoodLog, addCheckIn, getTrackingSummary, getTrackingSummaryRange, addTrainerFeedback, editTrainerFeedback, getTrainerReviewQueue, getNotifications, markNotificationsRead } from "./db";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const marketingContent = { brand: "CoachForge", eyebrow: "Private coaching, built to move", headline: "Make your next rep feel inevitable.", subhead: "A focused coaching workspace for trainers who want less admin drag and clients who want a clearer path forward.", packages: [{ name: "Foundation", price: "By invitation", description: "A guided start with your trainer, one unlocked step at a time." }, { name: "Momentum", price: "Custom coaching", description: "A steady rhythm of programs, feedback, and visible progress." }] };
async function requireTrainer(user: { id: number; role: string }) { if (user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Trainer access required." }); }
async function requireClient(user: { role: string }) { if (user.role === "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Client account required." }); }

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  marketing: publicProcedure.query(() => marketingContent),
  demo: router({
    snapshot: publicProcedure.query(async () => { const seeded = await ensureDemoData(); if (!seeded) return { available: false, trainer: null, client: null, clientWorkspace: null, trainerDashboard: null }; return { available: true, trainer: seeded.trainer, client: seeded.client, clientWorkspace: await getClientWorkspace(seeded.client.id), trainerDashboard: await getTrainerDashboard(seeded.trainer.id) }; }),
    completeModule: publicProcedure.input(z.object({ moduleId: z.number() })).mutation(async ({ input }) => { const seeded = await ensureDemoData(); if (!seeded) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Demo database unavailable." }); await completeClientModule(seeded.client.id, input.moduleId); return { success: true }; }),
    unlockModule: publicProcedure.input(z.object({ moduleId: z.number() })).mutation(async ({ input }) => { const seeded = await ensureDemoData(); if (!seeded) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Demo database unavailable." }); await unlockModuleForClient(seeded.client.id, input.moduleId); return { success: true }; }),
  }),
  workspace: router({ me: protectedProcedure.query(async ({ ctx }) => ctx.user.role === "admin" ? { role: "trainer" as const, data: await getTrainerDashboard(ctx.user.id) } : { role: "client" as const, data: await getClientWorkspace(ctx.user.id) }) }),
  invites: router({
    preview: publicProcedure.input(z.object({ token: z.string().min(8) })).query(({ input }) => getInviteByToken(input.token)),
    accept: protectedProcedure.input(z.object({ token: z.string().min(8), goals: z.string().min(3), startingWeight: z.string().optional(), labsNote: z.string().optional() })).mutation(async ({ ctx, input }) => { await requireClient(ctx.user); const invite = await acceptClientInvite(input.token, ctx.user.id, input.goals, input.startingWeight, input.labsNote); if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite is invalid or already used." }); return { success: true, trainerUserId: invite.trainerUserId }; }),
  }),
  clientActions: router({
    acknowledgeDisclaimer: protectedProcedure.mutation(async ({ ctx }) => { await acknowledgeClientDisclaimer(ctx.user.id); return { success: true }; }),
    completeModule: protectedProcedure.input(z.object({ moduleId: z.number() })).mutation(async ({ ctx, input }) => { await requireClient(ctx.user); await completeClientModule(ctx.user.id, input.moduleId); return { success: true }; }),
  }),
  trainer: router({
    invite: protectedProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ ctx, input }) => { await requireTrainer(ctx.user); return createClientInvite(ctx.user.id, input.email, nanoid(24)); }),
    unlockModule: protectedProcedure.input(z.object({ clientUserId: z.number(), moduleId: z.number() })).mutation(async ({ ctx, input }) => { await requireTrainer(ctx.user); await unlockModuleForClient(input.clientUserId, input.moduleId); return { success: true }; }),
    pauseClient: protectedProcedure.input(z.object({ clientUserId: z.number(), status: z.enum(["active", "paused", "cancelled"]) })).mutation(async ({ ctx, input }) => { await requireTrainer(ctx.user); const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const { clientProfiles } = await import("../drizzle/schema"); await db.update(clientProfiles).set({ status: input.status, updatedAt: new Date() }).where(and(eq(clientProfiles.userId, input.clientUserId), eq(clientProfiles.trainerUserId, ctx.user.id))); return { success: true }; }),
    courses: protectedProcedure.query(async ({ ctx }) => { await requireTrainer(ctx.user); return getTrainerCourses(); }),
    createCourse: protectedProcedure.input(z.object({ title: z.string().min(3), description: z.string().min(3), moduleTitle: z.string().min(3), summary: z.string().min(3), durationMinutes: z.number().int().min(1).max(240) })).mutation(async ({ ctx, input }) => { await requireTrainer(ctx.user); const course = await createCourseWithModule(ctx.user.id, input.title, input.description, input.moduleTitle, input.summary, input.durationMinutes); return { success: Boolean(course), course }; }),
  }),
  tracking: router({
    summary: protectedProcedure.query(({ ctx }) => getTrackingSummary(ctx.user.id)),
    workout: protectedProcedure.input(z.object({ title: z.string().min(2), durationMinutes: z.number().int().min(1).max(600), notes: z.string().optional() })).mutation(async ({ ctx, input }) => { await requireClient(ctx.user); await addWorkoutLog(ctx.user.id, input.title, input.durationMinutes, input.notes); return { success: true }; }),
    weight: protectedProcedure.input(z.object({ weight: z.string().min(1), unit: z.enum(["kg", "lb"]) })).mutation(async ({ ctx, input }) => { await requireClient(ctx.user); await addWeightEntry(ctx.user.id, input.weight, input.unit); return { success: true }; }),
    food: protectedProcedure.input(z.object({ meal: z.string().min(2), calories: z.number().int().min(0).max(10000).optional(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => { await requireClient(ctx.user); await addFoodLog(ctx.user.id, input.meal, input.calories, input.notes); return { success: true }; }),
    checkIn: protectedProcedure.input(z.object({ mood: z.number().int().min(1).max(5), energy: z.number().int().min(1).max(5), wins: z.string().optional(), blockers: z.string().optional() })).mutation(async ({ ctx, input }) => { await requireClient(ctx.user); await addCheckIn(ctx.user.id, input.mood, input.energy, input.wins, input.blockers); return { success: true }; }),
    range: protectedProcedure.input(z.object({ start: z.string(), end: z.string() })).query(async ({ ctx, input }) => { await requireClient(ctx.user); const start = new Date(input.start); const end = new Date(input.end); if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date range." }); return getTrackingSummaryRange(ctx.user.id, start, end); }),
    notifications: protectedProcedure.query(async ({ ctx }) => { await requireClient(ctx.user); return getNotifications(ctx.user.id); }),
    markNotificationsRead: protectedProcedure.mutation(async ({ ctx }) => { await requireClient(ctx.user); await markNotificationsRead(ctx.user.id); return { success: true }; }),
    feedback: protectedProcedure.query(async ({ ctx }) => { await requireTrainer(ctx.user); return getTrainerReviewQueue(ctx.user.id); }),
    addFeedback: protectedProcedure.input(z.object({ clientUserId: z.number(), targetType: z.enum(["checkIn", "workout", "food"]), targetId: z.number(), body: z.string().min(2), parentId: z.number().optional() })).mutation(async ({ ctx, input }) => { await requireTrainer(ctx.user); await addTrainerFeedback(ctx.user.id, input.clientUserId, input.targetType, input.targetId, input.body, input.parentId); return { success: true }; }),
    editFeedback: protectedProcedure.input(z.object({ feedbackId: z.number(), body: z.string().min(2) })).mutation(async ({ ctx, input }) => { await requireTrainer(ctx.user); await editTrainerFeedback(ctx.user.id, input.feedbackId, input.body); return { success: true }; }),
  }),
});
export type AppRouter = typeof appRouter;
