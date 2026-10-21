import { createApp } from "./app";
import { readConfig } from "./Infrastructure/config";
import { HttpServices } from "./Infrastructure/HttpServices";
try {
  const config = readConfig();
  const app = createApp(config, new HttpServices(config));
  const loaded = Object.keys(require.cache).map(file => file.replace(/\\/g, "/"));
  if (loaded.some(file => /\/(?:backend|legacy)\/|\/node_modules\/(?:@prisma|pg|bcrypt|jsonwebtoken)\//.test(file))) {
    throw new Error("Gateway isolation failed");
  }
  console.log("Gateway isolation: legacyImports=0 sqlDrivers=0");
  const server = app.listen(config.PORT, config.HOST, () => console.log(`Gateway Java HTTP listo en ${config.HOST}:${config.PORT}`));
  server.on("error", error => { console.error("Gateway startup failed:", error.name); process.exitCode = 1; });
  const stop = () => { server.close(() => process.exit(0)); };
  process.on("SIGTERM", stop); process.on("SIGINT", stop);
} catch { console.error("Configuración del gateway inválida. Revisa los orígenes y tokens de los servicios Java."); process.exitCode = 1; }
