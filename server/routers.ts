import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import * as jose from "jose";
import { z } from "zod";
import {
  closePlantingSession,
  adjustSessionPlantedTotal,
  confirmChrysanthemumPlanting,
  confirmSunflowerPlanting,
  createChrysanthemumPlanting,
  createEmployee,
  createPlantingSession,
  createSunflowerPlanting,
  deleteChrysanthemumPlantingRecord,
  deletePlantingSessionAndPlantings,
  deleteSunflowerPlantingRecord,
  editChrysanthemumPlanting,
  editSunflowerPlanting,
  getAllChrysanthemumPlantings,
  getAllEmployees,
  getAllEmployeesAdmin,
  getAllPlantingSessions,
  getAllSunflowerPlantings,
  getChrysanthemumPlantingById,
  getChrysanthemumPlantingBySessionEmployee,
  getChrysanthemumPlantingsByEmployee,
  getChrysanthemumPlantingsBySession,
  getEmployeeById,
  getEmployeeByUsername,
  getEmployeeByUsernameExcluding,
  getOpenPlantingSessions,
  getPlantingSessionById,
  getRejectedChrysanthemumPlantings,
  getRejectedSunflowerPlantings,
  getSunflowerPlantingById,
  getSunflowerPlantingsByEmployee,
  rejectChrysanthemumPlanting,
  rejectSunflowerPlanting,
  updateChrysanthemumPlantingRecord,
  updateEmployee,
  updatePlantingSessionDetails,
  updateSunflowerPlantingRecord,
} from "./db";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const EMP_COOKIE = "emp_session";

function getConfiguredJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "fallback-secret-change-me") {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "JWT_SECRET não está configurado no servidor" });
  }
  return secret;
}

