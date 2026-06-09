import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const employeeRoleEnum = pgEnum("employee_role", ["employee", "launcher", "admin"]);
export const sessionStatusEnum = pgEnum("session_status", ["open", "closed", "divergent"]);
export const confirmStatusEnum = pgEnum("confirm_status", ["pending", "confirmed", "rejected"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Funcionários pré-cadastrados com login por username/senha
 */
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  role: employeeRoleEnum("role").default("employee").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Sessão de plantio de Crisântemo
 */
export const plantingSessions = pgTable("planting_sessions", {
  id: serial("id").primaryKey(),
  plantingDate: timestamp("plantingDate").notNull(),
  greenhouses: json("greenhouses").notNull(),
  totalSeedlingsSent: integer("totalSeedlingsSent").notNull(),
  totalSeedlingsPlanted: integer("totalSeedlingsPlanted").default(0).notNull(),
  status: sessionStatusEnum("status").default("open").notNull(),
  closeNote: text("closeNote"),
  openedById: integer("openedById").notNull(),
  closedById: integer("closedById"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PlantingSession = typeof plantingSessions.$inferSelect;
export type InsertPlantingSession = typeof plantingSessions.$inferInsert;

/**
 * Lançamentos de plantio de Crisântemo
 */
export const chrysanthemumPlantings = pgTable("chrysanthemum_plantings", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId"),
  employeeId: integer("employeeId").notNull(),
  plantingDate: timestamp("plantingDate").notNull(),
  greenhouses: json("greenhouses").notNull(),
  totalSeedlingsSent: integer("totalSeedlingsSent").default(0).notNull(),
  totalSeedlings: integer("totalSeedlings").notNull(),
  totalBoxes: integer("totalBoxes").notNull(),
  discountBoxes: integer("discountBoxes").default(0).notNull(),
  discountReason: text("discountReason"),
  absenceReason: text("absenceReason"),
  launchedById: integer("launchedById").notNull(),
  confirmStatus: confirmStatusEnum("confirmStatus").default("pending").notNull(),
  confirmRejectionReason: text("confirmRejectionReason"),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChrysanthemumPlanting = typeof chrysanthemumPlantings.$inferSelect;
export type InsertChrysanthemumPlanting = typeof chrysanthemumPlantings.$inferInsert;

/**
 * Lançamentos de plantio de Girassol
 */
export const sunflowerPlantings = pgTable("sunflower_plantings", {
  id: serial("id").primaryKey(),
  employeeId: integer("employeeId").notNull(),
  plantingDate: timestamp("plantingDate").notNull(),
  trays: integer("trays").notNull(),
  discountTrays: integer("discountTrays").default(0).notNull(),
  discountReason: text("discountReason"),
  absenceReason: text("absenceReason"),
  launchedById: integer("launchedById").notNull(),
  confirmStatus: confirmStatusEnum("confirmStatus").default("pending").notNull(),
  confirmRejectionReason: text("confirmRejectionReason"),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SunflowerPlanting = typeof sunflowerPlantings.$inferSelect;
export type InsertSunflowerPlanting = typeof sunflowerPlantings.$inferInsert;
