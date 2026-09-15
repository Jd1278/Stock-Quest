import { z } from "zod";
import { db, AppError, publicUser } from "../repositories";
import {
  moduleInput,
  lessonInput,
  challengeInput,
  scenarioInput,
} from "../validators";
export const adminService = {
  async content() {
    return {
      modules: await db.module.findMany({
        orderBy: { position: "asc" },
        include: {
          lessons: {
            orderBy: { position: "asc" },
            include: { contents: true, challenges: true },
          },
        },
      }),
      scenarios: await db.simulationScenario.findMany(),
    };
  },
  module: (input: z.infer<typeof moduleInput>, id?: string) =>
    id
      ? db.module.update({ where: { id }, data: input })
      : db.module.create({ data: input }),
  async lesson(input: z.infer<typeof lessonInput>, id?: string) {
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
  challenge: (input: z.infer<typeof challengeInput>, id?: string) =>
    id
      ? db.challenge.update({ where: { id }, data: input })
      : db.challenge.create({ data: input }),
  scenario: (input: z.infer<typeof scenarioInput>, id?: string) =>
    id
      ? db.simulationScenario.update({ where: { id }, data: input })
      : db.simulationScenario.create({ data: input }),
  async employee(
    leaderId: string,
    id: string,
    input: { name?: string; company?: string; active?: boolean },
  ) {
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