async function signEmployeeToken(employeeId: number, role: string) {
  const secret = new TextEncoder().encode(getConfiguredJwtSecret());
  return new jose.SignJWT({ sub: String(employeeId), role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

async function verifyEmployeeToken(token: string) {
  try {
    const secret = new TextEncoder().encode(getConfiguredJwtSecret());
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as { sub: string; role: string };
  } catch {
    return null;
  }
}

async function getEmployeeFromCtx(ctx: {
  req: { headers: Record<string, string | string[] | undefined> };
  responseHeaders: Headers;
}) {
  const cookieHeader = ctx.req.headers["cookie"] as string | undefined;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${EMP_COOKIE}=([^;]+)`));
  if (!match) return null;
  const payload = await verifyEmployeeToken(match[1]);
  if (!payload) return null;
  const employee = await getEmployeeById(Number(payload.sub));
  if (!employee?.active) return null;
  ctx.responseHeaders.append(
    "Set-Cookie",
    `${EMP_COOKIE}=${match[1]}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`
  );
  return employee;
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

function parseDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  }
  return new Date(value);
}

// ─── Session Router ──────────────────────────────────────────────────────────
const sessionRouter = router({
  open: publicProcedure
    .input(z.object({
      plantingDate: z.string(),
      greenhouses: z.array(GreenhouseSentSchema).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const launcher = await getEmployeeFromCtx(ctx);
      if (!launcher || launcher.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem abrir sessões de plantio" });
      }
      if (new Set(input.greenhouses.map((item) => item.greenhouse)).size !== input.greenhouses.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não repita a mesma estufa na sessão" });
      }
      const totalSent = input.greenhouses.reduce((s, g) => s + g.seedlingsSent, 0);
      const created = await createPlantingSession({
        plantingDate: new Date(input.plantingDate),
        greenhouses: input.greenhouses,
        totalSeedlingsSent: totalSent,
        totalSeedlingsPlanted: 0,
        openedById: launcher.id,
      });
      if (!created?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível abrir a sessão" });
      return { success: true, sessionId: created.id };
    }),

  listOpen: publicProcedure.query(async ({ ctx }) => {
    const emp = await getEmployeeFromCtx(ctx);
    if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getOpenPlantingSessions();
  }),

  manageList: publicProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [sessions, allEmps] = await Promise.all([
        getAllPlantingSessions(
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
        ),
        getAllEmployees(),
      ]);
      const empMap = new Map(allEmps.map((e) => [e.id, e.name]));
      return Promise.all(sessions.map(async (session) => {
        const plantings = await getChrysanthemumPlantingsBySession(session.id);
        return {
          ...session,
          openedByName: empMap.get(session.openedById) ?? "Desconhecido",
          plantings: plantings.map((planting) => ({
            ...planting,
            employeeName: empMap.get(planting.employeeId) ?? "Desconhecido",
          })),
        };
      }));
    }),

  update: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
      plantingDate: z.string(),
      greenhouses: z.array(z.object({
        greenhouse: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
        boxes: z.number().positive().max(2_000_000).refine((value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6, "Use até três casas decimais"),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const session = await getPlantingSessionById(input.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      if (new Set(input.greenhouses.map((item) => item.greenhouse)).size !== input.greenhouses.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não repita a mesma estufa na sessão" });
      }
      const plantings = await getChrysanthemumPlantingsBySession(input.id);
      const selectedGreenhouses = new Set(input.greenhouses.map((item) => item.greenhouse));
      const linkedGreenhouses = new Set(plantings.flatMap((planting) =>
        (planting.greenhouses as Array<{ greenhouse: number }>).map((entry) => entry.greenhouse)
      ));
      const removedGreenhouse = Array.from(linkedGreenhouses).find((greenhouse) => !selectedGreenhouses.has(greenhouse as 1 | 2 | 3 | 4));
      if (removedGreenhouse != null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Não é possível remover a Estufa ${removedGreenhouse}: há lançamentos vinculados a ela`,
        });
      }
      const greenhouses = input.greenhouses.map((item) => ({
        greenhouse: item.greenhouse,
        seedlingsSent: Math.round(item.boxes * 1000),
      }));
      const totalSeedlingsSent = greenhouses.reduce((sum, item) => sum + item.seedlingsSent, 0);
      await updatePlantingSessionDetails(input.id, {
        plantingDate: new Date(input.plantingDate),
        greenhouses,
        totalSeedlingsSent,
        updatedById: emp.id,
      });
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const session = await getPlantingSessionById(input.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      const deletedPlantings = await deletePlantingSessionAndPlantings(input.id);
      return { success: true, deletedPlantings };
    }),

  listAll: publicProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const emp = await getEmployeeFromCtx(ctx);
      if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllPlantingSessions(
        parseDateBoundary(input.from),
        parseDateBoundary(input.to, true)
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

      const targetEmployee = await getEmployeeById(input.employeeId);
      if (!targetEmployee || !targetEmployee.active || targetEmployee.role !== "employee") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um funcionário ativo" });
      }
      if (await getChrysanthemumPlantingBySessionEmployee(input.sessionId, input.employeeId)) {
        throw new TRPCError({ code: "CONFLICT", message: "Este funcionário já foi lançado nesta sessão. Edite o lançamento existente." });
      }
      if (new Set(input.greenhouses.map((item) => item.greenhouse)).size !== input.greenhouses.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não repita a mesma estufa no lançamento" });
      }
      const sessionGreenhouses = new Set(
        (session.greenhouses as Array<{ greenhouse: number; seedlingsSent: number }>).map((item) => item.greenhouse)
      );
      if (input.greenhouses.some((item) => !sessionGreenhouses.has(item.greenhouse))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O lançamento deve usar apenas estufas desta sessão" });
      }

      const totalSeedlings = input.greenhouses.reduce((s, g) => s + g.seedlings, 0);
      const totalBoxes = Math.floor(totalSeedlings / 1000);
      const isAbsent = Boolean(input.absenceReason?.trim());
      if (isAbsent && (totalSeedlings > 0 || input.discountBoxes > 0)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Funcionário ausente não pode ter plantio ou desconto" });
      }
      if (!isAbsent && totalSeedlings <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe as caixas plantadas ou marque ausência" });
      }
      if (!isAbsent && input.discountBoxes > totalBoxes) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O desconto não pode superar as caixas plantadas" });
      }
      if (!isAbsent && input.discountBoxes > 0 && !input.discountReason?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o motivo do desconto" });
      }

      const created = await createChrysanthemumPlanting({
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
      if (!created?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível salvar o lançamento" });

      const updatedSession = await adjustSessionPlantedTotal(input.sessionId, totalSeedlings, launcher.id, true);
      if (!updatedSession) {
        await deleteChrysanthemumPlantingRecord(created.id);
        throw new TRPCError({ code: "CONFLICT", message: "A sessão foi fechada ou removida antes de concluir o lançamento." });
      }

      const diff = updatedSession.totalSeedlingsSent - updatedSession.totalSeedlingsPlanted;
      return {
        success: true,
        totalBoxes,
        totalSeedlings,
        sessionTotal: updatedSession.totalSeedlingsPlanted,
        sessionSent: updatedSession.totalSeedlingsSent,
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

      const closed = await closePlantingSession(input.sessionId, launcher.id, "closed", undefined);
      if (!closed) {
        throw new TRPCError({ code: "CONFLICT", message: "A sessão foi alterada por outra pessoa. Atualize os dados e tente novamente." });
      }
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
        parseDateBoundary(input.from),
        parseDateBoundary(input.to, true)
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

      const [plantings, sessions] = await Promise.all([
        getAllChrysanthemumPlantings(
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
        ),
        getAllPlantingSessions(
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
        ),
      ]);

      const ghMap = new Map<number, { sent: number; planted: number; records: number }>();
      for (const session of sessions) {
        const ghs = session.greenhouses as Array<{ greenhouse: number; seedlingsSent: number }>;
        for (const g of ghs) {
          const cur = ghMap.get(g.greenhouse) ?? { sent: 0, planted: 0, records: 0 };
          cur.sent += g.seedlingsSent;
          ghMap.set(g.greenhouse, cur);
        }
      }
      for (const p of plantings) {
        const ghs = p.greenhouses as Array<{ greenhouse: number; seedlingsSent?: number; seedlings: number }>;
        for (const g of ghs) {
          const cur = ghMap.get(g.greenhouse) ?? { sent: 0, planted: 0, records: 0 };
          if (p.sessionId == null) cur.sent += g.seedlingsSent ?? 0;
          cur.planted += g.seedlings;
          cur.records += 1;
          ghMap.set(g.greenhouse, cur);
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

      const [plantings, sessions] = await Promise.all([
        getAllChrysanthemumPlantings(
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
        ),
        getAllPlantingSessions(
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
        ),
      ]);

      const dateGhMap = new Map<string, { sent: number; planted: number; employees: Set<number> }>();
      for (const session of sessions) {
        const dateStr = new Date(session.plantingDate).toISOString().slice(0, 10);
        const ghs = session.greenhouses as Array<{ greenhouse: number; seedlingsSent: number }>;
        for (const g of ghs) {
          const key = `${dateStr}__${g.greenhouse}`;
          const cur = dateGhMap.get(key) ?? { sent: 0, planted: 0, employees: new Set<number>() };
          cur.sent += g.seedlingsSent;
          dateGhMap.set(key, cur);
        }
      }
      for (const p of plantings) {
        const dateStr = new Date(p.plantingDate).toISOString().slice(0, 10);
        const ghs = p.greenhouses as Array<{ greenhouse: number; seedlingsSent?: number; seedlings: number }>;
        for (const g of ghs) {
          const key = `${dateStr}__${g.greenhouse}`;
          const cur = dateGhMap.get(key) ?? { sent: 0, planted: 0, employees: new Set<number>() };
          if (p.sessionId == null) cur.sent += g.seedlingsSent ?? 0;
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
      .input(z.object({
        username: z.string(),
        password: z.string().optional(),
        mode: z.enum(["password", "launcher"]).default("password"),
      }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeByUsername(input.username);
        if (!emp) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos" });
        if (!emp.active) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário inativo" });
        const valid = input.mode === "launcher"
          ? emp.role === "launcher"
          : emp.role !== "launcher" && Boolean(input.password) && await bcrypt.compare(input.password!, emp.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos" });
        const token = await signEmployeeToken(emp.id, emp.role);
        ctx.responseHeaders.append(
          "Set-Cookie",
          `${EMP_COOKIE}=${token}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`
        );
        return {
          id: emp.id,
          name: emp.name,
          role: emp.role,
          username: emp.username,
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.responseHeaders.append(
        "Set-Cookie",
        `${EMP_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
      );
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
      return all
        .filter((e) => emp.role === "admin" || e.role === "employee")
        .map((e) => ({ id: e.id, name: e.name, role: e.role }));
    }),

    seed: publicProcedure
      .input(z.object({
        employees: z.array(z.object({
          name: z.string(),
          username: z.string(),
          password: z.string().min(4).optional(),
          role: z.enum(["employee", "launcher", "admin"]).default("employee"),
        })),
        adminSecret: z.string(),
      }))
      .mutation(async ({ input }) => {
        const configuredSecret = getConfiguredJwtSecret();
        if (input.adminSecret !== configuredSecret) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const existing = await getAllEmployees();
        if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Funcionários já cadastrados" });
        await Promise.all(input.employees.map(async (emp) => {
          if (emp.role !== "launcher" && !emp.password) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `Defina uma senha para ${emp.name}` });
          }
          const hash = await bcrypt.hash(emp.password ?? randomBytes(32).toString("hex"), 8);
          await createEmployee({ name: emp.name, username: emp.username, passwordHash: hash, role: emp.role });
        }));
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
      .mutation(async ({ ctx }) => {
        const launcher = await getEmployeeFromCtx(ctx);
        if (!launcher || (launcher.role !== "launcher" && launcher.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas lançadores podem registrar plantios" });
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lançamentos de crisântemo devem ser feitos dentro de uma sessão aberta.",
        });
      }),

    myHistory: publicProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp) throw new TRPCError({ code: "UNAUTHORIZED" });
        return getChrysanthemumPlantingsByEmployee(
          emp.id,
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
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
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
        );
      }),

    adminAll: publicProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllChrysanthemumPlantings(
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
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

    manageAll: publicProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getAllChrysanthemumPlantings(
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
        );
      }),

    updateRecord: publicProcedure
      .input(z.object({
        id: z.number().int().positive(),
        employeeId: z.number().int().positive(),
        plantingDate: z.string(),
        greenhouses: z.array(GreenhouseEntrySchema).min(1),
        discountBoxes: z.number().int().min(0),
        discountReason: z.string().optional(),
        absenceReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const actor = await getEmployeeFromCtx(ctx);
        if (!actor || (actor.role !== "launcher" && actor.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const [record, employee] = await Promise.all([
          getChrysanthemumPlantingById(input.id),
          getEmployeeById(input.employeeId),
        ]);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
        if (!employee || !employee.active || employee.role !== "employee") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um funcionário ativo" });
        }
        const session = record.sessionId ? await getPlantingSessionById(record.sessionId) : undefined;
        if (record.sessionId && !session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão vinculada não encontrada" });
        if (record.sessionId) {
          const duplicate = await getChrysanthemumPlantingBySessionEmployee(record.sessionId, input.employeeId);
          if (duplicate && duplicate.id !== record.id) {
            throw new TRPCError({ code: "CONFLICT", message: "Este funcionário já tem um lançamento nesta sessão." });
          }
        }
        if (new Set(input.greenhouses.map((item) => item.greenhouse)).size !== input.greenhouses.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Não repita a mesma estufa no lançamento" });
        }
        if (session) {
          const sessionGreenhouses = new Set(
            (session.greenhouses as Array<{ greenhouse: number; seedlingsSent: number }>).map((item) => item.greenhouse)
          );
          if (input.greenhouses.some((item) => !sessionGreenhouses.has(item.greenhouse))) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "O lançamento deve usar apenas estufas da sessão vinculada" });
          }
        }
        const plantingDate = session?.plantingDate ?? new Date(input.plantingDate);
        const totalSeedlings = input.greenhouses.reduce((sum, item) => sum + item.seedlings, 0);
        const totalSeedlingsSent = input.greenhouses.reduce((sum, item) => sum + (item.seedlingsSent ?? 0), 0);
        const totalBoxes = Math.floor(totalSeedlings / 1000);
        const isAbsent = Boolean(input.absenceReason?.trim());
        if (isAbsent && (totalSeedlings > 0 || input.discountBoxes > 0)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Funcionário ausente não pode ter plantio ou desconto" });
        }
        if (!isAbsent && totalSeedlings <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o plantio ou marque ausência" });
        }
        if (!isAbsent && input.discountBoxes > totalBoxes) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O desconto não pode superar as caixas plantadas" });
        }
        if (!isAbsent && input.discountBoxes > 0 && !input.discountReason?.trim()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o motivo do desconto" });
        }
        await updateChrysanthemumPlantingRecord(input.id, {
          employeeId: input.employeeId,
          plantingDate,
          greenhouses: input.greenhouses,
          totalSeedlings,
          totalSeedlingsSent,
          totalBoxes,
          discountBoxes: input.discountBoxes,
          discountReason: input.discountReason,
          absenceReason: input.absenceReason,
        });
        if (record.sessionId) {
          await adjustSessionPlantedTotal(record.sessionId, totalSeedlings - record.totalSeedlings, actor.id);
        }
        return { success: true };
      }),

    deleteRecord: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const actor = await getEmployeeFromCtx(ctx);
        if (!actor || (actor.role !== "launcher" && actor.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const record = await getChrysanthemumPlantingById(input.id);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
        const deleted = await deleteChrysanthemumPlantingRecord(input.id);
        if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento já foi excluído" });
        if (deleted.sessionId) {
          await adjustSessionPlantedTotal(deleted.sessionId, -deleted.totalSeedlings, actor.id);
        }
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
        trays: z.number().int().min(0).default(0),
        discountTrays: z.number().int().min(0).default(0),
        discountReason: z.string().optional(),
        absenceReason: z.string().optional(),
      }))
    .mutation(async ({ input, ctx }) => {
      const launcher = await getEmployeeFromCtx(ctx);
      if (!launcher || (launcher.role !== "launcher" && launcher.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas lançadores podem registrar plantios" });
      }
      const employee = await getEmployeeById(input.employeeId);
      if (!employee || !employee.active || employee.role !== "employee") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um funcionário ativo" });
      }
      const isAbsent = Boolean(input.absenceReason?.trim());
      if (isAbsent && (input.trays > 0 || input.discountTrays > 0)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Funcionário ausente não pode ter bandejas ou desconto" });
      }
      if (!isAbsent && input.trays <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe as bandejas ou marque ausência" });
      }
      if (!isAbsent && input.discountTrays > input.trays) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O desconto não pode superar as bandejas plantadas" });
      }
      if (!isAbsent && input.discountTrays > 0 && !input.discountReason?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o motivo do desconto" });
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
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
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
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
        );
      }),

    adminAll: publicProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllSunflowerPlantings(
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
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

    manageAll: publicProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || (emp.role !== "launcher" && emp.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getAllSunflowerPlantings(
          parseDateBoundary(input.from),
          parseDateBoundary(input.to, true)
        );
      }),

    updateRecord: publicProcedure
      .input(z.object({
        id: z.number().int().positive(),
        employeeId: z.number().int().positive(),
        plantingDate: z.string(),
        trays: z.number().int().min(0),
        discountTrays: z.number().int().min(0),
        discountReason: z.string().optional(),
        absenceReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const actor = await getEmployeeFromCtx(ctx);
        if (!actor || (actor.role !== "launcher" && actor.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const [record, employee] = await Promise.all([
          getSunflowerPlantingById(input.id),
          getEmployeeById(input.employeeId),
        ]);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
        if (!employee || !employee.active || employee.role !== "employee") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um funcionário ativo" });
        }
        const isAbsent = Boolean(input.absenceReason?.trim());
        if (isAbsent && (input.trays > 0 || input.discountTrays > 0)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Funcionário ausente não pode ter bandejas ou desconto" });
        }
        if (!isAbsent && input.trays <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe as bandejas ou marque ausência" });
        }
        if (!isAbsent && input.discountTrays > input.trays) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O desconto não pode superar as bandejas plantadas" });
        }
        if (!isAbsent && input.discountTrays > 0 && !input.discountReason?.trim()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o motivo do desconto" });
        }
        await updateSunflowerPlantingRecord(input.id, {
          employeeId: input.employeeId,
          plantingDate: new Date(input.plantingDate),
          trays: input.trays,
          discountTrays: input.discountTrays,
          discountReason: input.discountReason,
          absenceReason: input.absenceReason,
        });
        return { success: true };
      }),

    deleteRecord: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const actor = await getEmployeeFromCtx(ctx);
        if (!actor || (actor.role !== "launcher" && actor.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const record = await getSunflowerPlantingById(input.id);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
        await deleteSunflowerPlantingRecord(input.id);
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
        password: z.string().min(4, "Senha mínima 4 caracteres").optional(),
        role: z.enum(["employee", "launcher", "admin"]).default("employee"),
      }))
      .mutation(async ({ input, ctx }) => {
        const emp = await getEmployeeFromCtx(ctx);
        if (!emp || emp.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const existing = await getEmployeeByUsername(input.username);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Usuário já existe" });
        if (input.role !== "launcher" && !input.password) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe uma senha para este perfil" });
        }
        const hash = await bcrypt.hash(input.password ?? randomBytes(32).toString("hex"), 8);
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
        const target = await getEmployeeById(input.id);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        if (target.role === "launcher") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Lançadores entram usando somente o usuário, sem senha" });
        }
        const hash = await bcrypt.hash(input.newPassword, 8);
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
        const record = await getChrysanthemumPlantingById(input.id);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
        if (new Set(input.greenhouses.map((item) => item.greenhouse)).size !== input.greenhouses.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Não repita a mesma estufa no lançamento" });
        }
        if (record.sessionId) {
          const session = await getPlantingSessionById(record.sessionId);
          if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão vinculada não encontrada" });
          const sessionGreenhouses = new Set(
            (session.greenhouses as Array<{ greenhouse: number; seedlingsSent: number }>).map((item) => item.greenhouse)
          );
          if (input.greenhouses.some((item) => !sessionGreenhouses.has(item.greenhouse))) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "O lançamento deve usar apenas estufas da sessão vinculada" });
          }
        }
        const totalBoxes = Math.floor(totalSeedlings / 1000);
        const isAbsent = Boolean(input.absenceReason?.trim());
        if (isAbsent && (totalSeedlings > 0 || input.discountBoxes > 0)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Funcionário ausente não pode ter plantio ou desconto" });
        }
        if (!isAbsent && totalSeedlings <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o plantio ou marque ausência" });
        }
        if (!isAbsent && input.discountBoxes > totalBoxes) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O desconto não pode superar as caixas plantadas" });
        }
        if (!isAbsent && input.discountBoxes > 0 && !input.discountReason?.trim()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o motivo do desconto" });
        }
        await editChrysanthemumPlanting(input.id, {
          greenhouses: input.greenhouses,
          totalSeedlings,
          totalSeedlingsSent,
          totalBoxes,
          discountBoxes: input.discountBoxes,
          discountReason: input.discountReason,
          absenceReason: input.absenceReason,
        });
        if (record.sessionId) {
          await adjustSessionPlantedTotal(record.sessionId, totalSeedlings - record.totalSeedlings, emp.id);
        }
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
        const isAbsent = Boolean(input.absenceReason?.trim());
        if (isAbsent && (input.trays > 0 || input.discountTrays > 0)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Funcionário ausente não pode ter bandejas ou desconto" });
        }
        if (!isAbsent && input.trays <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe as bandejas ou marque ausência" });
        }
        if (!isAbsent && input.discountTrays > input.trays) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O desconto não pode superar as bandejas plantadas" });
        }
        if (!isAbsent && input.discountTrays > 0 && !input.discountReason?.trim()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o motivo do desconto" });
        }
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
