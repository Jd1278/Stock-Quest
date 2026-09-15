process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/stockquest_test";
process.env.JWT_SECRET = "test-secret-for-unit-tests-only-123456789";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../app";
import { repository } from "../repositories";
const token = (version = 0, expiresIn: jwt.SignOptions["expiresIn"] = "1h") =>
  jwt.sign({ version }, process.env.JWT_SECRET!, {
    subject: "u1",
    issuer: "stock-quest",
    audience: "stock-quest-web",
    expiresIn,
  });
afterEach(() => jest.restoreAllMocks());
test("protected endpoint rejects a missing Bearer token", async () => {
  expect((await request(app).get("/api/progress")).status).toBe(401);
});
test("expired and tampered tokens are rejected", async () => {
  expect(
    (
      await request(app)
        .get("/api/progress")
        .set("Authorization", "Bearer " + token(0, -1))
    ).status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .get("/api/progress")
        .set("Authorization", "Bearer " + token() + "broken")
    ).status,
  ).toBe(401);
});
test("role from database prevents access to administrative endpoint", async () => {
  jest
    .spyOn(repository, "userById")
    .mockResolvedValue({
      id: "u1",
      role: "APRENDIZ",
      active: true,
      tokenVersion: 0,
    } as any);
  expect(
    (
      await request(app)
        .get("/api/admin")
        .set("Authorization", "Bearer " + token())
    ).status,
  ).toBe(403);
});
test("revoked sessions and disabled users are rejected", async () => {
  const spy = jest
    .spyOn(repository, "userById")
    .mockResolvedValue({
      id: "u1",
      role: "APRENDIZ",
      active: true,
      tokenVersion: 1,
    } as any);
  expect(
    (
      await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer " + token())
    ).status,
  ).toBe(401);
  spy.mockResolvedValue({
    id: "u1",
    role: "APRENDIZ",
    active: false,
    tokenVersion: 0,
  } as any);
  expect(
    (
      await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer " + token())
    ).status,
  ).toBe(401);
});
test("malformed registration is rejected before repository use", async () => {
  expect(
    (
      await request(app)
        .post("/api/auth/register")
        .send({ email: "invalid", password: "short" })
    ).status,
  ).toBe(400);
});
test("valid Bearer token returns only profile DTO", async () => {
  jest
    .spyOn(repository, "userById")
    .mockResolvedValue({
      id: "u1",
      role: "APRENDIZ",
      active: true,
      tokenVersion: 0,
    } as any);
  jest
    .spyOn(repository, "profile")
    .mockResolvedValue({ id: "u1", name: "Ana", role: "APRENDIZ" } as any);
  const response = await request(app)
    .get("/api/auth/me")
    .set("Authorization", "Bearer " + token());
  expect(response.status).toBe(200);
  expect(response.body.name).toBe("Ana");
  expect(response.body.passwordHash).toBeUndefined();
});
