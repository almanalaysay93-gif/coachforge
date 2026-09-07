import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import {
  ClientProfile,
  InsertUser,
  clientProfiles,
  courseAccess,
  courses,
  invites,
  moduleProgress,
  modules,
  users,
  checkIns,
  foodLogs,
  weightEntries,
  workoutLogs,
  trainerFeedback,
  notifications,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function ensureUser(openId: string, name: string, email: string, role: "admin" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(users).values({ openId, name, email, role, loginMethod: "demo" });
  const created = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!created[0]) throw new Error("Unable to create demo user");
  return created[0];
}

export async function ensureDemoData() {
  const db = await getDb();
  if (!db) return null;
  const trainer = await ensureUser("demo-trainer", "Jordan Blake", "jordan@coachforge.demo", "admin");
  const client = await ensureUser("demo-client", "Maya Chen", "maya@coachforge.demo", "user");

  const existingProfile = await db.select().from(clientProfiles).where(eq(clientProfiles.userId, client.id)).limit(1);
  if (!existingProfile[0]) {
    await db.insert(clientProfiles).values({
      userId: client.id,
      trainerUserId: trainer.id,
      goals: "Build consistent strength and feel more confident in the gym.",
      startingWeight: "68 kg",
      labsNote: "Optional intake note on file — visible to trainer only.",
      disclaimerAcknowledgedAt: new Date(),
    });
  }

  let course = (await db.select().from(courses).where(eq(courses.title, "Foundation: Stronger by Design")).limit(1))[0];
  if (!course) {
    await db.insert(courses).values({
      title: "Foundation: Stronger by Design",
      description: "A four-part starting system for building strength, confidence, and a repeatable training rhythm.",
      accent: "lime",
      status: "published",
    });
    course = (await db.select().from(courses).where(eq(courses.title, "Foundation: Stronger by Design")).limit(1))[0];
  }
  if (!course) throw new Error("Unable to create demo course");

  let courseModules = await db.select().from(modules).where(eq(modules.courseId, course.id)).orderBy(asc(modules.position));
  if (!courseModules.length) {
    await db.insert(modules).values([
      { courseId: course.id, position: 1, title: "Your baseline, made simple", summary: "Set your starting line and choose the smallest routine you can repeat.", contentType: "video", contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", durationMinutes: 8 },
      { courseId: course.id, position: 2, title: "The first training week", summary: "Turn intention into three focused sessions without overthinking it.", contentType: "reading", durationMinutes: 12 },
      { courseId: course.id, position: 3, title: "Progress you can feel", summary: "Learn the signals that matter before the scale or mirror catches up.", contentType: "reading", durationMinutes: 10 },
      { courseId: course.id, position: 4, title: "Build your next block", summary: "Use your first wins to shape the next step with your trainer.", contentType: "video", contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", durationMinutes: 14 },
    ]);
    courseModules = await db.select().from(modules).where(eq(modules.courseId, course.id)).orderBy(asc(modules.position));
  }

  const access = await db.select().from(courseAccess).where(and(eq(courseAccess.courseId, course.id), eq(courseAccess.clientUserId, client.id))).limit(1);
  if (!access[0]) await db.insert(courseAccess).values({ courseId: course.id, clientUserId: client.id, status: "active" });

  for (let index = 0; index < courseModules.length; index += 1) {
    const item = courseModules[index];
    if (!item) continue;
    const existing = await db.select().from(moduleProgress).where(and(eq(moduleProgress.moduleId, item.id), eq(moduleProgress.clientUserId, client.id))).limit(1);
    if (!existing[0]) {
      await db.insert(moduleProgress).values({ moduleId: item.id, clientUserId: client.id, status: index === 0 ? "unlocked" : "locked" });
    }
  }
  return { trainer, client, course, modules: courseModules };
}

export async function getClientWorkspace(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const profile = (await db.select().from(clientProfiles).where(eq(clientProfiles.userId, userId)).limit(1))[0] as ClientProfile | undefined;
  const accessRows = await db.select({ access: courseAccess, course: courses }).from(courseAccess).innerJoin(courses, eq(courseAccess.courseId, courses.id)).where(and(eq(courseAccess.clientUserId, userId), eq(courseAccess.status, "active"))).limit(20);
  const courseIds = accessRows.map((row) => row.course.id);
  const moduleRows = courseIds.length ? await db.select().from(modules).where(inArray(modules.courseId, courseIds)).orderBy(asc(modules.position)).limit(100) : [];
  const moduleIds = moduleRows.map((item) => item.id);
  const progressRows = moduleIds.length ? await db.select().from(moduleProgress).where(and(eq(moduleProgress.clientUserId, userId), inArray(moduleProgress.moduleId, moduleIds))).limit(100) : [];
  return { profile, courses: accessRows, modules: moduleRows, progress: progressRows };
}

export async function getTrainerDashboard(trainerUserId: number) {
  const db = await getDb();
  if (!db) return null;
  const clients = await db.select({ user: users, profile: clientProfiles }).from(clientProfiles).innerJoin(users, eq(clientProfiles.userId, users.id)).where(eq(clientProfiles.trainerUserId, trainerUserId)).orderBy(desc(clientProfiles.updatedAt)).limit(50);
  const courseRows = await db.select({ access: courseAccess, course: courses }).from(courseAccess).innerJoin(courses, eq(courseAccess.courseId, courses.id)).limit(50);
  const clientIds = clients.map((item) => item.user.id);
  const accessByClient = courseRows.filter((item) => clientIds.includes(item.access.clientUserId));
  const progressRows = clientIds.length ? await db.select().from(moduleProgress).where(inArray(moduleProgress.clientUserId, clientIds)).limit(200) : [];
  return { clients, access: accessByClient, progress: progressRows };
}

export async function acknowledgeClientDisclaimer(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(clientProfiles).set({ disclaimerAcknowledgedAt: new Date(), updatedAt: new Date() }).where(eq(clientProfiles.userId, userId));
}

export async function completeClientModule(userId: number, moduleId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(moduleProgress).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(and(eq(moduleProgress.clientUserId, userId), eq(moduleProgress.moduleId, moduleId), eq(moduleProgress.status, "unlocked")));
}

export async function unlockModuleForClient(clientUserId: number, moduleId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(moduleProgress).set({ status: "unlocked", updatedAt: new Date() }).where(and(eq(moduleProgress.clientUserId, clientUserId), eq(moduleProgress.moduleId, moduleId)));
}

export async function createClientInvite(trainerUserId: number, email: string, token: string) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(invites).values({ trainerUserId, email, token });
  const created = await db.select().from(invites).where(eq(invites.token, token)).limit(1);
  return created[0] ?? null;
}

export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(invites).where(and(eq(invites.token, token), eq(invites.status, "pending"))).limit(1);
  return result[0] ?? null;
}

