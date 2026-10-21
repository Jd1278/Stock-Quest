import type { Request, Response, RequestHandler } from "express";
import { z } from "zod";
import type { ServicePort } from "../Application/ServicePort";
import { adminContent } from "../Application/adminContent";
import type { Service } from "../domain";
import * as v from "./validators";
const id = (value: unknown) => encodeURIComponent(z.string().min(1).max(100).refine(s => !/[\/\\]/.test(s) && s !== "." && s !== "..").parse(value));
export function controller(port: ServicePort): Record<string, RequestHandler> {
  async function forward(service: Service, req: Request, res: Response, path: string, body?: unknown) {
    const reply = await port.call(service, req.method, path, req.headers.authorization, body, req.get("X-Correlation-Id"));
    if (reply.status === 204) { res.status(204).end(); return; }
    res.status(reply.status).json(reply.body);
  }
  const people = (path: (req: Request) => string, schema?: z.ZodTypeAny): RequestHandler => async (req, res) => {
    await forward("people", req, res, path(req), schema ? schema.parse(req.body) : undefined);
  };
  const adminWrite = (service: Service, resource: string, schema: z.ZodTypeAny): RequestHandler => async (req, res) => {
    await forward(service, req, res, `/api/admin/${resource}` + (req.params.id ? "/" + id(req.params.id) : ""), schema.parse(req.body));
  };
  const adminDelete = (service: Service, resource: string): RequestHandler => async (req, res) => {
    await forward(service, req, res, `/api/admin/${resource}/${id(req.params.id)}`);
  };
  return {
    register: people(() => "/api/auth/register", v.registration), login: people(() => "/api/auth/login", v.login),
    logout: people(() => "/api/auth/logout"), me: people(() => "/api/auth/me"), profile: people(() => "/api/users/me", v.profile),
    team: people(() => "/api/reports"), employeeReport: people(req => `/api/reports/${id(req.params.id)}`),
    createEmployee: people(() => "/api/users", v.registration),
    editEmployee: people(req => `/api/users/${id(req.params.id)}`, z.object({ name: z.string().trim().min(1).max(100).optional(), company: z.string().trim().min(1).max(100).optional(), active: z.boolean().optional() }).strict()),
    groups: people(() => "/api/groups"), createGroup: people(() => "/api/groups", v.groupInput),
    editGroup: people(req => `/api/groups/${id(req.params.id)}`, v.groupInput), deleteGroup: people(req => `/api/groups/${id(req.params.id)}`),
    assign: people(req => `/api/groups/${id(req.params.id)}/members`, z.object({ userId: z.string().min(1).max(100) }).strict()),
    unassign: people(req => `/api/groups/${id(req.params.id)}/members/${id(req.params.userId)}`),
    path: async (req, res) => forward("learning", req, res, "/api/modules"),
    lesson: async (req, res) => forward("learning", req, res, `/api/lessons/${id(req.params.id)}`),
    complete: async (req, res) => forward("learning", req, res, `/api/lessons/${id(req.params.id)}/complete`),
    answer: async (req, res) => forward("learning", req, res, `/api/challenges/${id(req.params.id)}/attempts`, z.object({ answer: z.number().int().min(0).max(5) }).strict().parse(req.body)),
    progress: async (req, res) => forward("learning", req, res, "/api/progress"),
    scenarios: async (req, res) => forward("simulation", req, res, "/api/simulations/scenarios"),
    history: async (req, res) => forward("simulation", req, res, "/api/simulations"),
    start: async (req, res) => forward("simulation", req, res, "/api/simulations", z.object({ scenarioId: z.string().min(1).max(100) }).strict().parse(req.body)),
    simulation: async (req, res) => forward("simulation", req, res, `/api/simulations/${id(req.params.id)}`),
    decision: async (req, res) => forward("simulation", req, res, `/api/simulations/${id(req.params.id)}/decisions`, v.decisionInput.parse(req.body)),
    content: async (req, res) => { res.json(await adminContent(port, req.headers.authorization, req.get("X-Correlation-Id"))); },
    module: adminWrite("learning", "modules", v.moduleInput), adminLesson: adminWrite("learning", "lessons", v.lessonInput),
    challenge: adminWrite("learning", "challenges", v.challengeInput), scenario: adminWrite("simulation", "scenarios", v.scenarioInput),
    deleteModule: adminDelete("learning", "modules"), deleteLesson: adminDelete("learning", "lessons"),
    deleteChallenge: adminDelete("learning", "challenges"), deleteScenario: adminDelete("simulation", "scenarios"),
  };
}
