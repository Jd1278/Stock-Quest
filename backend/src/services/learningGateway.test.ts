process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/stockquest_test";
process.env.JWT_SECRET = "phase5b-unit-test-secret-long-enough-2026";
process.env.SIMULATION_BACKEND = "java";
process.env.SIMULATION_SERVICE_TOKEN = "phase5b-simulation-token-for-unit-tests";
process.env.SIMULATION_EVENT_TOKEN = "phase5b-events-token-for-unit-tests-only";
process.env.LEARNING_BACKEND = "java";
process.env.LEARNING_SERVICE_TOKEN = "phase5b-learning-token-for-unit-tests-only";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../app";
import { db, repository } from "../repositories";
import { learningGateway } from "./learningGateway";
import { learningService } from "./learningService";
import { consumeSimulationEvent } from "./simulationEvents";
import { progressService } from "./progressService";

const token = jwt.sign({ version: 0 }, process.env.JWT_SECRET!, { subject: "learner-1", issuer: "stock-quest", audience: "stock-quest-web" });
const progress = { completed: 0, total: 0, percent: 0, xp: 86, level: 1, simulations: 1, passed: false, topics: [], achievements: [], recommendations: [] };
beforeEach(() => { jest.spyOn(repository, "userById").mockResolvedValue({ id: "learner-1", active: true, role: "APRENDIZ", tokenVersion: 0 } as any); });
afterEach(() => jest.restoreAllMocks());

test("learning routes forward Bearer without querying the legacy curriculum", async () => {
  const legacy = jest.spyOn(repository, "curriculum");
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", { status: 200 }));
  const response = await request(app).get("/api/modules").auth(token, { type: "bearer" });
  expect(response.status).toBe(200);expect(response.body).toEqual([]);expect(legacy).not.toHaveBeenCalled();
  expect(fetcher.mock.calls[0][0]).toBe("http://127.0.0.1:4020/api/modules");
  expect((fetcher.mock.calls[0][1]?.headers as any).Authorization).toBe("Bearer " + token);
});
test("outage returns 503 without legacy reads or writes", async () => {
  const legacy = jest.spyOn(db.learningProgress, "upsert");
  jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  const response = await request(app).post("/api/lessons/l/complete").auth(token, { type: "bearer" });
  expect(response.status).toBe(503);expect(legacy).not.toHaveBeenCalled();
  await expect(learningService.complete("learner-1", "l")).rejects.toMatchObject({ status: 503 });
});
test("challenge submissions preserve body and 201 response", async () => {
  const legacy = jest.spyOn(db.challengeAttempt, "create");
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "a", score: 100, passed: true, feedback: "Bien", attempt: 1 }), { status: 201 }));
  const response = await request(app).post("/api/challenges/c/attempts").auth(token, { type: "bearer" }).send({ answer: 1 });
  expect(response.status).toBe(201);expect(response.body.score).toBe(100);expect(legacy).not.toHaveBeenCalled();
  expect(fetcher.mock.calls[0][1]?.body).toBe('{"answer":1}');
});
test("learner cannot use administrative learning writes", async () => {
  const fetcher = jest.spyOn(globalThis, "fetch");
  const response = await request(app).post("/api/admin/modules").auth(token, { type: "bearer" }).send({});
  expect(response.status).toBe(403);expect(fetcher).not.toHaveBeenCalled();
});
test("progress uses the Java learning report and no legacy attempts", async () => {
  const legacy = jest.spyOn(db.challengeAttempt, "findMany");
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ userId: "learner-1", progress, activities: [] }), { status: 200 }));
  const result = await progressService.report("learner-1");
  expect(result.xp).toBe(86);expect(legacy).not.toHaveBeenCalled();
});
test("internal report rejects a response for another user", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ userId: "other", progress, activities: [] }), { status: 200 }));
  await expect(learningGateway.report("learner-1")).rejects.toMatchObject({ status: 503 });
});
test("events are acknowledged only after Java inbox confirms and never written in legacy", async () => {
  const legacy = jest.spyOn(db.simulationEventInbox, "createMany");
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  const response = await request(app).post("/internal/events").set("X-StockQuest-Event-Token", process.env.SIMULATION_EVENT_TOKEN!).send({ eventId: "fixture" });
  expect(response.status).toBe(204);expect(legacy).not.toHaveBeenCalled();
  await expect(consumeSimulationEvent({})).rejects.toMatchObject({ status: 503 });
});
test("an unavailable inbox is not falsely acknowledged", async () => {
  jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  const response = await request(app).post("/internal/events").set("X-StockQuest-Event-Token", process.env.SIMULATION_EVENT_TOKEN!).send({});
  expect(response.status).toBe(503);
});
test("team membership is checked before an internal learning report", async () => {
  jest.spyOn(repository, "userById").mockResolvedValue({ id: "leader", active: true, role: "LIDER", tokenVersion: 0 } as any);
  jest.spyOn(db.user, "findFirst").mockResolvedValue(null);
  const fetcher = jest.spyOn(globalThis, "fetch");
  const response = await request(app).get("/api/reports/other").auth(token, { type: "bearer" });
  expect(response.status).toBe(404);expect(fetcher).not.toHaveBeenCalled();
});
