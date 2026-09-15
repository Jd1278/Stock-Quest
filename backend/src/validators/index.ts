import { z } from "zod";
const text = (max: number) => z.string().trim().min(1).max(max);
export const password = z
  .string()
  .min(10)
  .max(72)
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "La contraseña supera 72 bytes.",
  );
export const registration = z
  .object({
    name: text(100),
    document: text(30),
    email: z
      .string()
      .trim()
      .email()
      .max(191)
      .transform((v) => v.toLowerCase()),
    company: text(100),
    password,
  })
  .strict();
export const login = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(100),
  })
  .strict();
export const profile = z
  .object({
    name: text(100).optional(),
    email: z
      .string()
      .trim()
      .email()
      .max(191)
      .transform((v) => v.toLowerCase())
      .optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    password: password.optional(),
    currentPassword: z.string().max(100).optional(),
  })
  .strict();
export const moduleInput = z
  .object({
    title: text(150),
    description: text(5000),
    position: z.number().int().min(1).max(1000),
    published: z.boolean(),
  })
  .strict();
export const lessonInput = z
  .object({
    moduleId: text(100),
    title: text(150),
    body: text(20000),
    position: z.number().int().positive().max(1000),
    minutes: z.number().int().min(1).max(120),
    youtubeId: z
      .string()
      .regex(/^[\w-]{11}$/)
      .optional(),
  })
  .strict();
export const challengeInput = z
  .object({
    lessonId: text(100),
    question: text(3000),
    options: z.array(text(500)).min(2).max(6),
    correctIndex: z.number().int().min(0),
    explanation: text(3000),
  })
  .strict()
  .refine((v) => v.correctIndex < v.options.length, {
    message: "Respuesta fuera de las opciones.",
    path: ["correctIndex"],
  });
export const scenarioInput = z
  .object({
    title: text(150),
    description: text(3000),
    initialStock: z.number().int().min(0).max(10000),
    demand: z
      .array(z.number().int().min(0).max(10000))
      .min(3)
      .max(30)
      .refine((v) => v.some((n) => n > 0), "Incluye demanda positiva."),
    leadTime: z.number().int().min(1).max(10),
    unitCost: z.number().min(0).max(100000),
    salePrice: z.number().positive().max(100000),
    holdingCost: z.number().min(0).max(100000),
    shortageCost: z.number().min(0).max(100000),
    orderCost: z.number().min(0).max(100000),
    maxOrder: z.number().int().positive().max(10000),
    published: z.boolean(),
  })
  .strict()
  .refine((v) => v.salePrice >= v.unitCost, {
    message: "Precio de venta menor al costo unitario.",
    path: ["salePrice"],
  });
export const groupInput = z.object({ name: text(100) }).strict();
export const decisionInput = z
  .object({
    day: z.number().int().min(0).max(29),
    quantity: z.number().int().min(0).max(10000),
  })
  .strict();
