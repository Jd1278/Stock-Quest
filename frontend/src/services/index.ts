import { request } from "./http";
import type {
  User,
  Module,
  Lesson,
  Progress,
  Scenario,
  Run,
  Employee,
  Group,
} from "../types";
export const authService = {
  login: (body: unknown) =>
    request<{ token: string; user: User }>("/auth/login", "POST", body),
  register: (body: unknown) => request<User>("/auth/register", "POST", body),
  me: () => request<User>("/auth/me"),
  logout: () => request<void>("/auth/logout", "POST"),
};
export const userService = {
  update: (body: unknown) => request<User>("/users/me", "PATCH", body),
  create: (body: unknown) => request<User>("/users", "POST", body),
  edit: (id: string, body: unknown) =>
    request<User>("/users/" + id, "PATCH", body),
};
export const moduleService = { list: () => request<Module[]>("/modules") };
export const lessonService = {
  get: (id: string) => request<Lesson>("/lessons/" + id),
  complete: (id: string) =>
    request<{ message: string }>("/lessons/" + id + "/complete", "POST"),
};
export const challengeService = {
  answer: (id: string, answer: number) =>
    request<{
      passed: boolean;
      score: number;
      feedback: string;
      attempt: number;
    }>("/challenges/" + id + "/attempts", "POST", { answer }),
};
export const simulationService = {
  list: () => request<Scenario[]>("/simulations/scenarios"),
  start: (scenarioId: string) =>
    request<Run>("/simulations", "POST", { scenarioId }),
  get: (id: string) => request<Run>("/simulations/" + id),
  decide: (id: string, day: number, quantity: number) =>
    request<Run>("/simulations/" + id + "/decisions", "POST", {
      day,
      quantity,
    }),
  history: () =>
    request<
      {
        id: string;
        day: number;
        scenario: { title: string };
        result: { score: number; profit: number; feedback: string } | null;
      }[]
    >("/simulations"),
};
export const progressService = {
  me: () => request<Progress>("/progress"),
  team: () => request<Employee[]>("/reports"),
  employee: (id: string) => request<Employee>("/reports/" + id),
};
export const groupService = {
  list: () => request<Group[]>("/groups"),
  create: (name: string) => request<Group>("/groups", "POST", { name }),
  edit: (id: string, name: string) =>
    request<Group>("/groups/" + id, "PATCH", { name }),
  remove: (id: string) => request<void>("/groups/" + id, "DELETE"),
  assign: (id: string, userId: string) =>
    request("/groups/" + id + "/members", "POST", { userId }),
  unassign: (id: string, userId: string) =>
    request("/groups/" + id + "/members/" + userId, "DELETE"),
};
export const adminService = {
  content: () =>
    request<{ modules: Module[]; scenarios: Scenario[] }>("/admin"),
  save: (kind: string, body: unknown, id?: string) =>
    request("/admin/" + kind + (id ? "/" + id : ""), id ? "PUT" : "POST", body),
};
