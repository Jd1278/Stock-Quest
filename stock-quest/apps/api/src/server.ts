import { app } from "./app";
import { config } from "./config/env";
import { db } from "./repositories";
async function start() {
  await db.$connect();
  const server = app.listen(config.PORT, () =>
    console.log(`Stock Quest API http://localhost:${config.PORT}`),
  );
  const stop = () => {
    server.close(() => {
      void db.$disconnect().then(() => process.exit(0));
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
start().catch(() => {
  console.error("No se pudo conectar a PostgreSQL. Revisa DATABASE_URL.");
  process.exit(1);
});
