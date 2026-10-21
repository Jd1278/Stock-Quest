import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../app";
import { db } from "../repositories";

const suite = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
suite("Legacy administrative deletion preserves referenced history", () => {
  const tag = randomUUID(), userId = "delete-it-" + tag;
  let token: string, moduleId: string, lessonId: string, challengeId: string, scenarioId: string;
  beforeAll(async () => {
    if (!/^\/(sq_test_|stockquest_test)[A-Za-z0-9_]*$/.test(new URL(process.env.DATABASE_URL!).pathname)) throw new Error("Use an exclusive test database.");
    await db.user.create({ data: { id: userId, name: "Deletion test", document: tag.slice(0, 30), email: tag + "@example.test", company: "Test", role: "GESTOR_PEDAGOGICO", passwordHash: "fixture-not-a-login" } });
    token = jwt.sign({ version: 0 }, process.env.JWT_SECRET!, { subject: userId, issuer: "stock-quest", audience: "stock-quest-web" });
  });
  beforeEach(async () => {
    moduleId = lessonId = challengeId = scenarioId = "";
    const m = await db.module.create({ data: { title: "Deletion fixture", description: "Test", position: 888, published: false } });moduleId = m.id;
    const l = await db.lesson.create({ data: { moduleId, title: "Fixture", body: "Text", position: 1 } });lessonId = l.id;
    challengeId = (await db.challenge.create({ data: { lessonId, question: "A?", options: ["A", "B"], correctIndex: 0, explanation: "A" } })).id;
    await db.content.create({ data: { lessonId, title: "Video", youtubeId: "abcdefghijk" } });
    scenarioId = (await db.simulationScenario.create({ data: { title: "Deletion fixture", description: "Test", initialStock: 10, demand: [1, 2, 3], leadTime: 1, unitCost: 1, salePrice: 2, holdingCost: 0, shortageCost: 0, orderCost: 0, maxOrder: 10 } })).id;
  });
  afterEach(async () => {
    if (scenarioId) {
      await db.simulation.deleteMany({ where: { scenarioId } });
      await db.simulationScenario.deleteMany({ where: { id: scenarioId } });
    }
    await db.challengeAttempt.deleteMany({ where: { userId } });
    await db.learningProgress.deleteMany({ where: { userId } });
    if (lessonId) await db.challenge.deleteMany({ where: { lessonId } });
    if (moduleId) {
      await db.lesson.deleteMany({ where: { moduleId } });
      await db.module.deleteMany({ where: { id: moduleId } });
    }
  });
  afterAll(async () => { await db.user.deleteMany({ where: { id: userId } });await db.$disconnect(); });
  test("unused module deletes its child content, and repeated deletion is 404", async () => {
    expect((await request(app).delete("/api/admin/modules/" + moduleId).auth(token, { type: "bearer" })).status).toBe(204);
    expect(await db.challenge.findUnique({ where: { id: challengeId } })).toBeNull();
    expect((await request(app).delete("/api/admin/modules/" + moduleId).auth(token, { type: "bearer" })).status).toBe(404);
  });
  test("attempts prevent deletion", async () => {
    await db.challengeAttempt.create({ data: { userId, challengeId, answer: 0, score: 100 } });
    expect((await request(app).delete("/api/admin/modules/" + moduleId).auth(token, { type: "bearer" })).status).toBe(409);
    expect(await db.challengeAttempt.count({ where: { userId } })).toBe(1);
    expect(await db.module.findUnique({ where: { id: moduleId } })).not.toBeNull();
  });
  test("progress conflicts roll back previously deleted challenges", async () => {
    await db.learningProgress.create({ data: { userId, lessonId } });
    expect((await request(app).delete("/api/admin/modules/" + moduleId).auth(token, { type: "bearer" })).status).toBe(409);
    expect(await db.challenge.findUnique({ where: { id: challengeId } })).not.toBeNull();
    expect(await db.learningProgress.count({ where: { userId } })).toBe(1);
  });
  test.each(["lessons", "challenges"])("unused %s can be deleted without removing the module", async (kind) => {
    const id = kind === "lessons" ? lessonId : challengeId;
    expect((await request(app).delete(`/api/admin/${kind}/${id}`).auth(token, { type: "bearer" })).status).toBe(204);
    expect(await db.module.findUnique({ where: { id: moduleId } })).not.toBeNull();
    expect(await db.challenge.findUnique({ where: { id: challengeId } })).toBeNull();
    if (kind === "challenges") expect(await db.lesson.findUnique({ where: { id: lessonId } })).not.toBeNull();
    expect((await request(app).delete(`/api/admin/${kind}/${id}`).auth(token, { type: "bearer" })).status).toBe(404);
  });
  test.each(["lessons", "challenges"])("attempts prevent deletion of %s", async (kind) => {
    await db.challengeAttempt.create({ data: { userId, challengeId, answer: 0, score: 100 } });
    const id = kind === "lessons" ? lessonId : challengeId;
    expect((await request(app).delete(`/api/admin/${kind}/${id}`).auth(token, { type: "bearer" })).status).toBe(409);
    expect(await db.challengeAttempt.count({ where: { userId } })).toBe(1);
    expect(await db.challenge.findUnique({ where: { id: challengeId } })).not.toBeNull();
  });
  test("lesson progress conflict rolls back challenge deletion", async () => {
    await db.learningProgress.create({ data: { userId, lessonId } });
    expect((await request(app).delete(`/api/admin/lessons/${lessonId}`).auth(token, { type: "bearer" })).status).toBe(409);
    expect(await db.challenge.findUnique({ where: { id: challengeId } })).not.toBeNull();
    expect(await db.content.count({ where: { lessonId } })).toBe(1);
    expect(await db.learningProgress.count({ where: { userId } })).toBe(1);
  });
  test("scenario can be deleted only without games", async () => {
    const run = await db.simulation.create({ data: { userId, scenarioId, snapshot: {}, decisions: [] } });
    expect((await request(app).delete("/api/admin/scenarios/" + scenarioId).auth(token, { type: "bearer" })).status).toBe(409);
    expect(await db.simulation.findUnique({ where: { id: run.id } })).not.toBeNull();
    await db.simulation.delete({ where: { id: run.id } });
    expect((await request(app).delete("/api/admin/scenarios/" + scenarioId).auth(token, { type: "bearer" })).status).toBe(204);
    expect((await request(app).delete("/api/admin/scenarios/" + scenarioId).auth(token, { type: "bearer" })).status).toBe(404);
  });
});
