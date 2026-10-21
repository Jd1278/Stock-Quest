import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { config } from "../config/env";
import { AppError } from "../repositories";
import { asyncRoute } from "../middlewares";
import { consumeSimulationEvent } from "../services/simulationEvents";
import { javaLearningEnabled, learningGateway } from "../services/learningGateway";

export const internalEvents = Router();
internalEvents.post("/events", asyncRoute(async (req, res) => {
  if (config.SIMULATION_BACKEND !== "java" || !config.SIMULATION_EVENT_TOKEN)
    throw new AppError(503, "El consumidor de simulación no está habilitado.");
  const actual = Buffer.from(req.get("X-StockQuest-Event-Token") ?? "");
  const expected = Buffer.from(config.SIMULATION_EVENT_TOKEN);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new AppError(401, "Credencial de servicio inválida.");
  if (javaLearningEnabled()) await learningGateway.event(req.body);
  else await consumeSimulationEvent(req.body);
  res.status(204).end();
}));
