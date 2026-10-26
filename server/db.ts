import { and, desc, eq, gte, lte, not, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import {
  chrysanthemumPlantings,
  employees,
  InsertChrysanthemumPlanting,
  InsertEmployee,
  InsertPlantingSession,
  InsertSunflowerPlanting,
  InsertUser,
  plantingSessions,
  sunflowerPlantings,
  users,
} from "../drizzle/schema";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  const sql = neon(url);
  return drizzle(sql);
}

// ─── Users (OAuth) ────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
  if (existing.length > 0) {
    await db.update(users).set({ ...user, updatedAt: new Date() }).where(eq(users.openId, user.openId));
  } else {
    await db.insert(users).values({ ...user, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() });
  }
}

export async function getUserByOpenId(openId: string) {
  const db = getDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Employees ────────────────────────────────────────────────────────────────

export async function createEmployee(data: InsertEmployee) {
  const db = getDb();
  await db.insert(employees).values(data);
}

export async function getEmployeeByUsername(username: string) {
  const db = getDb();
  const result = await db.select().from(employees).where(eq(employees.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEmployeeById(id: number) {
  const db = getDb();
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllEmployees() {
  const db = getDb();
  return db.select().from(employees).where(eq(employees.active, true));
}

// ─── Chrysanthemum Plantings ──────────────────────────────────────────────────

export async function createChrysanthemumPlanting(data: InsertChrysanthemumPlanting) {
  const db = getDb();
  const result = await db.insert(chrysanthemumPlantings).values(data).returning({ id: chrysanthemumPlantings.id });
  return result[0];
}

export async function getChrysanthemumPlantingsByEmployee(
  employeeId: number,
  from?: Date,
  to?: Date
) {
  const db = getDb();
  const conditions = [eq(chrysanthemumPlantings.employeeId, employeeId)];
  if (from) conditions.push(gte(chrysanthemumPlantings.plantingDate, from));
  if (to) conditions.push(lte(chrysanthemumPlantings.plantingDate, to));
  return db
    .select()
    .from(chrysanthemumPlantings)
    .where(and(...conditions))
    .orderBy(desc(chrysanthemumPlantings.plantingDate));
}

export async function getAllChrysanthemumPlantings(from?: Date, to?: Date) {
  const db = getDb();
  const conditions = [];
  if (from) conditions.push(gte(chrysanthemumPlantings.plantingDate, from));
  if (to) conditions.push(lte(chrysanthemumPlantings.plantingDate, to));
  const query = db
    .select()
    .from(chrysanthemumPlantings)
    .orderBy(desc(chrysanthemumPlantings.plantingDate));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

// ─── Sunflower Plantings ──────────────────────────────────────────────────────

export async function createSunflowerPlanting(data: InsertSunflowerPlanting) {
  const db = getDb();
  await db.insert(sunflowerPlantings).values(data);
}

export async function getSunflowerPlantingsByEmployee(
  employeeId: number,
  from?: Date,
  to?: Date
) {
  const db = getDb();
  const conditions = [eq(sunflowerPlantings.employeeId, employeeId)];
  if (from) conditions.push(gte(sunflowerPlantings.plantingDate, from));
  if (to) conditions.push(lte(sunflowerPlantings.plantingDate, to));
  return db
    .select()
    .from(sunflowerPlantings)
    .where(and(...conditions))
    .orderBy(desc(sunflowerPlantings.plantingDate));
}

export async function getAllSunflowerPlantings(from?: Date, to?: Date) {
  const db = getDb();
  const conditions = [];
  if (from) conditions.push(gte(sunflowerPlantings.plantingDate, from));
  if (to) conditions.push(lte(sunflowerPlantings.plantingDate, to));
  const query = db
    .select()
    .from(sunflowerPlantings)
    .orderBy(desc(sunflowerPlantings.plantingDate));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

// ─── Planting Sessions ───────────────────────────────────────────────────────

export async function createPlantingSession(data: InsertPlantingSession) {
  const db = getDb();
  const result = await db.insert(plantingSessions).values(data).returning({ id: plantingSessions.id });
  return result[0];
}

export async function getPlantingSessionById(id: number) {
  const db = getDb();
  const result = await db.select().from(plantingSessions).where(eq(plantingSessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePlantingSessionDetails(
  id: number,
  data: {
    plantingDate: Date;
    greenhouses: { greenhouse: number; seedlingsSent: number }[];
    totalSeedlingsSent: number;
    updatedById: number;
  }
) {
  const db = getDb();
  const balanced = sql`${plantingSessions.totalSeedlingsPlanted} = ${data.totalSeedlingsSent}`;
  await db.update(plantingSessions).set({
    plantingDate: data.plantingDate,
    greenhouses: data.greenhouses,
    totalSeedlingsSent: data.totalSeedlingsSent,
    status: sql`CASE
      WHEN ${plantingSessions.status} = 'open' THEN 'open'::session_status
      WHEN ${balanced} THEN 'closed'::session_status
      ELSE 'divergent'::session_status
    END`,
    closedAt: sql`CASE WHEN ${plantingSessions.status} <> 'open' AND ${balanced} THEN now() ELSE NULL END`,
    closedById: sql`CASE WHEN ${plantingSessions.status} <> 'open' AND ${balanced} THEN ${data.updatedById} ELSE NULL END`,
    closeNote: null,
  }).where(eq(plantingSessions.id, id));
  await db.update(chrysanthemumPlantings)
    .set({ plantingDate: data.plantingDate })
    .where(eq(chrysanthemumPlantings.sessionId, id));
}

export async function deletePlantingSessionAndPlantings(id: number) {
  const db = getDb();
  const linked = await getChrysanthemumPlantingsBySession(id);
  await db.execute(sql`
    WITH deleted_plantings AS (
      DELETE FROM ${chrysanthemumPlantings}
      WHERE ${chrysanthemumPlantings.sessionId} = ${id}
      RETURNING ${chrysanthemumPlantings.id}
    ), deleted_session AS (
      DELETE FROM ${plantingSessions}
      WHERE ${plantingSessions.id} = ${id}
      RETURNING ${plantingSessions.id}
    )
    SELECT
      (SELECT COUNT(*) FROM deleted_plantings) AS deleted_plantings,
      (SELECT COUNT(*) FROM deleted_session) AS deleted_session
  `);
  return linked.length;
}

export async function getOpenPlantingSessions() {
  const db = getDb();
  return db.select().from(plantingSessions)
    .where(eq(plantingSessions.status, "open"))
    .orderBy(desc(plantingSessions.createdAt));
}

export async function getAllPlantingSessions(from?: Date, to?: Date) {
  const db = getDb();
  const conditions: any[] = [];
  if (from) conditions.push(gte(plantingSessions.plantingDate, from));
  if (to) conditions.push(lte(plantingSessions.plantingDate, to));
  const query = db.select().from(plantingSessions).orderBy(desc(plantingSessions.plantingDate));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function adjustSessionPlantedTotal(
  sessionId: number,
  deltaSeedlings: number,
  updatedById: number,
  requireOpen = false
) {
  const db = getDb();
  const nextTotal = sql`${plantingSessions.totalSeedlingsPlanted} + ${deltaSeedlings}`;
  const nextStatus = sql`CASE
    WHEN ${plantingSessions.status} = 'open' THEN 'open'::session_status
    WHEN ${nextTotal} = ${plantingSessions.totalSeedlingsSent} THEN 'closed'::session_status
    ELSE 'divergent'::session_status
  END`;
  const updated = await db.update(plantingSessions)
    .set({
      totalSeedlingsPlanted: nextTotal,
      status: nextStatus,
      closedAt: sql`CASE
        WHEN ${plantingSessions.status} = 'open' THEN ${plantingSessions.closedAt}
        WHEN ${nextStatus} = 'closed'::session_status THEN now()
        ELSE NULL
      END`,
      closedById: sql`CASE
        WHEN ${plantingSessions.status} = 'open' THEN ${plantingSessions.closedById}
        WHEN ${nextStatus} = 'closed'::session_status THEN ${updatedById}
        ELSE NULL
      END`,
      closeNote: sql`CASE WHEN ${plantingSessions.status} = 'open' THEN ${plantingSessions.closeNote} ELSE NULL END`,
    })
    .where(and(
      eq(plantingSessions.id, sessionId),
      ...(requireOpen ? [eq(plantingSessions.status, "open" as const)] : [])
    ))
    .returning({
      totalSeedlingsPlanted: plantingSessions.totalSeedlingsPlanted,
      totalSeedlingsSent: plantingSessions.totalSeedlingsSent,
      status: plantingSessions.status,
    });
  return updated[0];
}

export async function closePlantingSession(
  sessionId: number,
  closedById: number,
  status: "closed" | "divergent",
  closeNote?: string
) {
  const db = getDb();
  const updated = await db.update(plantingSessions)
    .set({ status, closedById, closedAt: new Date(), closeNote: closeNote ?? null })
    .where(and(
      eq(plantingSessions.id, sessionId),
      eq(plantingSessions.status, "open"),
      eq(plantingSessions.totalSeedlingsSent, plantingSessions.totalSeedlingsPlanted)
    ))
    .returning({ id: plantingSessions.id });
  return updated[0];
}

export async function getChrysanthemumPlantingsBySession(sessionId: number) {
  const db = getDb();
  return db.select().from(chrysanthemumPlantings)
    .where(eq(chrysanthemumPlantings.sessionId, sessionId))
    .orderBy(desc(chrysanthemumPlantings.createdAt));
}

export async function getChrysanthemumPlantingBySessionEmployee(sessionId: number, employeeId: number) {
  const db = getDb();
  const result = await db.select({ id: chrysanthemumPlantings.id })
    .from(chrysanthemumPlantings)
    .where(and(
      eq(chrysanthemumPlantings.sessionId, sessionId),
      eq(chrysanthemumPlantings.employeeId, employeeId)
    ))
    .limit(1);
  return result[0];
}

export async function getChrysanthemumPlantingById(id: number) {
  const db = getDb();
  const result = await db.select().from(chrysanthemumPlantings)
    .where(eq(chrysanthemumPlantings.id, id)).limit(1);
  return result[0];
}

export async function updateChrysanthemumPlantingRecord(
  id: number,
  data: {
    employeeId: number;
    plantingDate: Date;
    greenhouses: { greenhouse: number; seedlingsSent?: number; seedlings: number }[];
    totalSeedlings: number;
    totalSeedlingsSent: number;
    totalBoxes: number;
    discountBoxes: number;
    discountReason?: string | null;
    absenceReason?: string | null;
  }
) {
  const db = getDb();
  await db.update(chrysanthemumPlantings).set({
    ...data,
    discountReason: data.discountReason ?? null,
    absenceReason: data.absenceReason ?? null,
    confirmStatus: "pending",
    confirmRejectionReason: null,
    confirmedAt: null,
  }).where(eq(chrysanthemumPlantings.id, id));
}

export async function deleteChrysanthemumPlantingRecord(id: number) {
  const db = getDb();
  const deleted = await db.delete(chrysanthemumPlantings)
    .where(eq(chrysanthemumPlantings.id, id))
    .returning({ sessionId: chrysanthemumPlantings.sessionId, totalSeedlings: chrysanthemumPlantings.totalSeedlings });
  return deleted[0];
}

export async function getSunflowerPlantingById(id: number) {
  const db = getDb();
  const result = await db.select().from(sunflowerPlantings)
    .where(eq(sunflowerPlantings.id, id)).limit(1);
  return result[0];
}

export async function updateSunflowerPlantingRecord(
  id: number,
  data: {
    employeeId: number;
    plantingDate: Date;
    trays: number;
    discountTrays: number;
    discountReason?: string | null;
    absenceReason?: string | null;
  }
) {
  const db = getDb();
  await db.update(sunflowerPlantings).set({
    ...data,
    discountReason: data.discountReason ?? null,
    absenceReason: data.absenceReason ?? null,
    confirmStatus: "pending",
    confirmRejectionReason: null,
    confirmedAt: null,
  }).where(eq(sunflowerPlantings.id, id));
}

export async function deleteSunflowerPlantingRecord(id: number) {
  const db = getDb();
  await db.delete(sunflowerPlantings).where(eq(sunflowerPlantings.id, id));
}

// ─── Confirmation helpers ─────────────────────────────────────────────────────

export async function confirmChrysanthemumPlanting(id: number, employeeId: number) {
  const db = getDb();
  await db
    .update(chrysanthemumPlantings)
    .set({ confirmStatus: "confirmed", confirmedAt: new Date() })
    .where(and(eq(chrysanthemumPlantings.id, id), eq(chrysanthemumPlantings.employeeId, employeeId)));
}

export async function rejectChrysanthemumPlanting(id: number, employeeId: number, reason: string) {
  const db = getDb();
  await db
    .update(chrysanthemumPlantings)
    .set({ confirmStatus: "rejected", confirmRejectionReason: reason, confirmedAt: new Date() })
    .where(and(eq(chrysanthemumPlantings.id, id), eq(chrysanthemumPlantings.employeeId, employeeId)));
}

export async function confirmSunflowerPlanting(id: number, employeeId: number) {
  const db = getDb();
  await db
    .update(sunflowerPlantings)
    .set({ confirmStatus: "confirmed", confirmedAt: new Date() })
    .where(and(eq(sunflowerPlantings.id, id), eq(sunflowerPlantings.employeeId, employeeId)));
}

export async function rejectSunflowerPlanting(id: number, employeeId: number, reason: string) {
  const db = getDb();
  await db
    .update(sunflowerPlantings)
    .set({ confirmStatus: "rejected", confirmRejectionReason: reason, confirmedAt: new Date() })
    .where(and(eq(sunflowerPlantings.id, id), eq(sunflowerPlantings.employeeId, employeeId)));
}

// ─── User Management (Admin) ──────────────────────────────────────────────────

export async function getAllEmployeesAdmin() {
  const db = getDb();
  return db.select({
    id: employees.id,
    name: employees.name,
    username: employees.username,
    role: employees.role,
    active: employees.active,
    createdAt: employees.createdAt,
  }).from(employees).orderBy(employees.name);
}

export async function updateEmployee(
  id: number,
  data: { name?: string; username?: string; passwordHash?: string; role?: "employee" | "launcher" | "admin"; active?: boolean }
) {
  const db = getDb();
  await db.update(employees).set(data).where(eq(employees.id, id));
}

export async function getEmployeeByUsernameExcluding(username: string, excludeId: number) {
  const db = getDb();
  const result = await db.select().from(employees)
    .where(and(eq(employees.username, username), not(eq(employees.id, excludeId))))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Edit Rejected Plantings (Launcher) ──────────────────────────────────────

export async function getRejectedChrysanthemumPlantings() {
  const db = getDb();
  return db.select().from(chrysanthemumPlantings)
    .where(eq(chrysanthemumPlantings.confirmStatus, "rejected"))
    .orderBy(desc(chrysanthemumPlantings.createdAt));
}

export async function getRejectedSunflowerPlantings() {
  const db = getDb();
  return db.select().from(sunflowerPlantings)
    .where(eq(sunflowerPlantings.confirmStatus, "rejected"))
    .orderBy(desc(sunflowerPlantings.createdAt));
}

export async function editChrysanthemumPlanting(
  id: number,
  data: {
    greenhouses: { greenhouse: number; seedlingsSent: number; seedlings: number }[];
    totalSeedlings: number;
    totalSeedlingsSent: number;
    totalBoxes: number;
    discountBoxes: number;
    discountReason?: string;
    absenceReason?: string;
  }
) {
  const db = getDb();
  await db.update(chrysanthemumPlantings)
    .set({
      ...data,
      discountReason: data.discountReason ?? null,
      absenceReason: data.absenceReason ?? null,
      confirmStatus: "pending",
      confirmRejectionReason: null,
      confirmedAt: null,
    })
    .where(eq(chrysanthemumPlantings.id, id));
}

export async function editSunflowerPlanting(
  id: number,
  data: {
    trays: number;
    discountTrays: number;
    discountReason?: string;
    absenceReason?: string;
  }
) {
  const db = getDb();
  await db.update(sunflowerPlantings)
    .set({
      ...data,
      discountReason: data.discountReason ?? null,
      absenceReason: data.absenceReason ?? null,
      confirmStatus: "pending",
      confirmRejectionReason: null,
      confirmedAt: null,
    })
    .where(eq(sunflowerPlantings.id, id));
}
