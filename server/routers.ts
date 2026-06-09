import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { z } from "zod";
import {
  closePlantingSession,
  confirmChrysanthemumPlanting,
  confirmSunflowerPlanting,
  createChrysanthemumPlanting,
  createEmployee,
  createPlantingSession,
  createSunflowerPlanting,
  editChrysanthemumPlanting,
  editSunflowerPlanting,
  getAllChrysanthemumPlantings,
  getAllEmployees,
  getAllEmployeesAdmin,
  getAllPlantingSessions,
  getAllSunflowerPlantings,
  getChrysanthemumPlantingsByEmployee,
  getChrysanthemumPlantingsBySession,
  getEmployeeById,
  getEmployeeByUsername,
  getEmployeeByUsernameExcluding,
  getOpenPlantingSessions,
  getPlantingSessionById,
  getRejectedChrysanthemumPlantings,
  getRejectedSunflowerPlantings,
  getSunflowerPlantingsByEmployee,
  rejectChrysanthemumPlanting,
  rejectSunflowerPlanting,
  updateEmployee,
  updateSessionPlanted,
} from "./db";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const EMP_COOKIE = "emp_session";
const JWT_SECRET = process.env.JWT_SECRET ?? "fallback-secret-change-me";

async function signEmployeeToken(employeeId: number, role: string) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({ sub: String(employeeId), role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

async function verifyEmployeeToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as { sub: string; role: string };
  } catch {
    return null;
  }
}