export async function acceptClientInvite(token: string, userId: number, goals: string, startingWeight?: string, labsNote?: string) {
  const db = await getDb();
  if (!db) return null;
  const invite = await getInviteByToken(token);
  if (!invite) return null;
  await db.insert(clientProfiles).values({ userId, trainerUserId: invite.trainerUserId, goals, startingWeight, labsNote });
  await db.update(invites).set({ status: "accepted", acceptedAt: new Date() }).where(eq(invites.id, invite.id));
  return invite;
}

export async function createCourseWithModule(trainerUserId: number, title: string, description: string, moduleTitle: string, summary: string, durationMinutes: number) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(courses).values({ title, description, status: "draft", accent: "lime" });
  const course = (await db.select().from(courses).where(eq(courses.title, title)).orderBy(desc(courses.id)).limit(1))[0];
  if (!course) return null;
  await db.insert(modules).values({ courseId: course.id, position: 1, title: moduleTitle, summary, durationMinutes, contentType: "reading" });
  return course;
}

export async function getTrainerCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).orderBy(desc(courses.updatedAt)).limit(50);
}

export async function addWorkoutLog(clientUserId: number, title: string, durationMinutes: number, notes?: string) {
  const db = await getDb(); if (!db) return;
  await db.insert(workoutLogs).values({ clientUserId, title, durationMinutes, notes });
}
export async function addWeightEntry(clientUserId: number, weight: string, unit: string) {
  const db = await getDb(); if (!db) return;
  await db.insert(weightEntries).values({ clientUserId, weight, unit });
}
export async function addFoodLog(clientUserId: number, meal: string, calories?: number, notes?: string) {
  const db = await getDb(); if (!db) return;
  await db.insert(foodLogs).values({ clientUserId, meal, calories, notes });
}
export async function addCheckIn(clientUserId: number, mood: number, energy: number, wins?: string, blockers?: string) {
  const db = await getDb(); if (!db) return;
  await db.insert(checkIns).values({ clientUserId, mood, energy, wins, blockers });
}
export async function getTrackingSummary(clientUserId: number) {
  const db = await getDb(); if (!db) return { workouts: [], weights: [], food: [], checkIns: [] };
  return {
    workouts: await db.select().from(workoutLogs).where(eq(workoutLogs.clientUserId, clientUserId)).orderBy(desc(workoutLogs.loggedAt)).limit(20),
    weights: await db.select().from(weightEntries).where(eq(weightEntries.clientUserId, clientUserId)).orderBy(desc(weightEntries.loggedAt)).limit(20),
    food: await db.select().from(foodLogs).where(eq(foodLogs.clientUserId, clientUserId)).orderBy(desc(foodLogs.loggedAt)).limit(20),
    checkIns: await db.select().from(checkIns).where(eq(checkIns.clientUserId, clientUserId)).orderBy(desc(checkIns.submittedAt)).limit(20),
    feedback: await db.select().from(trainerFeedback).where(eq(trainerFeedback.clientUserId, clientUserId)).orderBy(desc(trainerFeedback.createdAt)).limit(50),
  };
}

