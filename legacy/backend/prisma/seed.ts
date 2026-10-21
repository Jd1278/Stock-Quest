import "dotenv/config";
import client from "./client.cjs";
import bcrypt from "bcrypt";
const db = client.createClient();
import content from "../../content/stockquest.json";
const lessons = content.lessons;
async function seed() {
  if (process.env.LEARNING_BACKEND !== "java") {
  for (let i = 0; i < lessons.length; i++) {
    const item = lessons[i],
      moduleId = `module-${i + 1}`,
      lessonId = `lesson-${i + 1}`;
    await db.module.upsert({
      where: { id: moduleId },
      update: {},
      create: {
        id: moduleId,
        title: item.title,
        description: item.description,
        position: i + 1,
        published: true,
      },
    });
    await db.lesson.upsert({
      where: { id: lessonId },
      update: {},
      create: {
        id: lessonId,
        moduleId,
        title: item.lesson,
        body: item.body,
        position: 1,
        minutes: 5,
      },
    });
    await db.challenge.upsert({
      where: { id: `challenge-${i + 1}` },
      update: {},
      create: {
        id: `challenge-${i + 1}`,
        lessonId,
        question: item.question,
        options: item.options,
        correctIndex: item.correct,
        explanation: item.explanation,
      },
    });
  }
  }
  if (process.env.SIMULATION_BACKEND !== "java") {
  for (const scenario of content.scenarios) {
    await db.simulationScenario.upsert({ where: { id: scenario.id }, update: {}, create: scenario });
  }
  }
  if (process.env.PEOPLE_BACKEND !== "java") {
  for (const [prefix, role, name, document] of [
    ["ADMIN", "GESTOR_PEDAGOGICO", "Gestor pedagógico", "SQ-GESTOR"],
    ["LEADER", "LIDER", "Líder de capacitación", "SQ-LIDER"],
  ] as const) {
    const email = process.env[`SEED_${prefix}_EMAIL`],
      password = process.env[`SEED_${prefix}_PASSWORD`];
    if (!email || !password) continue;
    if (
      password.length < 10 ||
      Buffer.byteLength(password) > 72 ||
      password.startsWith("replace-")
    )
      throw new Error(`Configura SEED_${prefix}_PASSWORD con un valor seguro.`);
    await db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role,
        name,
        document,
        company: "Stock Quest",
      },
    });
  }
  }
  console.log(
    "Contenido inicial creado; los registros existentes se conservaron.",
  );
}
seed()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

