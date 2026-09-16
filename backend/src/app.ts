import express from "express";
import path from "node:path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";
import { router } from "./routes";
import { errorHandler } from "./middlewares";
export const app = express();
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "script-src": ["'self'", "https://www.youtube.com", "https://s.ytimg.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "frame-src": ["https://www.youtube.com", "https://www.youtube-nocookie.com"],
      "img-src": ["'self'", "data:", "https://i.ytimg.com"],
    },
  },
}));
app.use(
  cors({
    origin: config.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "256kb" }));
app.use(
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Espera un momento antes de continuar." },
  }),
);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
// TEMPORARY DIAGNOSTIC — REMOVE AFTER FIXING
app.get("/api/debug", async (_req, res) => {
  const raw = process.env.DATABASE_URL || "(NOT SET)";
  const masked = raw.replace(/:([^@]+)@/, ":****@");
  const info: Record<string, unknown> = {
    DATABASE_URL_masked: masked,
    DATABASE_URL_length: raw.length,
    starts_with_postgresql: raw.startsWith("postgresql://"),
    starts_with_postgres: raw.startsWith("postgres://"),
    has_sslmode: raw.includes("sslmode="),
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET_set: !!process.env.JWT_SECRET,
    JWT_SECRET_length: (process.env.JWT_SECRET || "").length,
  };
  try {
    const { db } = await import("./repositories");
    const count = await db.user.count();
    info.db_connection = "OK";
    info.user_count = count;
  } catch (e: unknown) {
    info.db_connection = "FAILED";
    info.db_error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  res.json(info);
});
app.use("/api", router);
if (process.env.SERVE_WEB === "true") {
  const webRoot = path.resolve(__dirname, "../../frontend/dist");
  app.use(express.static(webRoot));
  app.get("*", (req, res, next) => {
    if (req.path === "/api" || req.path.startsWith("/api/") || path.extname(req.path)) {
      return next();
    }
    res.sendFile(path.join(webRoot, "index.html"));
  });
}
app.use((_req, res) => {
  res.status(404).json({ message: "Ruta no encontrada." });
});
app.use(errorHandler);
