import { db, repository, AppError, publicUser } from "../repositories";
import { javaSimulationEnabled, simulationGateway } from "./simulationGateway";
import { javaLearningEnabled, learningGateway } from "./learningGateway";
import { requireLegacyPeople } from "./peopleGateway";
export const progressService = {
  async report(userId: string) {
    if (javaLearningEnabled()) return (await learningGateway.report(userId)).progress;
    const [modules, completed, attempts, runs, achievements] =
      await Promise.all([
        repository.curriculum(),
        repository.completed(userId),
        db.challengeAttempt.findMany({
          where: { userId },
          include: { challenge: { select: { lessonId: true } } },
          orderBy: { createdAt: "asc" },
        }),
        javaSimulationEnabled() ? Promise.resolve([]) : db.simulation.findMany({
          where: { userId, result: { isNot: null } },
          include: { result: true },
        }),
        db.userAchievement.findMany({ where: { userId } }),
      ]);
    const simulationSummary = javaSimulationEnabled() ? await simulationGateway.summary(userId) : {
      completedCount: runs.length,
      scoreTotal: runs.reduce((sum, r) => sum + (r.result?.score ?? 0), 0),
      hasPassingRun: runs.some(r => (r.result?.score ?? 0) >= 70),
      firstCompletedAt: null,
    };
    const visibleAchievements = javaSimulationEnabled() ? achievements.filter(a => a.key !== "PRIMERA_SIMULACION") : [...achievements];
    if (javaSimulationEnabled() && simulationSummary.firstCompletedAt) visibleAchievements.push({
      userId, key: "PRIMERA_SIMULACION", earnedAt: new Date(simulationSummary.firstCompletedAt),
    });
    const done = new Set(completed.map((p) => p.lessonId));
    const best = new Map<string, number>();
    for (const a of attempts)
      best.set(a.challengeId, Math.max(best.get(a.challengeId) ?? 0, a.score));
    const topics = modules.map((m) => {
      const ids = new Set(m.lessons.map((l) => l.id));
      const relevant = attempts.filter((a) => ids.has(a.challenge.lessonId));
      const score = relevant.length
        ? Math.round(
            relevant.reduce((sum, a) => sum + a.score, 0) / relevant.length,
          )
        : null;
      return {
        id: m.id,
        title: m.title,
        completed: m.lessons.filter((l) => done.has(l.id)).length,
        total: m.lessons.length,
        score,
        needsReview: score !== null && score < 70,
      };
    });
    const count = topics.reduce((n, t) => n + t.completed, 0),
      total = topics.reduce((n, t) => n + t.total, 0);
    const xp =
      count * 50 +
      [...best.values()].reduce((n, v) => n + v / 5, 0) +
      simulationSummary.scoreTotal;
    return {
      completed: count,
      total,
      percent: total ? Math.round((count / total) * 100) : 0,
      xp,
      level: Math.floor(xp / 250) + 1,
      topics,
      achievements: visibleAchievements,
      simulations: simulationSummary.completedCount,
      passed:
        total > 0 &&
        count === total &&
        simulationSummary.hasPassingRun,
      recommendations: topics
        .filter((t) => t.needsReview)
        .map(
          (t) =>
            `Repasa ${t.title.toLowerCase()} y vuelve a intentar sus desafíos.`,
        ),
    };
  },
  async team(leaderId: string) {
    requireLegacyPeople();
    const users = await db.user.findMany({
      where: { leaderId, role: "APRENDIZ" },
      select: publicUser,
    });
    return Promise.all(
      users.map(async (user) => ({
        ...user,
        progress: await this.report(user.id),
      })),
    );
  },
  async employee(leaderId: string, userId: string) {
    requireLegacyPeople();
    const user = await db.user.findFirst({
      where: { id: userId, leaderId, role: "APRENDIZ" },
      select: publicUser,
    });
    if (!user) throw new AppError(404, "Aprendiz no encontrado en tu equipo.");
    if (javaLearningEnabled()) {
      const report = await learningGateway.report(userId);
      return { ...user, progress: report.progress, activities: report.activities };
    }
    return {
      ...user,
      progress: await this.report(userId),
      activities: await db.challengeAttempt.findMany({
        where: { userId },
        select: {
          id: true,
          score: true,
          answer: true,
          createdAt: true,
          challenge: { select: { question: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    };
  },
};
export const groupService = {
  list: (leaderId: string) => {
    requireLegacyPeople();
    return db.trainingGroup.findMany({
      where: { leaderId },
      include: { members: { include: { user: { select: publicUser } } } },
      orderBy: { createdAt: "desc" },
    });
  },
  create: (leaderId: string, name: string) => {
    requireLegacyPeople();
    return db.trainingGroup.create({ data: { leaderId, name } });
  },
  async own(leaderId: string, id: string) {
    requireLegacyPeople();
    if (!(await db.trainingGroup.findFirst({ where: { id, leaderId } })))
      throw new AppError(404, "Grupo no encontrado.");
  },
  async rename(leaderId: string, id: string, name: string) {
    await this.own(leaderId, id);
    return db.trainingGroup.update({ where: { id }, data: { name } });
  },
  async remove(leaderId: string, id: string) {
    await this.own(leaderId, id);
    await db.trainingGroup.delete({ where: { id } });
  },
  async assign(leaderId: string, id: string, userId: string) {
    await this.own(leaderId, id);
    if (
      !(await db.user.findFirst({
        where: { id: userId, leaderId, role: "APRENDIZ", active: true },
      }))
    )
      throw new AppError(404, "Aprendiz no encontrado en tu equipo.");
    return db.groupMembership.upsert({
      where: { groupId_userId: { groupId: id, userId } },
      create: { groupId: id, userId },
      update: {},
    });
  },
  async unassign(leaderId: string, id: string, userId: string) {
    await this.own(leaderId, id);
    await db.groupMembership.deleteMany({ where: { groupId: id, userId } });
  },
};
