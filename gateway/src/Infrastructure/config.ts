import "dotenv/config";
import { z } from "zod";
const origin = z.string().url().refine(value => {
  const url = new URL(value);
  return (url.protocol === "https:" || (url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)))
    && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
}, "Usa un origen HTTPS o HTTP local sin credenciales, ruta ni parámetros.");
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  return z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default(14600),
    HOST: z.string().default("127.0.0.1"),
    FRONTEND_URL: origin.default("http://127.0.0.1:5174"),
    PEOPLE_SERVICE_URL: origin,
    LEARNING_SERVICE_URL: origin,
    SIMULATION_SERVICE_URL: origin,
    LEARNING_SERVICE_TOKEN: z.string().min(32),
    SIMULATION_SERVICE_TOKEN: z.string().min(32),
    PEOPLE_BACKEND: z.literal("java").optional(),
    LEARNING_BACKEND: z.literal("java").optional(),
    SIMULATION_BACKEND: z.literal("java").optional(),
  }).parse(env);
}
export type GatewayConfig = ReturnType<typeof readConfig>;
