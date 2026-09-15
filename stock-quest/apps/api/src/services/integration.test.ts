// Real PostgreSQL integration. Runs only against an explicit isolated test database.
import request from "supertest";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { app } from "../app";
import { db } from "../repositories";
jest.setTimeout(30000);
const suite = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
suite("Persisted learning workflow and role isolation", () => {
  const tag = randomUUID().slice(0, 8),
    password = "Integration-test-password-2026";
  let userId = "",
    token = "",
    otherId = "",
    otherToken = "",
    leaderId = "",
    leaderToken = "",
    managerId = "",
    managerToken = "",
    moduleId = "",
    lessonId = "",
    nextLessonId = "",
    challengeId = "",
    scenarioId = "",
    runId = "",
    groupId = "";
  beforeAll(async () => {
    const name = new URL(process.env.DATABASE_URL!).pathname;
    if (!/^\/(sq_test_|stockquest_test)/.test(name) && !/^sq_test_[a-z0-9]+$/.test(new URL(process.env.DATABASE_URL!).searchParams.get("schema") ?? ""))
      throw new Error("Integration tests require a dedicated test database.");
    const module = await db.module.create({
      data: {
        title: "Integration " + tag,
        description: "Fixture",
        position: 999,
        published: true,
      },
    });
    moduleId = module.id;
    const lesson = await db.lesson.create({
      data: { moduleId, title: "One", body: "Learn", position: 1 },
    });
    lessonId = lesson.id;
    nextLessonId = (
      await db.lesson.create({
        data: { moduleId, title: "Two", body: "Learn more", position: 2 },
      })
    ).id;
    challengeId = (
      await db.challenge.create({
        data: {
          lessonId,
          question: "5 × 2?",
          options: ["10", "20"],
          correctIndex: 0,
          explanation: "5 × 2 = 10",
        },
      })
    ).id;
    scenarioId = (
      await db.simulationScenario.create({
        data: {
          title: "Test",
          description: "Test",
          initialStock: 10,
          demand: [5, 8, 4],
          leadTime: 2,
          unitCost: 2,
          salePrice: 5,
          holdingCost: 1,
          shortageCost: 3,
          orderCost: 4,
          maxOrder: 20,
          published: true,
        },
      })
    ).id;
    const passwordHash = await bcrypt.hash(password, 4);
    leaderId = (
      await db.user.create({
        data: {
          name: "Leader",
          email: `leader-${tag}@example.com`,
          document: "l-" + tag,
          company: "Test",
          passwordHash,
          role: "LIDER",
        },
      })
    ).id;
    managerId = (
      await db.user.create({
        data: {
          name: "Manager",
          email: `manager-${tag}@example.com`,
          document: "m-" + tag,
          company: "Test",
          passwordHash,
          role: "GESTOR_PEDAGOGICO",
        },
      })
    ).id;
    leaderToken = (
      await request(app)
        .post("/api/auth/login")
        .send({ email: `leader-${tag}@example.com`, password })
    ).body.token;
    managerToken = (
      await request(app)
        .post("/api/auth/login")
        .send({ email: `manager-${tag}@example.com`, password })
    ).body.token;
  }, 30000);
  afterAll(async () => {
    if (runId) await db.simulation.deleteMany({ where: { id: runId } });
    if (groupId) await db.trainingGroup.deleteMany({ where: { id: groupId } });
    await db.user.deleteMany({
      where: {
        id: { in: [userId, otherId, leaderId, managerId].filter(Boolean) },
      },
    });
    if (challengeId)
      await db.challenge.deleteMany({ where: { id: challengeId } });
    if (moduleId) {
      await db.lesson.deleteMany({ where: { moduleId } });
      await db.module.deleteMany({ where: { id: moduleId } });
    }
    if (scenarioId)
      await db.simulationScenario.deleteMany({ where: { id: scenarioId } });
    await db.$disconnect();
  });
  test("register → login → profile with bcrypt and no privileged registration", async () => {
    const values = {
      name: "Learner",
      document: "u-" + tag,
      email: `user-${tag}@example.com`,
      company: "Test",
      password,
    };
    const registered = await request(app)
      .post("/api/auth/register")
      .send(values);
    expect(registered.status).toBe(201);
    userId = registered.body.id;
    expect(registered.body.passwordHash).toBeUndefined();
    const stored = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await bcrypt.compare(password, stored.passwordHash)).toBe(true);
    expect(stored.passwordHash).not.toBe(password);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: values.email, password });
    expect(login.status).toBe(200);
    token = login.body.token;
    expect(
      (await request(app).get("/api/auth/me").auth(token, { type: "bearer" }))
        .body.id,
    ).toBe(userId);
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .send({ ...values, email: `hack-${tag}@example.com`, role: "LIDER" })
      ).status,
    ).toBe(400);
  });
  test("prerequisites and server scoring protect progress; completion is idempotent", async () => {
    expect(
      (
        await request(app)
          .get("/api/lessons/" + nextLessonId)
          .auth(token, { type: "bearer" })
      ).status,
    ).toBe(403);
    const path = await request(app)
      .get("/api/modules")
      .auth(token, { type: "bearer" });
    expect(path.body[0].lessons[0].challenges[0].correctIndex).toBeUndefined();
    expect(
      (
        await request(app)
          .post(`/api/lessons/${lessonId}/complete`)
          .auth(token, { type: "bearer" })
      ).status,
    ).toBe(400);
    const answer = await request(app)
      .post(`/api/challenges/${challengeId}/attempts`)
      .auth(token, { type: "bearer" })
      .send({ answer: 0 });
    expect(answer.body.score).toBe(100);
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request(app)
            .post(`/api/lessons/${lessonId}/complete`)
            .auth(token, { type: "bearer" })
        ).status,
      ).toBe(200);
    expect(
      await db.learningProgress.count({ where: { userId, lessonId } }),
    ).toBe(1);
    expect(
      (
        await request(app)
          .get("/api/lessons/" + nextLessonId)
          .auth(token, { type: "bearer" })
      ).status,
    ).toBe(200);
  });
  test("simulation preserves snapshot, rejects stale decisions, and persists results", async () => {
    const started = await request(app)
      .post("/api/simulations")
      .auth(token, { type: "bearer" })
      .send({ scenarioId });
    expect(started.status).toBe(201);
    runId = started.body.id;
    await db.simulationScenario.update({
      where: { id: scenarioId },
      data: { initialStock: 999 },
    });
    expect(
      (
        await request(app)
          .get("/api/simulations/" + runId)
          .auth(token, { type: "bearer" })
      ).body.initialStock,
    ).toBe(10);
    expect(
      (
        await request(app)
          .post(`/api/simulations/${runId}/decisions`)
          .auth(token, { type: "bearer" })
          .send({ day: 0, quantity: 21 })
      ).status,
    ).toBe(400);
    const simultaneous = await Promise.all(
      [0, 1].map(() =>
        request(app)
          .post(`/api/simulations/${runId}/decisions`)
          .auth(token, { type: "bearer" })
          .send({ day: 0, quantity: 10 }),
      ),
    );
    expect(simultaneous.map((r) => r.status).sort()).toEqual([200, 409]);
    await request(app)
      .post(`/api/simulations/${runId}/decisions`)
      .auth(token, { type: "bearer" })
      .send({ day: 1, quantity: 0 });
    const ended = await request(app)
      .post(`/api/simulations/${runId}/decisions`)
      .auth(token, { type: "bearer" })
      .send({ day: 2, quantity: 0 });
    expect(ended.body.finished).toBe(true);
    expect(ended.body.profit).toBe(6);
    expect(ended.body.score).toBeGreaterThanOrEqual(70);
    expect(
      await db.simulationResult.count({ where: { simulationId: runId } }),
    ).toBe(1);
    const progress = await request(app)
      .get("/api/progress")
      .auth(token, { type: "bearer" });
    expect(progress.body.completed).toBe(1);
    expect(progress.body.simulations).toBe(1);
    expect(progress.body.achievements).toHaveLength(2);
  });
  test("leader cannot read or assign an unrelated learner and learners cannot manage content", async () => {
    expect(
      (await request(app).get("/api/admin").auth(token, { type: "bearer" }))
        .status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get("/api/reports/" + userId)
          .auth(leaderToken, { type: "bearer" })
      ).status,
    ).toBe(404);
    const group = await request(app)
      .post("/api/groups")
      .auth(leaderToken, { type: "bearer" })
      .send({ name: "Group " + tag });
    expect(group.status).toBe(201);
    groupId = group.body.id;
    expect(
      (
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .auth(leaderToken, { type: "bearer" })
          .send({ userId })
      ).status,
    ).toBe(404);
    const employee = await request(app)
      .post("/api/users")
      .auth(leaderToken, { type: "bearer" })
      .send({
        name: "Other",
        document: "o-" + tag,
        email: `other-${tag}@example.com`,
        company: "Test",
        password,
      });
    expect(employee.status).toBe(201);
    otherId = employee.body.id;
    expect(
      (
        await request(app)
          .post(`/api/groups/${groupId}/members`)
          .auth(leaderToken, { type: "bearer" })
          .send({ userId: otherId })
      ).status,
    ).toBe(200);
    otherToken = (
      await request(app)
        .post("/api/auth/login")
        .send({ email: `other-${tag}@example.com`, password })
    ).body.token;
    expect(
      (
        await request(app)
          .get("/api/simulations/" + runId)
          .auth(otherToken, { type: "bearer" })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get("/api/reports/" + otherId)
          .auth(leaderToken, { type: "bearer" })
      ).status,
    ).toBe(200);
  });
  test("pedagogical manager reaches content routes and can update scenarios", async () => {
    expect(
      (
        await request(app)
          .get("/api/admin")
          .auth(managerToken, { type: "bearer" })
      ).status,
    ).toBe(200);
    const scenario = await db.simulationScenario.findUniqueOrThrow({
      where: { id: scenarioId },
    });
    const { id: _id, ...body } = scenario;
    expect(
      (
        await request(app)
          .put("/api/admin/scenarios/" + scenarioId)
          .auth(managerToken, { type: "bearer" })
          .send({ ...body, initialStock: 20 })
      ).status,
    ).toBe(200);
  });
  test("logout revokes the Bearer token on the server", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/logout")
          .auth(token, { type: "bearer" })
      ).status,
    ).toBe(204);
    expect(
      (await request(app).get("/api/auth/me").auth(token, { type: "bearer" }))
        .status,
    ).toBe(401);
  });
});


