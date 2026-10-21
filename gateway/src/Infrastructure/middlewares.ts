import type { RequestHandler, ErrorRequestHandler } from "express";
import { z, ZodError } from "zod";
import { AppError, Role } from "../domain";
import type { ServicePort } from "../Application/ServicePort";
declare module "express-serve-static-core" { interface Request { auth: { id: string; role: Role } } }
export const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
const identity = z.object({ id: z.string().min(1).max(100), name: z.string(), email: z.string(), document: z.string(), company: z.string(),
  phone: z.string().nullable(), role: z.enum(["APRENDIZ", "LIDER", "GESTOR_PEDAGOGICO"]), active: z.boolean(), createdAt: z.string().datetime({ offset: true }) });
export const authenticate = (port: ServicePort) => asyncRoute(async (req, _res, next) => {
  if (!req.headers.authorization?.match(/^Bearer [^\s]+$/)) throw new AppError(401, "Inicia sesión para continuar.");
  const result = await port.call("people", "GET", "/api/auth/me", req.headers.authorization, undefined, req.get("X-Correlation-Id"));
  if (result.status === 401) throw new AppError(401, result.body.message);
  const parsed = identity.safeParse(result.body);
  if (result.status !== 200 || !parsed.success || !parsed.data.active) throw new AppError(503, "No fue posible validar la identidad.");
  req.auth = { id: parsed.data.id, role: parsed.data.role };
  next();
});
export const authorize = (...roles: Role[]): RequestHandler => (req, _res, next) => {
  if (!roles.includes(req.auth.role)) return next(new AppError(403, "No tienes permiso para esta acción."));
  next();
};
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: "Revisa los campos del formulario.", issues: error.issues.map(i => ({ field: i.path.join("."), message: i.message })) }); return;
  }
  if (error instanceof AppError) { res.status(error.status).json({ message: error.message }); return; }
  if (error?.type === "entity.too.large") { res.status(413).json({ message: "El contenido supera el tamaño permitido." }); return; }
  if (error instanceof SyntaxError) { res.status(400).json({ message: "JSON inválido." }); return; }
  console.error("Request failed:", error instanceof Error ? error.name : "unknown");
  res.status(500).json({ message: "No fue posible completar la operación." });
};
