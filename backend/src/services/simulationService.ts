import { Prisma } from "@prisma/client";
import { db, AppError } from "../repositories";
import { scenarioInput } from "../validators";
import { evaluate } from "./simulationEngine";
function view(run: any) {
  const s = scenarioInput.parse(run.snapshot);
  const orders = run.decisions as number[];
  const evaluation = evaluate(s, orders);
  return {
    id: run.id,
    day: run.day,
    days: s.demand.length,
    title: s.title,
    description: s.description,
    initialStock: s.initialStock,
    leadTime: s.leadTime,
    unitCost: s.unitCost,
    salePrice: s.salePrice,
    holdingCost: s.holdingCost,
    shortageCost: s.shortageCost,
    orderCost: s.orderCost,
    maxOrder: s.maxOrder,
    demandRange: [Math.min(...s.demand), Math.max(...s.demand)],
    ...evaluation,
    pending: orders
      .map((quantity, day) => ({ quantity, arrivalDay: day + s.leadTime + 1 }))
      .filter((x) => x.quantity > 0 && x.arrivalDay > orders.length),
    finished: run.day >= s.demand.length,
    result: run.result ?? null,
  };
}
export const simulationService = {
  async list() {
    return db.simulationScenario.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        description: true,
        initialStock: true,
        leadTime: true,
      },
    });
  },
  async start(userId: string, scenarioId: string) {
    const s = await db.simulationScenario.findUnique({
      where: { id: scenarioId },
    });
    if (!s?.published) throw new AppError(404, "Escenario no disponible.");
    const { id: _id, ...values } = s;
    const snapshot = scenarioInput.parse(values);
    const run = await db.simulation.create({
      data: {
        userId,
        scenarioId,
        snapshot: snapshot as Prisma.InputJsonValue,
        decisions: [],
      },
    });
    return view(run);
  },
  async get(userId: string, id: string) {
    const run = await db.simulation.findFirst({
      where: { id, userId },
      include: { result: true },
    });
    if (!run) throw new AppError(404, "Simulación no encontrada.");
    return view(run);
  },
  async decide(userId: string, id: string, day: number, quantity: number) {
    return db.$transaction(async (tx) => {
      const run = await tx.simulation.findFirst({
        where: { id, userId },
        include: { result: true },
      });
      if (!run) throw new AppError(404, "Simulación no encontrada.");
      const s = scenarioInput.parse(run.snapshot);
      if (run.day !== day || run.result || day >= s.demand.length)
        throw new AppError(
          409,
          "El día ya fue procesado. Actualiza la simulación.",
        );
      if (quantity > s.maxOrder)
        throw new AppError(400, `El pedido máximo es ${s.maxOrder}.`);
      const decisions = [...(run.decisions as number[]), quantity];
      const changed = await tx.simulation.updateMany({
        where: { id, userId, day },
        data: { day: day + 1, decisions },
      });
      if (changed.count !== 1)
        throw new AppError(409, "La decisión ya fue procesada.");
      if (decisions.length === s.demand.length) {
        const result = evaluate(s, decisions);
        await tx.simulationResult.create({
          data: {
            simulationId: id,
            score: result.score,
            profit: result.profit,
            serviceRate: result.serviceRate,
            feedback: result.feedback,
            timeline: result.timeline as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.userAchievement.upsert({
          where: { userId_key: { userId, key: "PRIMERA_SIMULACION" } },
          create: { userId, key: "PRIMERA_SIMULACION" },
          update: {},
        });
      }
      return view(
        await tx.simulation.findUniqueOrThrow({
          where: { id },
          include: { result: true },
        }),
      );
    });
  },
  async history(userId: string) {
    return db.simulation.findMany({
      where: { userId },
      select: {
        id: true,
        day: true,
        createdAt: true,
        scenario: { select: { title: true } },
        result: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  },
};
