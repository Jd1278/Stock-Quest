import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config/env";
import { router } from "./routes";
import { errorHandler } from "./middlewares";
export const app = express();
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
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
app.use("/api", router);
app.use((_req, res) => {
  res.status(404).json({ message: "Ruta no encontrada." });
});
app.use(errorHandler);
