import { RequestHandler, ErrorRequestHandler } from "express";
import jwt from "jsonwebtoken";
import { Role, Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { config } from "../config/env";
import { repository, AppError } from "../repositories";
declare module "express-serve-static-core" {
  interface Request {
    auth: { id: string; role: Role };
  }
}
export const asyncRoute =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
export const authenticate: RequestHandler = asyncRoute(
  async (req, _res, next) => {
    const token = req.headers.authorization?.match(/^Bearer ([^ ]+)$/)?.[1];
    if (!token) throw new AppError(401, "Inicia sesión para continuar.");
    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: "stock-quest",
        audience: "stock-quest-web",
      });
      if (typeof decoded === "string") throw new Error();
      payload = decoded;
    } catch {
      throw new AppError(401, "Tu sesión expiró. Inicia sesión nuevamente.");
    }
    if (typeof payload.sub !== "string")
      throw new AppError(401, "Sesión inválida.");
    const user = await repository.userById(payload.sub);
    if (!user?.active || user.tokenVersion !== payload.version)
      throw new AppError(401, "Sesión no disponible.");
    req.auth = { id: user.id, role: user.role };
    next();
  },
);
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!roles.includes(req.auth.role))
      return next(new AppError(403, "No tienes permiso para esta acción."));
    next();
  };
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res
      .status(400)
      .json({
        message: "Revisa los campos del formulario.",
        issues: error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res
        .status(409)
        .json({ message: "El registro ya existe o la posición está ocupada." });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ message: "Registro no encontrado." });
      return;
    }
    if (error.code === "P2003") {
      res
        .status(409)
        .json({
          message:
            "Este registro tiene dependencias o una referencia inválida.",
        });
      return;
    }
  }
  if (error?.type === "entity.too.large") {
    res
      .status(413)
      .json({ message: "El contenido supera el tamaño permitido." });
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ message: "JSON inválido." });
    return;
  }
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "unknown",
  );
  res.status(500).json({ message: "No fue posible completar la operación." });
};
