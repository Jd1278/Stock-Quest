import type { Request, Response } from "express";
import { z } from "zod";
import { config } from "../config/env";
import { AppError } from "../repositories";

export const javaLearningEnabled = () => config.LEARNING_BACKEND === "java";
export function requireLegacyLearning() {
  if (javaLearningEnabled()) throw new AppError(503, "El aprendizaje pertenece al servicio Java.");
}
const progressSchema = z.object({
  completed: z.number().int().nonnegative(), total: z.number().int().nonnegative(), percent: z.number().int().min(0).max(100),
  xp: z.number().int().nonnegative().safe(), level: z.number().int().positive(), simulations: z.number().int().nonnegative(), passed: z.boolean(),
  topics: z.array(z.object({ id: z.string(), title: z.string(), completed: z.number().int().nonnegative(), total: z.number().int().nonnegative(),
    score: z.number().int().min(0).max(100).nullable(), needsReview: z.boolean() })),
  achievements: z.array(z.object({ userId: z.string(), key: z.string(), earnedAt: z.string().datetime({ offset: true }).transform(value => new Date(value)) })),
  recommendations: z.array(z.string()),
});
const reportSchema = z.object({ userId: z.string().min(1).max(100), progress: progressSchema,
  activities: z.array(z.object({ id: z.string(), score: z.number().int().min(0).max(100), answer: z.number().int().min(0).max(5),
    createdAt: z.string().datetime({ offset: true }).transform(value => new Date(value)), challenge: z.object({ question: z.string() }) })).max(100),
});
async function call(method: string, path: string, bearer?: string, body?: unknown, event = false) {
  let response: globalThis.Response;
  try {
    response = await fetch(config.LEARNING_SERVICE_URL.replace(/\/$/, "") + path, {
      method, redirect: "error", signal: AbortSignal.timeout(2500),
      headers: { "Content-Type": "application/json", "X-StockQuest-Service-Token": config.LEARNING_SERVICE_TOKEN ?? "",
        ...(event ? { "X-StockQuest-Event-Token": config.SIMULATION_EVENT_TOKEN ?? "" } : {}),
        ...(bearer ? { Authorization: bearer } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new AppError(503, "El servicio de aprendizaje no está disponible."); }
  if (response.status === 204) return { status: 204, body: undefined };
  let result: any;
  try { result = await response.json(); }
  catch { throw new AppError(503, "El servicio de aprendizaje devolvió una respuesta inválida."); }
  if (![200, 201, 400, 401, 403, 404, 409, 413, 429, 500, 503].includes(response.status)
      || (response.status >= 400 && (typeof result !== "object" || result === null || typeof result.message !== "string")))
    throw new AppError(503, "El servicio de aprendizaje devolvió una respuesta inválida.");
  return { status: response.status, body: result };
}
export const learningGateway = {
  async forward(req: Request, res: Response, path: string, body?: unknown) {
    const result = await call(req.method, path, req.headers.authorization, body);
    if (result.status === 204) { res.status(204).end(); return; }
    res.status(result.status).json(result.body);
  },
  async modules(bearer?: string) {
    const result = await call("GET", "/internal/admin/modules", bearer);
    if (result.status !== 200 || !Array.isArray(result.body)) throw new AppError(result.status >= 400 ? result.status : 503, "No fue posible consultar el contenido.");
    return result.body;
  },
  async report(userId: string) {
    const result = await call("GET", `/internal/users/${encodeURIComponent(userId)}/learning-report`);
    const parsed = reportSchema.safeParse(result.body);
    if (result.status !== 200 || !parsed.success || parsed.data.userId !== userId
        || parsed.data.progress.achievements.some(a => a.userId !== userId))
      throw new AppError(503, "No fue posible consultar el progreso de aprendizaje.");
    return parsed.data;
  },
  async event(body: unknown) {
    const result = await call("POST", "/internal/events", undefined, body, true);
    if (result.status !== 204) throw new AppError(result.status >= 400 ? result.status : 503, result.body?.message ?? "El evento no fue confirmado por aprendizaje.");
  },
};
