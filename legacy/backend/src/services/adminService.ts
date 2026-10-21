import { z } from "zod";
import { db, AppError, publicUser } from "../repositories";
import { javaSimulationEnabled, simulationGateway } from "./simulationGateway";
import { javaLearningEnabled, learningGateway, requireLegacyLearning } from "./learningGateway";
import { requireLegacyPeople } from "./peopleGateway";
import {
  moduleInput,
  lessonInput,
  challengeInput,
  scenarioInput,
} from "../validators";
export const adminService = {
  async content(bearer?: string) {
    return {
      modules: javaLearningEnabled() ? await learningGateway.modules(bearer) : await db.module.findMany({
        orderBy: { position: "asc" },
        include: {
          lessons: {
            orderBy: { position: "asc" },
            include: { contents: true, challenges: true },
          },
        },
      }),
      scenarios: javaSimulationEnabled() ? await simulationGateway.scenarios(bearer) : await db.simulationScenario.findMany(),
    };
  },
  module: (input: z.infer<typeof moduleInput>, id?: string) => {
    requireLegacyLearning();
    return id
      ? db.module.update({ where: { id }, data: input })
      : db.module.create({ data: input });
  },
  async deleteModule(id: string) {
    requireLegacyLearning();
    return db.$transaction(async (tx) => {
      if (!await tx.module.findUnique({ where: { id } })) throw new AppError(404, "Módulo no encontrado.");
      await tx.challenge.deleteMany({ where: { lesson: { moduleId: id } } });
      await tx.lesson.deleteMany({ where: { moduleId: id } });
      await tx.module.delete({ where: { id } });
    });
  },
  async deleteScenario(id: string) {
    if (javaSimulationEnabled()) throw new AppError(503, "Los escenarios pertenecen al servicio Java.");
    await db.simulationScenario.delete({ where: { id } });
  },
  async deleteLesson(id: string) {
    requireLegacyLearning();
    return db.$transaction(async (tx) => {
      if (!await tx.lesson.findUnique({ where: { id } })) throw new AppError(404, "Lección no encontrada.");
      await tx.challenge.deleteMany({ where: { lessonId: id } });
      await tx.lesson.delete({ where: { id } });
    });
  },
  async deleteChallenge(id: string) {
    requireLegacyLearning();
    await db.challenge.delete({ where: { id } });
  },
  async lesson(input: z.infer<typeof lessonInput>, id?: string) {
    requireLegacyLearning();
    const { youtubeId, ...data } = input;
    return db.$transaction(async (tx) => {
      const lesson = id
        ? await tx.lesson.update({ where: { id }, data })
        : await tx.lesson.create({ data });
      await tx.content.deleteMany({ where: { lessonId: lesson.id } });
      if (youtubeId)
        await tx.content.create({
          data: { lessonId: lesson.id, title: data.title, youtubeId },
        });
      return lesson;
    });
  },
  challenge: (input: z.infer<typeof challengeInput>, id?: string) => {
    requireLegacyLearning();
    return id
      ? db.challenge.update({ where: { id }, data: input })
      : db.challenge.create({ data: input });
  },
  scenario: (input: z.infer<typeof scenarioInput>, id?: string) => {
    if (javaSimulationEnabled()) throw new AppError(503, "Los escenarios pertenecen al servicio Java.");
    return id
      ? db.simulationScenario.update({ where: { id }, data: input })
      : db.simulationScenario.create({ data: input });
  },
  async employee(
    leaderId: string,
    id: string,
    input: { name?: string; company?: string; active?: boolean },
  ) {
    requireLegacyPeople();
    const user = await db.user.findFirst({
      where: { id, leaderId, role: "APRENDIZ" },
    });
    if (!user) throw new AppError(404, "Aprendiz no encontrado.");
    return db.user.update({
      where: { id },
      data: {
        ...input,
        ...(input.active === false ? { tokenVersion: { increment: 1 } } : {}),
      },
      select: publicUser,
    });
  },
};
