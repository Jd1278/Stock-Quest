import request from "supertest";
import { createApp } from "./app";
import { readConfig } from "./Infrastructure/config";
import { AppError, Role } from "./domain";
import { HttpServices } from "./Infrastructure/HttpServices";
import type { ServicePort } from "./Application/ServicePort";
import fs from "node:fs";
import path from "node:path";
const config = readConfig({ PEOPLE_SERVICE_URL: "http://127.0.0.1:14630", LEARNING_SERVICE_URL: "http://127.0.0.1:14620",
  SIMULATION_SERVICE_URL: "http://127.0.0.1:14610", LEARNING_SERVICE_TOKEN: "l".repeat(32), SIMULATION_SERVICE_TOKEN: "s".repeat(32) });
const profile = { id: "user-1", name: "Fixture", email: "test@example.test", document: "fixture", company: "Test", phone: null,
  role: "APRENDIZ" as Role, active: true, createdAt: "2026-10-21T00:00:00Z" };
const spec = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../contracts/openapi-compatibilidad.json"), "utf8"));
const operations = Object.entries(spec.paths).flatMap(([route, methods]: [string, any]) => Object.entries(methods).map(([method, op]: [string, any]) => ({ route, method, ...op })));
const registration = { name: "Fixture", document: "fixture", email: "test@example.test", company: "Test", password: "password-fixture" };
function bodyFor(route: string) {
  if (route === "/auth/register" || route === "/users") return registration;
  if (route === "/auth/login") return { email: registration.email, password: registration.password };
  if (route.endsWith("/members")) return { userId: "other" };
  if (route.startsWith("/groups")) return { name: "Fixture" };
  if (route.endsWith("/attempts")) return { answer: 0 };
  if (route.endsWith("/decisions")) return { day: 0, quantity: 0 };
  if (route === "/simulations") return { scenarioId: "scenario" };
  if (route.startsWith("/admin/modules")) return { title: "Fixture", description: "Fixture", position: 1, published: false };
  if (route.startsWith("/admin/lessons")) return { moduleId: "module", title: "Fixture", body: "Fixture", position: 1, minutes: 1 };
  if (route.startsWith("/admin/challenges")) return { lessonId: "lesson", question: "Fixture", options: ["A", "B"], correctIndex: 0, explanation: "Fixture" };
  if (route.startsWith("/admin/scenarios")) return { title: "Fixture", description: "Fixture", initialStock: 10, demand: [5, 8, 4], leadTime: 2,
    unitCost: 2, salePrice: 5, holdingCost: 1, shortageCost: 3, orderCost: 4, maxOrder: 20, published: false };
  return { name: "Fixture" };
}
function setup(role: Role = "APRENDIZ") {
  const call = jest.fn(async (_service, _method, target) => target === "/api/auth/me"
    ? { status: 200, body: { ...profile, role } }
    : { status: 200, body: target.startsWith("/internal/admin/") ? [] : { ok: true } });
  return { call, app: createApp(config, { call } as ServicePort) };
}
describe("Compatibilidad HTTP sin persistencia legacy", () => {
  test.each(operations)("$method $route mantiene propietario y ruta", async op => {
    const { app, call } = setup(op["x-roles"][0] || "APRENDIZ");
    const route = "/api" + op.route.replace("{id}", "fixture-id").replace("{userId}", "fixture-user");
    const req = (request(app) as any)[op.method](route).set("Authorization", "Bearer fixture").set("X-Correlation-Id", "routing-test");
    if (["post", "put", "patch"].includes(op.method)) req.send(bodyFor(op.route));
    const result = await req;
    expect(result.status).toBe(200);
    if (op.route === "/health") { expect(result.headers["x-stockquest-gateway"]).toBe("java-services"); expect(call).not.toHaveBeenCalled(); return; }
    if (op.route === "/admin") {
      expect(result.body).toEqual({ modules: [], scenarios: [] });
      expect(call).toHaveBeenCalledWith("simulation", "GET", "/internal/admin/scenarios", "Bearer fixture", undefined, "routing-test");
      return;
    }
    const owner = { "personas-capacitacion": "people", "aprendizaje-evaluacion": "learning", "simulacion-logistica": "simulation" }[op["x-owner"] as string];
    const last = call.mock.calls.at(-1)!;
    expect(last.slice(0, 3)).toEqual([owner, op.method.toUpperCase(), route]);
  });
  test("requiere identidad antes de llegar al negocio", async () => {
    const { app, call } = setup(); expect((await request(app).get("/api/modules")).status).toBe(401); expect(call).not.toHaveBeenCalled();
  });
  test.each(["/api/reports", "/api/groups", "/api/admin"])("rechaza privilegios en %s", async route => {
    const { app, call } = setup(); expect((await request(app).get(route).set("Authorization", "Bearer fixture")).status).toBe(403); expect(call).toHaveBeenCalledTimes(1);
  });
  test("un líder no decide por el aprendiz", async () => {
    const { app, call } = setup("LIDER");
    expect((await request(app).post("/api/simulations/fixture/decisions").set("Authorization", "Bearer fixture").send({ day: 0, quantity: 0 })).status).toBe(403);
    expect(call).toHaveBeenCalledTimes(1);
  });
  test("no reenvía decisiones inválidas", async () => {
    const { app, call } = setup();
    expect((await request(app).post("/api/simulations/fixture/decisions").set("Authorization", "Bearer fixture").send({ day: 0, quantity: -1 })).status).toBe(400);
    expect(call).toHaveBeenCalledTimes(1);
  });
  test("identidad revocada conserva 401", async () => {
    const { app, call } = setup(); call.mockResolvedValueOnce({ status: 401, body: { message: "Revocado" } } as any);
    expect((await request(app).get("/api/progress").set("Authorization", "Bearer fixture")).status).toBe(401);
    expect(call).toHaveBeenCalledTimes(1);
  });
  test.each(["APRENDIZ", "GESTOR_PEDAGOGICO"] as Role[])("solo un líder administra grupos: %s", async role => {
    const { app } = setup(role);
    expect((await request(app).delete("/api/groups/fixture").set("Authorization", "Bearer fixture")).status).toBe(403);
  });
  test.each([204, 404, 409, 503])("conserva el estado del servicio: %s", async status => {
    const { app, call } = setup();
    call.mockResolvedValueOnce({ status: 200, body: profile }).mockResolvedValueOnce({ status, body: status === 204 ? undefined : { message: "Fixture" } } as any);
    expect((await request(app).get("/api/progress").set("Authorization", "Bearer fixture")).status).toBe(status);
  });
  test("caída de identidad devuelve 503 sin fallback", async () => {
    const { app, call } = setup(); call.mockRejectedValueOnce(new AppError(503, "No disponible"));
    expect((await request(app).get("/api/modules").set("Authorization", "Bearer fixture")).status).toBe(503); expect(call).toHaveBeenCalledTimes(1);
  });
  test("JSON inválido devuelve 400", async () => {
    const { app } = setup(); expect((await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{")).status).toBe(400);
  });
  test("configuración sin DATABASE_URL ni JWT_SECRET y rechazo de legacy", () => {
    expect(config.PORT).toBe(14600);
    expect(() => readConfig({ ...config, PORT: String(config.PORT), PEOPLE_BACKEND: "legacy" } as any)).toThrow();
  });
});
describe("Transporte a Java", () => {
  const original = global.fetch;
  afterEach(() => { global.fetch = original; });
  test("transmite bearer, correlación y token específico sin secretos de otros servicios", async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response("[]", { status: 200 })); global.fetch = fetchMock;
    await new HttpServices(config).call("learning", "GET", "/api/modules", "Bearer fixture", undefined, "trace-1");
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer fixture", "X-Correlation-Id": "trace-1", "X-StockQuest-Service-Token": config.LEARNING_SERVICE_TOKEN });
    expect(fetchMock.mock.calls[0][1].redirect).toBe("error");
  });
  test.each(["/internal/events", "/api/modules?target=http://example.test", "/api/modules/../auth", "/api/modules/%2Fauth"])("no permite rutas ajenas o manipuladas: %s", async route => {
    const fetchMock = jest.fn(); global.fetch = fetchMock;
    await expect(new HttpServices(config).call("learning", "GET", route)).rejects.toMatchObject({ status: 400 }); expect(fetchMock).not.toHaveBeenCalled();
  });
  test("caída de aprendizaje produce 503", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("connection"));
    await expect(new HttpServices(config).call("learning", "GET", "/api/modules")).rejects.toMatchObject({ status: 503 });
  });
  test.each([new Response("<html>bad</html>", { status: 502 }), new Response("{}", { status: 401 }), new Response("{}", { status: 302 })])("rechaza respuesta upstream inválida %#", async response => {
    global.fetch = jest.fn().mockResolvedValue(response);
    await expect(new HttpServices(config).call("people", "GET", "/api/auth/me")).rejects.toMatchObject({ status: 503 });
  });
});
