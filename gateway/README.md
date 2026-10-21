# Entrada HTTP para los servicios Java

Gateway Express independiente del backend anterior. No contiene reglas de simulación, persistencia, contraseñas, firma JWT ni fallback legacy. La identidad y los permisos de negocio siguen verificándose en los propietarios Java. Conserva las 39 operaciones públicas de compatibilidad, validación de entrada, CORS, límites y correlación.

- `src/domain`: errores y tipos del borde, sin frameworks ni persistencia.
- `src/Application`: puerto de servicios y composición del panel administrativo.
- `src/Infrastructure`: HTTP saliente, rutas Express, autenticación delegada y configuración.

Las ocho capacidades del negocio permanecen en los tres servicios Java, cada una con Application/domain/Infrastructure. El gateway es un adaptador de entrada y composición, no un cuarto propietario de datos.

## Ejecución

En el entorno preparado, `scripts/local-java.cjs` configura el gateway. El 21 de octubre de 2026 se reinició el supervisor y se activó esta entrada tras la validación del usuario. `status` muestra `edgeEntrypoint: gateway/src/server.ts`; `/api/health` devuelve `X-StockQuest-Gateway: java-services`. Véase [activación y retirada](../docs/RETIRADA-LEGACY-20261021.md).

Para un entorno manual, configurar las variables de `.env.example` mediante el entorno o el `.env` de la raíz. Los tokens deben coincidir con los de los servicios, no con los ejemplos. No necesita DATABASE_URL, JWT_SECRET ni SIMULATION_EVENT_TOKEN. La entrega de eventos sucede directamente entre servicios Java.

Desde la raíz:

```powershell
npm.cmd run build -w @stock-quest/gateway
npm.cmd run test -w @stock-quest/gateway
node scripts/verify-gateway-isolation.cjs
node contracts/validar-inventario.cjs
```

`node scripts/verify-java-gateway.cjs` requiere las bases y los tres Java del entorno local preparado. Inicia otra entrada HTTP en un puerto efímero: compara lecturas de los tres roles y ejecuta registro, simulación, eventos y revocación con fixtures nuevos. Solo elimina esos fixtures por sus identificadores exactos; no reinicia el borde activo. Las herramientas de verificación/aprovisionamiento pueden utilizar PostgreSQL; el proceso del gateway no lo importa.

El build genera `gateway/dist`; no ejecuta Prisma ni construye Java. `npm test` cubre gateway y frontend. Las pruebas históricas se conservan en `legacy/backend`, fuera del workspace y de la instalación activa; su reproducción exige restaurar la disposición anterior en otro directorio, como explica [el archivo](../legacy/README.md). Las IT PostgreSQL siempre requieren bases exclusivas y activación explícita.
