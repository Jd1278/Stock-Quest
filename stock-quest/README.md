# Stock Quest — PostgreSQL

Aplicación de capacitación en inventarios y logística: React 18, TypeScript, Zustand, React Router, TailwindCSS, Lucide y Phaser 3. Backend Express con Prisma 6, adaptador PostgreSQL de Node.js, JWT Bearer y bcrypt.

## Configuración

Requiere Node.js 22.18 o superior. Ejecuta los comandos desde la raíz del proyecto.

1. `npm ci`
2. Copia `apps/api/.env.example` a `apps/api/.env` si aún no existe. Configura `DATABASE_URL`, `JWT_SECRET` y `FRONTEND_URL`.
3. `npm run db:generate`
4. `npm run db:check`
5. Para una base nueva exclusiva de Stock Quest: `npm run db:migrate` y `npm run db:seed`.
6. `npm run dev`

Para Render externo usa una URL `postgresql://USUARIO:CONTRASEÑA@HOST:5432/BASE?sslmode=require&sslaccept=strict&connect_timeout=15&connection_limit=5`. Las credenciales pertenecen solo al backend; nunca a variables `VITE_` ni a Git. En esta copia local se configuró la conexión Render proporcionada por el propietario en `.env`, excluido del ZIP.

Para PostgreSQL local, `compose.yaml` usa PostgreSQL 16: define `POSTGRES_PASSWORD` y ejecuta `docker compose up -d`. Usa el usuario `stockquest`, puerto 5432 y base `stockquest` en la URL local. No es necesario arrancar Docker si utilizas Render.

## Usuarios y contenido

El registro público crea aprendices. El seed contiene nueve módulos, nueve microlecciones, nueve desafíos y dos escenarios. Para crear el gestor y el líder, define las variables `SEED_ADMIN_*` y `SEED_LEADER_*` con contraseñas propias antes del seed. No existen contraseñas universales. En la copia local se conservan las variables privadas de aprovisionamiento.

La interfaz permite aprendizaje secuencial, desafíos, simulaciones con decisiones evaluadas en el servidor, progreso, logros, perfiles, informes de equipo, grupos y gestión pedagógica. Los videos se vinculan por ID de YouTube; faltan los videos del canal específico del proyecto.

## Migración de MySQL a PostgreSQL

Se cambió el proveedor Prisma, el diagnóstico, el controlador de conexión, la migración inicial, Docker y CI. PostgreSQL almacena los campos JSON como JSONB y los roles como enum. La API y las pantallas conservan su contrato.

La base MySQL anterior no fue borrada ni se trasladaron sus usuarios/resultados. Esta versión inicializa un esquema PostgreSQL nuevo; no debe aplicar SQL PostgreSQL a una base MySQL. La migración anterior se conserva como respaldo de trabajo y en los ZIP previos.

`npm run db:migrate` ejecuta el SQL generado por Prisma con el cliente PostgreSQL de Node.js. Usa una transacción, bloqueo asesor e historial `_prisma_migrations` con checksums. Rechaza un esquema con tablas sin historial y migraciones modificadas/incompletas. Esto evita el proveedor TLS nativo de Windows que falló en esta sesión. `npm run db:migrate:prisma -w @stock-quest/api` mantiene disponible el CLI estándar `prisma migrate deploy` para entornos compatibles.

## Validación

- `npm run lint`
- `npm test`
- `npm run build`

Las pruebas de integración requieren `RUN_DB_TESTS=1` y una base cuyo nombre empiece con `sq_test_` o `stockquest_test`, o un esquema dedicado cuyo nombre cumpla `sq_test_[a-z0-9]+`. Nunca uses `public` en una base de aplicación para estas pruebas. CI usa PostgreSQL 16 efímero.

En Windows, si Vite falla al cargar su configuración en el entorno restringido, ejecuta el build frontend con `-- --configLoader native`, `GOMAXPROCS=2`, `GOMEMLIMIT=384MiB` y `NODE_OPTIONS=--max-old-space-size=640`. La API compilada se inicia con `npm run start -w @stock-quest/api`.

## Documentación

- [Conexión remota](docs/BASE-REMOTA.md)
- [Despliegue en Render y Vercel](docs/DESPLIEGUE.md)
- [Contrato de la API](docs/API.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Verificación PostgreSQL](docs/POSTGRESQL.md)

El backend todavía requiere publicarse como servicio web; disponer de la base de datos Render no publica la API. No se ha ejecutado GitHub Actions ni certificado disponibilidad del 99 %, rendimiento de 3 segundos o compatibilidad visual en todos los navegadores.
