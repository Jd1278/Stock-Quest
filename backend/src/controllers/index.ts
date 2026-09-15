import { RequestHandler } from "express";
import { z } from "zod";
import { authService } from "../services/authService";
import { learningService } from "../services/learningService";
import { simulationService } from "../services/simulationService";
import { groupService, progressService } from "../services/progressService";
import { adminService } from "../services/adminService";
import { repository } from "../repositories";
import * as v from "../validators";
const id = (value: unknown) => z.string().min(1).max(100).parse(value);
export const controller: Record<string, RequestHandler> = {
  register: async (req, res) => {
    res
      .status(201)
      .json(await authService.register(v.registration.parse(req.body)));
  },
  login: async (req, res) => {
    const body = v.login.parse(req.body);
    res.json(await authService.login(body.email, body.password));
  },
  logout: async (req, res) => {
    await authService.logout(req.auth.id);
    res.status(204).end();
  },
  me: async (req, res) => {
    res.json(await repository.profile(req.auth.id));
  },
  profile: async (req, res) => {
    res.json(await authService.update(req.auth.id, v.profile.parse(req.body)));
  },
  path: async (req, res) => {
    res.json(await learningService.path(req.auth.id));
  },
  lesson: async (req, res) => {
    res.json(await learningService.lesson(req.auth.id, id(req.params.id)));
  },
  complete: async (req, res) => {
    res.json(await learningService.complete(req.auth.id, id(req.params.id)));
  },
  answer: async (req, res) => {
    const body = z
      .object({ answer: z.number().int().min(0).max(5) })
      .strict()
      .parse(req.body);
    res
      .status(201)
      .json(
        await learningService.answer(
          req.auth.id,
          id(req.params.id),
          body.answer,
        ),
      );
  },
  scenarios: async (_req, res) => {
    res.json(await simulationService.list());
  },
  start: async (req, res) => {
    const body = z
      .object({ scenarioId: z.string().min(1).max(100) })
      .strict()
      .parse(req.body);
    res
      .status(201)
      .json(await simulationService.start(req.auth.id, body.scenarioId));
  },
  simulation: async (req, res) => {
    res.json(await simulationService.get(req.auth.id, id(req.params.id)));
  },
  decision: async (req, res) => {
    const body = v.decisionInput.parse(req.body);
    res.json(
      await simulationService.decide(
        req.auth.id,
        id(req.params.id),
        body.day,
        body.quantity,
      ),
    );
  },
  history: async (req, res) => {
    res.json(await simulationService.history(req.auth.id));
  },
  progress: async (req, res) => {
    res.json(await progressService.report(req.auth.id));
  },
  team: async (req, res) => {
    res.json(await progressService.team(req.auth.id));
  },
  employeeReport: async (req, res) => {
    res.json(await progressService.employee(req.auth.id, id(req.params.id)));
  },
  createEmployee: async (req, res) => {
    res
      .status(201)
      .json(
        await authService.register(v.registration.parse(req.body), req.auth.id),
      );
  },
  editEmployee: async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(1).max(100).optional(),
        company: z.string().trim().min(1).max(100).optional(),
        active: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    res.json(await adminService.employee(req.auth.id, id(req.params.id), body));
  },
  groups: async (req, res) => {
    res.json(await groupService.list(req.auth.id));
  },
  createGroup: async (req, res) => {
    res
      .status(201)
      .json(
        await groupService.create(
          req.auth.id,
          v.groupInput.parse(req.body).name,
        ),
      );
  },
  editGroup: async (req, res) => {
    res.json(
      await groupService.rename(
        req.auth.id,
        id(req.params.id),
        v.groupInput.parse(req.body).name,
      ),
    );
  },
  deleteGroup: async (req, res) => {
    await groupService.remove(req.auth.id, id(req.params.id));
    res.status(204).end();
  },
  assign: async (req, res) => {
    const body = z
      .object({ userId: z.string().min(1).max(100) })
      .strict()
      .parse(req.body);
    res.json(
      await groupService.assign(req.auth.id, id(req.params.id), body.userId),
    );
  },
  unassign: async (req, res) => {
    await groupService.unassign(
      req.auth.id,
      id(req.params.id),
      id(req.params.userId),
    );
    res.status(204).end();
  },
  content: async (_req, res) => {
    res.json(await adminService.content());
  },
  module: async (req, res) => {
    res
      .status(req.params.id ? 200 : 201)
      .json(
        await adminService.module(v.moduleInput.parse(req.body), req.params.id),
      );
  },
  adminLesson: async (req, res) => {
    res
      .status(req.params.id ? 200 : 201)
      .json(
        await adminService.lesson(v.lessonInput.parse(req.body), req.params.id),
      );
  },
  challenge: async (req, res) => {
    res
      .status(req.params.id ? 200 : 201)
      .json(
        await adminService.challenge(
          v.challengeInput.parse(req.body),
          req.params.id,
        ),
      );
  },
  scenario: async (req, res) => {
    res
      .status(req.params.id ? 200 : 201)
      .json(
        await adminService.scenario(
          v.scenarioInput.parse(req.body),
          req.params.id,
        ),
      );
  },
};
