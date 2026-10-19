process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/stockquest_test";
process.env.JWT_SECRET = "phase5-unit-test-secret-long-enough-2026";
process.env.SIMULATION_BACKEND = "java";
process.env.SIMULATION_SERVICE_TOKEN = "phase5-service-token-for-unit-tests-only";
process.env.SIMULATION_EVENT_TOKEN = "phase5-events-token-for-unit-tests-only";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../app";
import { db, repository } from "../repositories";
import { simulationGateway } from "./simulationGateway";
import { progressService } from "./progressService";
import { consumeSimulationEvent } from "./simulationEvents";
import { simulationService } from "./simulationService";
import * as events from "./simulationEvents";

const token = jwt.sign({ version: 0 }, process.env.JWT_SECRET!, { subject: "learner-1", issuer: "stock-quest", audience: "stock-quest-web" });
beforeEach(() => {
  jest.spyOn(repository, "userById").mockResolvedValue({ id: "learner-1", active: true, role: "APRENDIZ", tokenVersion: 0 } as any);
});
afterEach(() => jest.restoreAllMocks());

test("simulation public routes forward Bearer to Java without reading legacy runs", async () => {
  const legacy = jest.spyOn(db.simulation, "findMany");
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
  const response = await request(app).get("/api/simulations").auth(token, { type: "bearer" });
  expect(response.status).toBe(200); expect(response.body).toEqual([]);
  expect(fetcher.mock.calls[0][0]).toBe("http://127.0.0.1:4010/api/simulations");
  expect((fetcher.mock.calls[0][1]?.headers as any).Authorization).toBe("Bearer " + token);
  expect(legacy).not.toHaveBeenCalled();
});
test("Java outage returns 503 and never falls back to legacy persistence", async () => {
  const legacy = jest.spyOn(db.simulation, "findMany");
  jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  const response = await request(app).get("/api/simulations").auth(token, { type: "bearer" });
  expect(response.status).toBe(503); expect(legacy).not.toHaveBeenCalled();
  await expect(simulationService.list()).rejects.toMatchObject({ status: 503 });
});
test("remote conflicts preserve HTTP status and error envelope", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "Día repetido." }), { status: 409 }));
  const response = await request(app).post("/api/simulations/run-1/decisions").auth(token, { type: "bearer" }).send({ day: 0, quantity: 1 });
  expect(response.status).toBe(409); expect(response.body.message).toBe("Día repetido.");
});
test("progress reads every committed Java score, not old runs or a stale achievement", async () => {
  jest.spyOn(repository, "curriculum").mockResolvedValue([{ id: "m", title: "Tema", lessons: [{ id: "l" }] }] as any);
  jest.spyOn(repository, "completed").mockResolvedValue([{ userId: "learner-1", lessonId: "l" }] as any);
  jest.spyOn(db.challengeAttempt, "findMany").mockResolvedValue([]);
  jest.spyOn(db.userAchievement, "findMany").mockResolvedValue([{ userId: "learner-1", key: "PRIMERA_SIMULACION", earnedAt: new Date("2025-01-01Z") }]);
  const legacy = jest.spyOn(db.simulation, "findMany");
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ userId: "learner-1", completedCount: 101,
    scoreTotal: 8686, hasPassingRun: true, firstCompletedAt: "2026-10-19T00:00:00Z" }), { status: 200 }));
  const report = await progressService.report("learner-1");
  expect(report.simulations).toBe(101); expect(report.xp).toBe(8736); expect(report.passed).toBe(true);
  expect(report.achievements).toHaveLength(1); expect(report.achievements[0].earnedAt.toISOString()).toBe("2026-10-19T00:00:00.000Z");
  expect(legacy).not.toHaveBeenCalled();
});
test("summary rejects another user's or malformed response", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ userId: "other" }), { status: 200 }));
  await expect(simulationGateway.summary("learner-1")).rejects.toMatchObject({ status: 503 });
});
test("administrative composition reads unpublished Java scenarios without querying legacy scenarios", async () => {
  jest.spyOn(repository, "userById").mockResolvedValue({ id: "learner-1", active: true, role: "GESTOR_PEDAGOGICO", tokenVersion: 0 } as any);
  jest.spyOn(db.module, "findMany").mockResolvedValue([{ id: "module-1" }] as any);
  const legacy = jest.spyOn(db.simulationScenario, "findMany");
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([{ id: "draft", published: false }]), { status: 200 }));
  const response = await request(app).get("/api/admin").auth(token, { type: "bearer" });
  expect(response.status).toBe(200); expect(response.body.scenarios[0].published).toBe(false);
  expect(response.body.modules[0].id).toBe("module-1"); expect(legacy).not.toHaveBeenCalled();
});
test("administrative composition fails explicitly instead of returning a partial panel", async () => {
  jest.spyOn(repository, "userById").mockResolvedValue({ id: "learner-1", active: true, role: "GESTOR_PEDAGOGICO", tokenVersion: 0 } as any);
  jest.spyOn(db.module, "findMany").mockResolvedValue([]);
  jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  const response = await request(app).get("/api/admin").auth(token, { type: "bearer" });
  expect(response.status).toBe(503); expect(response.body.modules).toBeUndefined();
});
test("scenario writes are forwarded to Java and never written to the legacy model", async () => {
  jest.spyOn(repository, "userById").mockResolvedValue({ id: "learner-1", active: true, role: "GESTOR_PEDAGOGICO", tokenVersion: 0 } as any);
  const legacy = jest.spyOn(db.simulationScenario, "create");
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "java-new" }), { status: 201 }));
  const body = { title: "Test", description: "Test", initialStock: 10, demand: [5,8,4], leadTime: 2,
    unitCost: 2, salePrice: 5, holdingCost: 1, shortageCost: 3, orderCost: 4, maxOrder: 20, published: true };
  const response = await request(app).post("/api/admin/scenarios").auth(token, { type: "bearer" }).send(body);
  expect(response.status).toBe(201); expect(response.body.id).toBe("java-new"); expect(legacy).not.toHaveBeenCalled();
  expect(fetcher.mock.calls[0][0]).toBe("http://127.0.0.1:4010/api/admin/scenarios");
});
test("internal event ingress rejects requests without a service credential", async () => {
  const consumer = jest.spyOn(events, "consumeSimulationEvent").mockResolvedValue(undefined);
  const response = await request(app).post("/internal/events").send({});
  expect(response.status).toBe(401); expect(consumer).not.toHaveBeenCalled();
});
test("internal event acknowledges only after the consumer resolves", async () => {
  const consumer = jest.spyOn(events, "consumeSimulationEvent").mockResolvedValue(undefined);
  const response = await request(app).post("/internal/events").set("X-StockQuest-Event-Token", process.env.SIMULATION_EVENT_TOKEN!).send({ test: true });
  expect(response.status).toBe(204); expect(consumer).toHaveBeenCalledWith({ test: true });
});
test("consumer deduplicates deliveries and grants the achievement only once", async () => {
  const tx = { simulationEventInbox: { createMany: jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 }), findFirst: jest.fn() },
    userAchievement: { upsert: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 0 }) } };
  jest.spyOn(db, "$transaction").mockImplementation(async (work: any) => work(tx));
  const event = { eventId: "c86acfed-1e73-4d4b-8e16-d629bb79a1aa", type: "SimulacionFinalizada", schemaVersion: 1,
    producer: "simulacion-logistica", occurredAt: "2026-10-19T00:00:00Z", aggregateId: "run-1", aggregateVersion: 3, correlationId: "r",
    data: { simulationId: "run-1", userId: "learner-1", scenarioId: "s", score: 86, profit: 6, serviceRate: 14 / 17, completedAt: "2026-10-19T00:00:00Z" } };
  await consumeSimulationEvent(event);
  const storedHash = tx.simulationEventInbox.createMany.mock.calls[0][0].data[0].payloadHash;
  tx.simulationEventInbox.findFirst.mockResolvedValue({ payloadHash: storedHash });
  await consumeSimulationEvent(event);
  expect(tx.userAchievement.upsert).toHaveBeenCalledTimes(1);
  tx.simulationEventInbox.createMany.mockResolvedValue({ count: 0 });
  tx.simulationEventInbox.findFirst.mockResolvedValue({ payloadHash: "different" });
  await expect(consumeSimulationEvent(event)).rejects.toMatchObject({ status: 409 });
});
