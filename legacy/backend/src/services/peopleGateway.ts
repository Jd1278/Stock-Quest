import type { Request, Response } from "express";
import { z } from "zod";
import { config } from "../config/env";
import { AppError } from "../repositories";

export const javaPeopleEnabled = () => config.PEOPLE_BACKEND === "java";
export function requireLegacyPeople() {
  if (javaPeopleEnabled()) throw new AppError(503, "La identidad y la capacitación pertenecen al servicio Java.");
}
const profile = z.object({ id: z.string().min(1).max(100), name: z.string(), email: z.string(), document: z.string(), company: z.string(),
  phone: z.string().nullable(), role: z.enum(["APRENDIZ", "LIDER", "GESTOR_PEDAGOGICO"]), active: z.boolean(), createdAt: z.string().datetime({ offset: true }),
});
async function call(method: string, path: string, bearer?: string, body?: unknown, correlation?: string) {
  if (!/^\/api\/(auth|users|groups|reports)(\/|$)/.test(path) || path.includes("?") || path.includes("#"))
    throw new AppError(400, "Ruta de personas inválida.");
  let response: globalThis.Response;
  try {
    response = await fetch(config.PEOPLE_SERVICE_URL.replace(/\/$/, "") + path, {
      method, redirect: "error", signal: AbortSignal.timeout(5000),
      headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: bearer } : {}),
        ...(correlation ? { "X-Correlation-Id": correlation } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new AppError(503, "El servicio de personas no está disponible."); }
  if (response.status === 204) return { status: 204, body: undefined };
  let result: any;
  try { result = await response.json(); } catch { throw new AppError(503, "El servicio de personas devolvió una respuesta inválida."); }
  if (![200, 201, 400, 401, 403, 404, 409, 413, 429, 500, 503].includes(response.status)
      || (response.status >= 400 && (!result || typeof result.message !== "string")))
    throw new AppError(503, "El servicio de personas devolvió una respuesta inválida.");
  return { status: response.status, body: result };
}
export const peopleGateway = {
  async identity(bearer?: string, correlation?: string) {
    if (!bearer?.match(/^Bearer [^\s]+$/)) throw new AppError(401, "Inicia sesión para continuar.");
    const result = await call("GET", "/api/auth/me", bearer, undefined, correlation);
    if (result.status === 401) throw new AppError(401, result.body.message);
    const parsed = profile.safeParse(result.body);
    if (result.status !== 200 || !parsed.success || !parsed.data.active) throw new AppError(503, "No fue posible validar la identidad.");
    return parsed.data;
  },
  async forward(req: Request, res: Response, path: string, body?: unknown) {
    const result = await call(req.method, path, req.headers.authorization, body, req.get("X-Correlation-Id"));
    if (result.status === 204) { res.status(204).end(); return; }
    res.status(result.status).json(result.body);
  },
};