export async function addTrainerFeedback(trainerUserId: number, clientUserId: number, targetType: "checkIn" | "workout" | "food", targetId: number, body: string, parentId?: number) {
  const db = await getDb(); if (!db) return;
  await db.insert(trainerFeedback).values({ trainerUserId, clientUserId, targetType, targetId, body, parentId });
  await db.insert(notifications).values({ userId: clientUserId, kind: "trainer_feedback", title: "New trainer feedback", body });
}

export async function editTrainerFeedback(trainerUserId: number, feedbackId: number, body: string) {
  const db = await getDb(); if (!db) return;
  await db.update(trainerFeedback).set({ body, editedAt: new Date() }).where(and(eq(trainerFeedback.id, feedbackId), eq(trainerFeedback.trainerUserId, trainerUserId)));
}

export async function getNotifications(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationsRead(userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function getTrainerReviewQueue(trainerUserId: number) {
  const db = await getDb(); if (!db) return { clients: [], checkIns: [], workouts: [], food: [], feedback: [] };
  const clientRows = await db.select({ user: users, profile: clientProfiles }).from(clientProfiles).innerJoin(users, eq(clientProfiles.userId, users.id)).where(eq(clientProfiles.trainerUserId, trainerUserId)).limit(50);
  const clientIds = clientRows.map((row) => row.user.id);
  if (!clientIds.length) return { clients: [], checkIns: [], workouts: [], food: [], feedback: [] };
  return {
    clients: clientRows,
    checkIns: await db.select().from(checkIns).where(inArray(checkIns.clientUserId, clientIds)).orderBy(desc(checkIns.submittedAt)).limit(50),
    workouts: await db.select().from(workoutLogs).where(inArray(workoutLogs.clientUserId, clientIds)).orderBy(desc(workoutLogs.loggedAt)).limit(50),
    food: await db.select().from(foodLogs).where(inArray(foodLogs.clientUserId, clientIds)).orderBy(desc(foodLogs.loggedAt)).limit(50),
    feedback: await db.select().from(trainerFeedback).where(eq(trainerFeedback.trainerUserId, trainerUserId)).orderBy(desc(trainerFeedback.createdAt)).limit(100),
  };
}

export async function getTrackingSummaryRange(clientUserId: number, start: Date, end: Date) {
  const db = await getDb(); if (!db) return { workouts: [], weights: [], food: [], checkIns: [], feedback: [] };
  return {
    workouts: await db.select().from(workoutLogs).where(and(eq(workoutLogs.clientUserId, clientUserId), gte(workoutLogs.loggedAt, start), lte(workoutLogs.loggedAt, end))).orderBy(asc(workoutLogs.loggedAt)).limit(200),
    weights: await db.select().from(weightEntries).where(and(eq(weightEntries.clientUserId, clientUserId), gte(weightEntries.loggedAt, start), lte(weightEntries.loggedAt, end))).orderBy(asc(weightEntries.loggedAt)).limit(200),
    food: await db.select().from(foodLogs).where(and(eq(foodLogs.clientUserId, clientUserId), gte(foodLogs.loggedAt, start), lte(foodLogs.loggedAt, end))).orderBy(asc(foodLogs.loggedAt)).limit(200),
    checkIns: await db.select().from(checkIns).where(and(eq(checkIns.clientUserId, clientUserId), gte(checkIns.submittedAt, start), lte(checkIns.submittedAt, end))).orderBy(asc(checkIns.submittedAt)).limit(200),
    feedback: await db.select().from(trainerFeedback).where(and(eq(trainerFeedback.clientUserId, clientUserId), gte(trainerFeedback.createdAt, start), lte(trainerFeedback.createdAt, end))).orderBy(asc(trainerFeedback.createdAt)).limit(200),
  };
}
