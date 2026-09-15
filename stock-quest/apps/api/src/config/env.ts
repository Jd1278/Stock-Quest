import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "DATABASE_URL debe ser PostgreSQL"),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default("8h"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  PORT: z.coerce.number().int().positive().default(4000),
});
export const config = schema.parse(process.env);
