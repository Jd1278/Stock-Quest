process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/stockquest_test";
process.env.JWT_SECRET = "phase5c-unused-edge-secret-at-least-32-bytes";
process.env.SIMULATION_BACKEND = "java";
process.env.LEARNING_BACKEND = "java";
process.env.PEOPLE_BACKEND = "java";
process.env.SIMULATION_SERVICE_TOKEN = "phase5c-simulation-token-for-unit-tests-only";
process.env.SIMULATION_EVENT_TOKEN = "phase5c-event-token-for-unit-tests-only";
process.env.LEARNING_SERVICE_TOKEN = "phase5c-learning-token-for-unit-tests-only";
import request from "supertest";
import { app } from "../app";
import { db, repository } from "../repositories";
import { authService } from "./authService";
import { peopleGateway } from "./peopleGateway";

const user = { id: "java-user", name: "User", document: "doc", email: "user@example.test", company: "Test", phone: null,
  role: "APRENDIZ", active: true, createdAt: "2026-10-19T00:00:00Z" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => jest.restoreAllMocks());

test("registration is written only by Java", async () => {
  const legacy = jest.spyOn(db.user, "create");
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValue(json(user, 201));
  const response = await request(app).post("/api/auth/register").send({ name: "User", document: "doc", email: "user@example.test", company: "Test", password: "password-for-unit-test" });
  expect(response.status).toBe(201);expect(legacy).not.toHaveBeenCalled();expect(fetcher.mock.calls[0][0]).toBe("http://127.0.0.1:4030/api/auth/register");
});
test("login relays the Java session without accessing legacy accounts", async () => {
  const legacy = jest.spyOn(repository, "userByEmail");
  jest.spyOn(globalThis, "fetch").mockResolvedValue(json({ token: "java-token", user }));
  const response = await request(app).post("/api/auth/login").send({ email: user.email, password: "test" });
  expect(response.status).toBe(200);expect(response.body.token).toBe("java-token");expect(legacy).not.toHaveBeenCalled();
});
test("authentication delegates revocation to Java without reading Prisma", async () => {
  const legacy = jest.spyOn(repository, "userById");
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(json(user)).mockResolvedValueOnce(json(user));
  const response = await request(app).get("/api/auth/me").set("Authorization", "Bearer opaque-java-session");
  expect(response.status).toBe(200);expect(legacy).not.toHaveBeenCalled();
  expect((fetcher.mock.calls[0][1]?.headers as any).Authorization).toBe("Bearer opaque-java-session");
});
test("revoked session stays 401 and never falls back", async () => {
  const legacy = jest.spyOn(repository, "userById");
  jest.spyOn(globalThis, "fetch").mockResolvedValue(json({ message: "Sesión no disponible." }, 401));
  const response = await request(app).get("/api/modules").set("Authorization", "Bearer revoked");
  expect(response.status).toBe(401);expect(legacy).not.toHaveBeenCalled();
});
test("identity outage produces 503", async () => {
  jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  const response = await request(app).get("/api/groups").set("Authorization", "Bearer valid");
  expect(response.status).toBe(503);
});
test("missing Bearer does not query identity or legacy users", async () => {
  const fetcher = jest.spyOn(globalThis, "fetch");
  const response = await request(app).get("/api/groups");expect(response.status).toBe(401);expect(fetcher).not.toHaveBeenCalled();
});
test("logout preserves 204 and avoids legacy writes", async () => {
  const legacy = jest.spyOn(db.user, "update");
  jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(json(user)).mockResolvedValueOnce(new Response(null, { status: 204 }));
  const response = await request(app).post("/api/auth/logout").set("Authorization", "Bearer valid");
  expect(response.status).toBe(204);expect(legacy).not.toHaveBeenCalled();
});
test("remote profile validation strips private fields", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(json({ ...user, passwordHash: "private", tokenVersion: 4 }));
  const identity = await peopleGateway.identity("Bearer valid");expect(identity).not.toHaveProperty("passwordHash");expect(identity).not.toHaveProperty("tokenVersion");
});
test("legacy account writers are explicitly blocked", async () => {
  const legacy = jest.spyOn(db.user, "create");
  await expect(authService.register({ name: "User", document: "D", email: user.email, company: "C", password: "password-for-unit-test" })).rejects.toMatchObject({ status: 503 });
  expect(legacy).not.toHaveBeenCalled();
});

test("one correlation id reaches identity, the operation and the response", async () => {
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(json(user)).mockResolvedValueOnce(new Response(null, { status: 204 }));
  const response = await request(app).post("/api/auth/logout").set("Authorization", "Bearer valid").set("X-Correlation-Id", "phase5c-review-123");
  expect(response.status).toBe(204);
  expect(response.headers["x-correlation-id"]).toBe("phase5c-review-123");
  expect(fetcher).toHaveBeenCalledTimes(2);
  for (const [, options] of fetcher.mock.calls) expect(new Headers(options?.headers).get("X-Correlation-Id")).toBe("phase5c-review-123");
});

test("invalid correlation ids are replaced and preserved on upstream failure", async () => {
  const fetcher = jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  const response = await request(app).get("/api/groups").set("Authorization", "Bearer valid").set("X-Correlation-Id", "invalid id");
  expect(response.status).toBe(503);
  expect(response.headers["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("X-Correlation-Id")).toBe(response.headers["x-correlation-id"]);
});

test("public login receives a generated correlation id and browsers can use the header", async () => {
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValue(json({ token: "java-token", user }));
  const response = await request(app).post("/api/auth/login").send({ email: user.email, password: "test" });
  expect(response.status).toBe(200);
  expect(response.headers["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("X-Correlation-Id")).toBe(response.headers["x-correlation-id"]);
  expect(response.headers["access-control-expose-headers"]).toContain("X-Correlation-Id");
  const preflight = await request(app).options("/api/auth/login").set("Origin", "http://localhost:5173")
    .set("Access-Control-Request-Method", "POST").set("Access-Control-Request-Headers", "content-type,x-correlation-id");
  expect(preflight.headers["access-control-allow-headers"]).toContain("X-Correlation-Id");
});
