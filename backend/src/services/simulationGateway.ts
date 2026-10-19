import type { Request, Response } from "express";
import { z } from "zod";
import { config } from "../config/env";
import { AppError } from "../repositories";

const summarySchema = z.object({
  userId: z.string().min(1).max(100),
  completedCount: z.number().int().nonnegative().safe(),
  scoreTotal: z.number().int().nonnegative().safe(),
  hasPassingRun: z.boolean(),
  firstCompletedAt: z.string().datetime({ offset: true }).nullable(),
}).refine(s => s.scoreTotal <= s.completedCount * 100
  && (s.completedCount > 0 ? s.firstCompletedAt !== null : s.firstCompletedAt === null && s.scoreTotal === 0 && !s.hasPassingRun));

export const javaSimulationEnabled = () => config.SIMULATION_BACKEND === "java";
async function call(method: string, path: string, bearer?: string, body?: unknown) {
  let response: globalThis.Response;
  try {
    response = await fetch(config.SIMULATION_SERVICE_URL.replace(/\/$/, "") + path, {
      method, redirect: "error", signal: AbortSignal.timeout(2500),
      headers: { "Content-Type": "application/json", "X-StockQuest-Service-Token": config.SIMULATION_SERVICE_TOKEN ?? "",
        ...(bearer ? { Authorization: bearer } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new AppError(503, "El servicio de simulación no está disponible."); }
  if (response.status === 204) return { status: 204, body: undefined };
  let result: any;
  try { result = await response.json(); }
  catch { throw new AppError(503, "El servicio de simulación devolvió una respuesta inválida."); }
  if (![200, 201, 400, 401, 403, 404, 409, 413, 429, 500, 503].includes(response.status)
      || (response.status >= 400 && (typeof result !== "object" || result === null || typeof result.message !== "string")))
    throw new AppError(503, "El servicio de simulación devolvió una respuesta inválida.");
  return { status: response.status, body: result };
}
export const simulationGateway = {
  async forward(req: Request, res: Response, path: string, body?: unknown) {
    const result = await call(req.method, path, req.headers.authorization, body);
    if (result.status === 204) { res.status(204).end(); return; }
    res.status(result.status).json(result.body);
  },
  async summary(userId: string) {
    const result = await call("GET", `/internal/users/${encodeURIComponent(userId)}/simulation-summary`);
    const parsed = summarySchema.safeParse(result.body);
    if (result.status !== 200 || !parsed.success || parsed.data.userId !== userId)
      throw new AppError(503, "No fue posible consultar los resultados de simulación.");
    return parsed.data;
  },
  async scenarios(bearer?: string) {
    const result = await call("GET", "/internal/admin/scenarios", bearer);
    if (result.status !== 200 || !Array.isArray(result.body))
      throw new AppError(result.status >= 400 ? result.status : 503, "No fue posible consultar los escenarios.");
    return result.body;
  },
};
