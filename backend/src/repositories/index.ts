import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("../../prisma/client.cjs") as { createClient: () => PrismaClient };
export const db = createClient();
export const publicUser = {
  id: true,
  name: true,
  email: true,
  document: true,
  company: true,
  phone: true,
  role: true,
  active: true,
  createdAt: true,
} as const;
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const repository = {
  userByEmail: (email: string) => db.user.findUnique({ where: { email } }),
  userById: (id: string) => db.user.findUnique({ where: { id } }),
  profile: (id: string) =>
    db.user.findUniqueOrThrow({ where: { id }, select: publicUser }),
  curriculum: () =>
    db.module.findMany({
      where: { published: true },
      orderBy: { position: "asc" },
      include: {
        lessons: {
          orderBy: { position: "asc" },
          include: {
            contents: true,
            challenges: { select: { id: true, question: true, options: true } },
          },
        },
      },
    }),
  completed: (userId: string) =>
    db.learningProgress.findMany({ where: { userId } }),
  complete: (userId: string, lessonId: string) =>
    db.learningProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: {},
    }),
  award: (userId: string, key: string) =>
    db.userAchievement.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key },
      update: {},
    }),
};


