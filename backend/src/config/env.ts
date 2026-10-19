import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "DATABASE_URL debe ser PostgreSQL"),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default("8h"),
  FRONTEND_URL: z.string().url().default(process.env.RENDER_EXTERNAL_URL || "http://localhost:5173"),
  PORT: z.coerce.number().int().positive().default(4000),
  SIMULATION_BACKEND: z.enum(["legacy", "java"]).default("legacy"),
  SIMULATION_SERVICE_URL: z.string().url().default("http://127.0.0.1:4010"),
  SIMULATION_SERVICE_TOKEN: z.string().min(32).max(512).optional(),
  SIMULATION_EVENT_TOKEN: z.string().min(32).max(512).optional(),
  LEARNING_BACKEND: z.enum(["legacy", "java"]).default("legacy"),
  LEARNING_SERVICE_URL: z.string().url().default("http://127.0.0.1:4020"),
  LEARNING_SERVICE_TOKEN: z.string().min(32).max(512).optional(),
  PEOPLE_BACKEND: z.enum(["legacy", "java"]).default("legacy"),
  PEOPLE_SERVICE_URL: z.string().url().default("http://127.0.0.1:4030"),
}).superRefine((value, ctx) => {
  if (value.PEOPLE_BACKEND === "java") {
    if (value.LEARNING_BACKEND !== "java" || value.SIMULATION_BACKEND !== "java")
      ctx.addIssue({ code: "custom", path: ["PEOPLE_BACKEND"], message: "Activa aprendizaje y simulación Java antes de personas Java." });
    const peopleUrl = new URL(value.PEOPLE_SERVICE_URL);
    if ((peopleUrl.protocol !== "https:" && !(peopleUrl.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(peopleUrl.hostname)))
        || peopleUrl.username || peopleUrl.password || peopleUrl.search || peopleUrl.hash || (peopleUrl.pathname !== "/" && peopleUrl.pathname !== ""))
      ctx.addIssue({ code: "custom", path: ["PEOPLE_SERVICE_URL"], message: "Usa un origen HTTPS o loopback HTTP para personas, sin ruta ni credenciales." });
  }
  if (value.LEARNING_BACKEND === "java") {
    if (value.SIMULATION_BACKEND !== "java") ctx.addIssue({ code: "custom", path: ["LEARNING_BACKEND"], message: "Activa simulación Java antes de aprendizaje Java." });
    if (!value.LEARNING_SERVICE_TOKEN) ctx.addIssue({ code: "custom", path: ["LEARNING_SERVICE_TOKEN"], message: "Configura la credencial de aprendizaje." });
    const learningUrl = new URL(value.LEARNING_SERVICE_URL);
    if ((learningUrl.protocol !== "https:" && !(learningUrl.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(learningUrl.hostname)))
        || learningUrl.username || learningUrl.password || learningUrl.search || learningUrl.hash || (learningUrl.pathname !== "/" && learningUrl.pathname !== ""))
      ctx.addIssue({ code: "custom", path: ["LEARNING_SERVICE_URL"], message: "Usa un origen HTTPS o loopback HTTP, sin ruta ni credenciales." });
  }
  if (value.SIMULATION_BACKEND !== "java") return;
  for (const key of ["SIMULATION_SERVICE_TOKEN", "SIMULATION_EVENT_TOKEN"] as const)
    if (!value[key]) ctx.addIssue({ code: "custom", path: [key], message: "Configura las credenciales del puente Java." });
  const url = new URL(value.SIMULATION_SERVICE_URL);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
      || url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== ""))
    ctx.addIssue({ code: "custom", path: ["SIMULATION_SERVICE_URL"], message: "Usa un origen HTTPS o loopback HTTP, sin ruta ni credenciales." });
});
export const config = schema.parse(process.env);