async function getEmployeeFromCtx(ctx: { req: { headers: Record<string, string | string[] | undefined> } }) {
  const cookieHeader = ctx.req.headers["cookie"] as string | undefined;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${EMP_COOKIE}=([^;]+)`));
  if (!match) return null;
  const payload = await verifyEmployeeToken(match[1]);
  if (!payload) return null;
  return getEmployeeById(Number(payload.sub));
}

// Schemas compartilhados
const GreenhouseEntrySchema = z.object({
  greenhouse: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  seedlingsSent: z.number().int().min(0).default(0),
  seedlings: z.number().int().min(0).default(0),
});

const GreenhouseSentSchema = z.object({
  greenhouse: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  seedlingsSent: z.number().int().positive(),
});

// ─── Session Router ──────────────────────────────────────────────────────────
const sessionRouter = router({
  open: publicProcedure
    .input(z.object({
      plantingDate: z.string(),
      greenhouses: z.array(GreenhouseSentSchema).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const launcher = await getEmployeeFromCtx(ctx);
      if (!launcher || (launcher.role !== "launcher" && launcher.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas lançadores podem abrir sessões" });
      }
      const totalSent = input.greenhouses.reduce((s, g) => s + g.seedlingsSent, 0);
      await createPlantingSession({
        plantingDate: new Date(input.plantingDate),
        greenhouses: input.greenhouses,
        totalSeedlingsSent: totalSent,
        totalSeedlingsPlanted: 0,
        openedById: launcher.id,
      });
      const sessions = await getOpenPlantingSessions();
      const newest = sessions[0];
      return { success: true, sessionId: newest?.id ?? null };
    }),

  listOpen: publicProcedure.query(async ({ ctx }) => {
    const emp = await getEmployeeFromCtx(ctx);
    if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getOpenPlantingSessions();
  }),

  listAll: publicProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllPlantingSessions(
        input.from ? new Date(input.from) : undefined,
        input.to ? new Date(input.to) : undefined
      );
    }),

  getWithPlantings: publicProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const session = await getPlantingSessionById(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const plantings = await getChrysanthemumPlantingsBySession(input.sessionId);
      const allEmps = await getAllEmployees();
      const empMap = new Map(allEmps.map((e) => [e.id, e.name]));
      const plantingsWithNames = plantings.map((p) => ({
        ...p,
        employeeName: empMap.get(p.employeeId) ?? "Desconhecido",
      }));
      return { session, plantings: plantingsWithNames };
    }),

  addPlanting: publicProcedure
    .input(z.object({
      sessionId: z.number().int().positive(),
      employeeId: z.number().int().positive(),
      greenhouses: z.array(GreenhouseEntrySchema).min(1),
      discountBoxes: z.number().int().min(0).default(0),
      discountReason: z.string().optional(),
      absenceReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const launcher = await getEmployeeFromCtx(ctx);
      if (!launcher || (launcher.role !== "launcher" && launcher.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const session = await getPlantingSessionById(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      if (session.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "Sessão já encerrada" });

      const totalSeedlings = input.greenhouses.reduce((s, g) => s + g.seedlings, 0);
      const totalBoxes = Math.floor(totalSeedlings / 1000);

      await createChrysanthemumPlanting({
        sessionId: input.sessionId,
        employeeId: input.employeeId,
        plantingDate: session.plantingDate,
        greenhouses: input.greenhouses,
        totalSeedlingsSent: 0,
        totalSeedlings,
        totalBoxes,
        discountBoxes: input.discountBoxes,
        discountReason: input.discountReason ?? null,
        absenceReason: input.absenceReason ?? null,
        launchedById: launcher.id,
      });

      const allPlantings = await getChrysanthemumPlantingsBySession(input.sessionId);
      const newTotal = allPlantings.reduce((s, p) => s + p.totalSeedlings, 0);
      await updateSessionPlanted(input.sessionId, newTotal);

      const diff = session.totalSeedlingsSent - newTotal;
      return {
        success: true,
        totalBoxes,
        totalSeedlings,
        sessionTotal: newTotal,
        sessionSent: session.totalSeedlingsSent,
        diff,
        balanced: diff === 0,
      };
    }),

  close: publicProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const launcher = await getEmployeeFromCtx(ctx);
      if (!launcher || (launcher.role !== "launcher" && launcher.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const session = await getPlantingSessionById(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "Sessão já encerrada" });

      const diff = session.totalSeedlingsSent - session.totalSeedlingsPlanted;
      if (diff !== 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: diff > 0
            ? `Não é possível fechar: faltam ${diff.toLocaleString("pt-BR")} mudas plantadas (${Math.floor(diff / 1000)} caixas). Registre todos os funcionários antes de fechar.`
            : `Não é possível fechar: foram plantadas ${Math.abs(diff).toLocaleString("pt-BR")} mudas a mais que o enviado. Verifique os lançamentos.`,
        });
      }

      await closePlantingSession(input.sessionId, launcher.id, "closed", undefined);
      return { success: true, status: "closed", diff: 0 };
    }),
});

// ─── Reconciliation ───────────────────────────────────────────────────────────
const reconciliationRouter = router({
  bySession: publicProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      const sessions = await getAllPlantingSessions(
        input.from ? new Date(input.from) : undefined,
        input.to ? new Date(input.to) : undefined
      );

      const allEmps = await getAllEmployees();
      const empMap = new Map(allEmps.map((e) => [e.id, e.name]));

      const result = await Promise.all(
        sessions.map(async (s) => {
          const plantings = await getChrysanthemumPlantingsBySession(s.id);
          const greenhouses = s.greenhouses as Array<{ greenhouse: number; seedlingsSent: number }>;
          return {
            id: s.id,
            plantingDate: s.plantingDate,
            status: s.status,
            totalSeedlingsSent: s.totalSeedlingsSent,
            totalSeedlingsPlanted: s.totalSeedlingsPlanted,
            diff: s.totalSeedlingsSent - s.totalSeedlingsPlanted,
            closeNote: s.closeNote,
            closedAt: s.closedAt,
            openedByName: empMap.get(s.openedById) ?? "Desconhecido",
            greenhouses,
            plantings: plantings.map((p) => ({
              id: p.id,
              employeeName: empMap.get(p.employeeId) ?? "Desconhecido",
              totalSeedlings: p.totalSeedlings,
              totalBoxes: p.totalBoxes,
              discountBoxes: p.discountBoxes,
              discountReason: p.discountReason,
              absenceReason: p.absenceReason,
              confirmationStatus: p.confirmStatus,
              rejectionReason: p.confirmRejectionReason,
            })),
          };
        })
      );

      return result;
    }),

  byGreenhouse: publicProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      const plantings = await getAllChrysanthemumPlantings(
        input.from ? new Date(input.from) : undefined,
        input.to ? new Date(input.to) : undefined
      );

      const ghMap = new Map<number, { sent: number; planted: number; records: number }>();
      for (const p of plantings) {
        const ghs = p.greenhouses as Array<{ greenhouse: number; seedlingsSent?: number; seedlings: number }>;
        for (const g of ghs) {
          const key = g.greenhouse;
          const cur = ghMap.get(key) ?? { sent: 0, planted: 0, records: 0 };
          cur.sent += g.seedlingsSent ?? 0;
          cur.planted += g.seedlings;
          cur.records += 1;
          ghMap.set(key, cur);
        }
      }

      return Array.from(ghMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([greenhouse, data]) => ({
          greenhouse,
          sent: data.sent,
          planted: data.planted,
          diff: data.sent - data.planted,
          records: data.records,
          status: data.sent === 0 ? "sem_envio" : data.sent === data.planted ? "ok" : "divergencia",
        }));
    }),

  byDate: publicProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      const plantings = await getAllChrysanthemumPlantings(
        input.from ? new Date(input.from) : undefined,
        input.to ? new Date(input.to) : undefined
      );

      const dateGhMap = new Map<string, { sent: number; planted: number; employees: Set<number> }>();
      for (const p of plantings) {
        const dateStr = new Date(p.plantingDate).toISOString().split("T")[0];
        const ghs = p.greenhouses as Array<{ greenhouse: number; seedlingsSent?: number; seedlings: number }>;
        for (const g of ghs) {
          const key = `${dateStr}__${g.greenhouse}`;
          const cur = dateGhMap.get(key) ?? { sent: 0, planted: 0, employees: new Set() };
          cur.sent += g.seedlingsSent ?? 0;
          cur.planted += g.seedlings;
          cur.employees.add(p.employeeId);
          dateGhMap.set(key, cur);
        }
      }

      return Array.from(dateGhMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => {
          const [date, gh] = key.split("__");
          return {
            date,
            greenhouse: Number(gh),
            sent: data.sent,
            planted: data.planted,
            diff: data.sent - data.planted,
            employeeCount: data.employees.size,
            status: data.sent === 0 ? "sem_envio" : data.sent === data.planted ? "ok" : "divergencia",
          };
        });
    }),
});

export const appRouter = router({
  system: systemRouter,

  // ─── Employee Auth ─────────────────────────────────────────────────────────
  employee: router({
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        const emp = await getEmployeeByUsername(input.username);
        if (!emp) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos" });
        if (!emp.active) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário inativo" });
        const valid = await bcrypt.compare(input.password, emp.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos" });
        const token = await signEmployeeToken(emp.id, emp.role);
        // Retorna o token para o frontend setar via cookie
        return {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          username: emp.username,
          token,
        };
      }),

    logout: publicProcedure.mutation(() => {
      return { success: true };
    }),

    me: publicProcedure.query(async ({ ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp) return null;
      return { id: emp.id, name: emp.name, role: emp.role, username: emp.username };
    }),

    list: publicProcedure.query(async ({ ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const all = await getAllEmployees();
      return all.map((e) => ({ id: e.id, name: e.name, username: e.username, role: e.role }));
    }),

    seed: publicProcedure
      .input(z.object({
        employees: z.array(z.object({
          name: z.string(),
          username: z.string(),
          password: z.string(),
          role: z.enum(["employee", "launcher", "admin"]).default("employee"),
        })),
        adminSecret: z.string(),
      }))
      .mutation(async ({ input }) => {
        if (input.adminSecret !== (process.env.JWT_SECRET ?? "fallback-secret-change-me")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const existing = await getAllEmployees();
        if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Funcionários já cadastrados" });
        for (const emp of input.employees) {
          const hash = await bcrypt.hash(emp.password, 10);
          await createEmployee({ name: emp.name, username: emp.username, passwordHash: hash, role: emp.role });
        }
        return { created: input.employees.length };
      }),
  }),

  // ─── Session ──────────────────────────────────────────────────────────────
  session: sessionRouter,

  // ─── Chrysanthemum Plantings ──────────────────────────────────────────────
  chrysanthemum: router({
    create: publicProcedure
      .input(z.object({
        employeeId: z.number().int().positive(),
        plantingDate: z.string(),
        greenhouses: z.array(GreenhouseEntrySchema).min(1),
        discountBoxes: z.number().int().min(0).default(0),
        discountReason: z.string().optional(),
        absenceReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const launcher = await getEmployeeFromCtx(ctx);
        if (!launcher || (launcher.role !== "launcher" && launcher.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas lançadores podem registrar plantios" });
        }
        const totalSeedlings = input.greenhouses.reduce((s, g) => s + g.seedlings, 0);
        const totalSeedlingsSent = input.greenhouses.reduce((s, g) => s + (g.seedlingsSent ?? 0), 0);
        const totalBoxes = Math.floor(totalSeedlings / 1000);
        await createChrysanthemumPlanting({
          employeeId: input.employeeId,
          plantingDate: new Date(input.plantingDate),
          greenhouses: input.greenhouses,
          totalSeedlingsSent,
          totalSeedlings,
          totalBoxes,
          discountBoxes: input.discountBoxes,
          discountReason: input.discountReason ?? null,
          absenceReason: input.absenceReason ?? null,
          launchedById: launcher.id,
        });
        return { success: true, totalBoxes, totalSeedlings };
      }),

    myHistory: publicProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp) throw new TRPCError({ code: "UNAUTHORIZED" });
        return getChrysanthemumPlantingsByEmployee(
          emp.id,
          input.from ? new Date(input.from) : undefined,
          input.to ? new Date(input.to) : undefined
        );
      }),

    employeeHistory: publicProcedure
      .input(z.object({ employeeId: z.number().int(), from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getChrysanthemumPlantingsByEmployee(
          input.employeeId,
          input.from ? new Date(input.from) : undefined,
          input.to ? new Date(input.to) : undefined
        );
      }),

    adminAll: publicProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllChrysanthemumPlantings(
          input.from ? new Date(input.from) : undefined,
          input.to ? new Date(input.to) : undefined
        );
      }),

    confirm: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp) throw new TRPCError({ code: "UNAUTHORIZED" });
        await confirmChrysanthemumPlanting(input.id, emp.id);
        return { success: true };
      }),

    reject: publicProcedure
      .input(z.object({ id: z.number().int().positive(), reason: z.string().min(1, "Informe o motivo") }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp) throw new TRPCError({ code: "UNAUTHORIZED" });
        await rejectChrysanthemumPlanting(input.id, emp.id, input.reason);
        return { success: true };
      }),
  }),

  reconciliation: reconciliationRouter,

  // ─── Sunflower Plantings ──────────────────────────────────────────────────
  sunflower: router({
    create: publicProcedure
      .input(z.object({
        employeeId: z.number().int().positive(),
        plantingDate: z.string(),
        trays: z.number().int().positive(),
        discountTrays: z.number().int().min(0).default(0),
        discountReason: z.string().optional(),
        absenceReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const launcher = await getEmployeeFromCtx(ctx);
        if (!launcher || (launcher.role !== "launcher" && launcher.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas lançadores podem registrar plantios" });
        }
        await createSunflowerPlanting({
          employeeId: input.employeeId,
          plantingDate: new Date(input.plantingDate),
          trays: input.trays,
          discountTrays: input.discountTrays,
          discountReason: input.discountReason ?? null,
          absenceReason: input.absenceReason ?? null,
          launchedById: launcher.id,
        });
        return { success: true };
      }),

    myHistory: publicProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp) throw new TRPCError({ code: "UNAUTHORIZED" });
        return getSunflowerPlantingsByEmployee(
          emp.id,
          input.from ? new Date(input.from) : undefined,
          input.to ? new Date(input.to) : undefined
        );
      }),

    employeeHistory: publicProcedure
      .input(z.object({ employeeId: z.number().int(), from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getSunflowerPlantingsByEmployee(
          input.employeeId,
          input.from ? new Date(input.from) : undefined,
          input.to ? new Date(input.to) : undefined
        );
      }),

    adminAll: publicProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllSunflowerPlantings(
          input.from ? new Date(input.from) : undefined,
          input.to ? new Date(input.to) : undefined
        );
      }),

    confirm: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp) throw new TRPCError({ code: "UNAUTHORIZED" });
        await confirmSunflowerPlanting(input.id, emp.id);
        return { success: true };
      }),

    reject: publicProcedure
      .input(z.object({ id: z.number().int().positive(), reason: z.string().min(1, "Informe o motivo") }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp) throw new TRPCError({ code: "UNAUTHORIZED" });
        await rejectSunflowerPlanting(input.id, emp.id, input.reason);
        return { success: true };
      }),
  }),

  // ─── User Management (Admin) ──────────────────────────────────────────────
  users: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllEmployeesAdmin();
    }),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(2, "Nome obrigatório"),
        username: z.string().min(3, "Usuário mínimo 3 caracteres").regex(/^[a-z0-9_]+$/, "Apenas letras minúsculas, números e _"),
        password: z.string().min(4, "Senha mínima 4 caracteres"),
        role: z.enum(["employee", "launcher", "admin"]).default("employee"),
      }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const existing = await getEmployeeByUsername(input.username);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Usuário já existe" });
        const hash = await bcrypt.hash(input.password, 10);
        await createEmployee({ name: input.name, username: input.username, passwordHash: hash, role: input.role });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().min(2).optional(),
        username: z.string().min(3).regex(/^[a-z0-9_]+$/).optional(),
        role: z.enum(["employee", "launcher", "admin"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        if (input.username) {
          const conflict = await getEmployeeByUsernameExcluding(input.username, input.id);
          if (conflict) throw new TRPCError({ code: "CONFLICT", message: "Username já em uso" });
        }
        await updateEmployee(input.id, { name: input.name, username: input.username, role: input.role });
        return { success: true };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        id: z.number().int().positive(),
        newPassword: z.string().min(4, "Senha mínima 4 caracteres"),
      }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const hash = await bcrypt.hash(input.newPassword, 10);
        await updateEmployee(input.id, { passwordHash: hash });
        return { success: true };
      }),

    toggleActive: publicProcedure
      .input(z.object({ id: z.number().int().positive(), active: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        if (input.id === emp.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Não pode desativar a si mesmo" });
        await updateEmployee(input.id, { active: input.active });
        return { success: true };
      }),
  }),

  // ─── Rejected Plantings ───────────────────────────────────────────────────
  rejected: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) throw new TRPCError({ code: "FORBIDDEN" });
      const [chrysanthemum, sunflower] = await Promise.all([
        getRejectedChrysanthemumPlantings(),
        getRejectedSunflowerPlantings(),
      ]);
      return { chrysanthemum, sunflower };
    }),

    editChrysanthemum: publicProcedure
      .input(z.object({
        id: z.number().int().positive(),
        greenhouses: z.array(GreenhouseEntrySchema).min(1),
        discountBoxes: z.number().int().min(0).default(0),
        discountReason: z.string().optional(),
        absenceReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) throw new TRPCError({ code: "FORBIDDEN" });
        const totalSeedlings = input.greenhouses.reduce((s, g) => s + g.seedlings, 0);
        const totalSeedlingsSent = input.greenhouses.reduce((s, g) => s + (g.seedlingsSent ?? 0), 0);
        const totalBoxes = Math.floor(totalSeedlings / 1000) - input.discountBoxes;
        await editChrysanthemumPlanting(input.id, {
          greenhouses: input.greenhouses,
          totalSeedlings,
          totalSeedlingsSent,
          totalBoxes,
          discountBoxes: input.discountBoxes,
          discountReason: input.discountReason,
          absenceReason: input.absenceReason,
        });
        return { success: true };
      }),

    editSunflower: publicProcedure
      .input(z.object({
        id: z.number().int().positive(),
        trays: z.number().int().min(0),
        discountTrays: z.number().int().min(0).default(0),
        discountReason: z.string().optional(),
        absenceReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) throw new TRPCError({ code: "FORBIDDEN" });
        await editSunflowerPlanting(input.id, {
          trays: input.trays,
          discountTrays: input.discountTrays,
          discountReason: input.discountReason,
          absenceReason: input.absenceReason,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
