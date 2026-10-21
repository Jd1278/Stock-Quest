import { randomUUID } from "node:crypto";
import { db } from "../repositories";
import { consumeSimulationEvent } from "./simulationEvents";

const suite = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
suite("Simulation event inbox with real isolated PostgreSQL", () => {
  const tag = randomUUID();
  // User.document is VARCHAR(30); keep the random fixture within that limit.
  const document = tag.replace(/-/g, "").slice(0, 30);
  const userId = "event-it-" + tag;
  let prepared = false;
  const event = (simulationId: string, targetUser = userId) => ({
    eventId: randomUUID(), type: "SimulacionFinalizada", schemaVersion: 1, producer: "simulacion-logistica",
    occurredAt: "2026-10-19T00:00:00Z", aggregateId: simulationId, aggregateVersion: 3, correlationId: "integration",
    data: { simulationId, userId: targetUser, scenarioId: "java-owned", score: 86, profit: 6, serviceRate: 14 / 17, completedAt: "2026-10-19T00:00:00Z" },
  });
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!/^\/(sq_test_|stockquest_test)[A-Za-z0-9_]*$/.test(url.pathname)) throw new Error("Event integration requires an exclusive test database.");
    await db.user.create({ data: { id: userId, name: "Event test", document, email: tag + "@example.test", company: "Test", passwordHash: "fixture-not-a-login-account" } });
    prepared = true;
  });
  afterAll(async () => {
    if (prepared) {
      await db.simulationEventInbox.deleteMany({ where: { userId: { in: [userId, "missing-" + tag] } } });
      await db.user.delete({ where: { id: userId } });
    }
    await db.$disconnect();
  });
  test("concurrent duplicate deliveries persist one inbox entry and one achievement", async () => {
    const payload = event("sim-" + tag);
    await Promise.all([consumeSimulationEvent(payload), consumeSimulationEvent(payload)]);
    expect(await db.simulationEventInbox.count({ where: { simulationId: payload.data.simulationId } })).toBe(1);
    expect(await db.userAchievement.count({ where: { userId, key: "PRIMERA_SIMULACION" } })).toBe(1);
    await expect(consumeSimulationEvent({ ...payload, data: { ...payload.data, score: 85 } })).rejects.toMatchObject({ status: 409 });
  });
  test("failure to grant an achievement rolls back the inbox insertion", async () => {
    const payload = event("missing-sim-" + tag, "missing-" + tag);
    await expect(consumeSimulationEvent(payload)).rejects.toBeDefined();
    expect(await db.simulationEventInbox.count({ where: { eventId: payload.eventId } })).toBe(0);
  });
});
