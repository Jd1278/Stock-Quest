import { createHash } from "node:crypto";
import { z } from "zod";
import { db, AppError } from "../repositories";
import { requireLegacyLearning } from "./learningGateway";

const eventSchema = z.object({
  eventId: z.string().uuid(), type: z.literal("SimulacionFinalizada"), schemaVersion: z.literal(1),
  producer: z.literal("simulacion-logistica"), occurredAt: z.string().datetime({ offset: true }),
  aggregateId: z.string().min(1).max(100), aggregateVersion: z.number().int().min(1),
  correlationId: z.string().min(1).max(100),
  data: z.object({
    simulationId: z.string().min(1).max(100), userId: z.string().min(1).max(100), scenarioId: z.string().min(1).max(100),
    score: z.number().int().min(0).max(100), profit: z.number().finite(), serviceRate: z.number().min(0).max(1),
    completedAt: z.string().datetime({ offset: true }),
  }).strict(),
}).strict().refine(e => e.aggregateId === e.data.simulationId, "Agregado de evento inválido.");

export async function consumeSimulationEvent(body: unknown) {
  requireLegacyLearning();
  const event = eventSchema.parse(body);
  const payloadHash = createHash("sha256").update(JSON.stringify(event)).digest("hex");
  return db.$transaction(async tx => {
    const inserted = await tx.simulationEventInbox.createMany({
      data: [{ eventId: event.eventId, simulationId: event.data.simulationId, userId: event.data.userId, payloadHash }], skipDuplicates: true,
    });
    if (inserted.count === 0) {
      const previous = await tx.simulationEventInbox.findFirst({ where: { OR: [{ eventId: event.eventId }, { simulationId: event.data.simulationId }] } });
      if (!previous || previous.payloadHash !== payloadHash) throw new AppError(409, "Identificador de evento reutilizado con otro contenido.");
      return;
    }
    const earnedAt = new Date(event.data.completedAt);
    await tx.userAchievement.upsert({
      where: { userId_key: { userId: event.data.userId, key: "PRIMERA_SIMULACION" } },
      create: { userId: event.data.userId, key: "PRIMERA_SIMULACION", earnedAt }, update: {},
    });
    await tx.userAchievement.updateMany({ where: { userId: event.data.userId, key: "PRIMERA_SIMULACION", earnedAt: { gt: earnedAt } }, data: { earnedAt } });
  });
}
