import { db, AppError, repository } from "../repositories";
export const learningService = {
  async path(userId: string) {
    const [modules, completed] = await Promise.all([
      repository.curriculum(),
      repository.completed(userId),
    ]);
    const done = new Set(completed.map((p) => p.lessonId));
    let unlocked = true;
    return modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => {
        const value = { ...l, completed: done.has(l.id), unlocked };
        if (!done.has(l.id)) unlocked = false;
        return value.unlocked || value.completed
          ? value
          : { ...value, body: "", contents: [], challenges: [] };
      }),
    }));
  },
  async lesson(userId: string, lessonId: string) {
    const modules = await this.path(userId);
    const lesson = modules
      .flatMap((m) => m.lessons)
      .find((l) => l.id === lessonId);
    if (!lesson) throw new AppError(404, "Lección no disponible.");
    if (!lesson.unlocked && !lesson.completed)
      throw new AppError(403, "Completa la lección anterior para continuar.");
    return lesson;
  },
  async complete(userId: string, lessonId: string) {
    const lesson = await this.lesson(userId, lessonId);
    for (const challenge of lesson.challenges) {
      const pass = await db.challengeAttempt.findFirst({
        where: { userId, challengeId: challenge.id, score: 100 },
      });
      if (!pass)
        throw new AppError(
          400,
          "Resuelve los desafíos antes de completar la lección.",
        );
    }
    await repository.complete(userId, lessonId);
    await repository.award(userId, "PRIMERA_LECCION");
    return { message: "Lección completada. La siguiente ya está disponible." };
  },
  async answer(userId: string, id: string, answer: number) {
    const challenge = await db.challenge.findUnique({ where: { id } });
    if (!challenge) throw new AppError(404, "Desafío no encontrado.");
    await this.lesson(userId, challenge.lessonId);
    if (answer >= (challenge.options as string[]).length)
      throw new AppError(400, "Respuesta inválida.");
    const score = answer === challenge.correctIndex ? 100 : 0;
    const attempt = await db.challengeAttempt.create({
      data: { userId, challengeId: id, answer, score },
    });
    return {
      id: attempt.id,
      score,
      passed: score === 100,
      feedback: challenge.explanation,
      attempt: await db.challengeAttempt.count({
        where: { userId, challengeId: id },
      }),
    };
  },
};
