# Despliegue PostgreSQL

## Backend en Render

Importa el proyecto como servicio web Node usando `render.yaml`. El build instala y compila la API; el predeploy aplica las migraciones PostgreSQL; el inicio ejecuta Express. Configura `DATABASE_URL` de PostgreSQL, `JWT_SECRET` y `FRONTEND_URL` (origen exacto del frontend). Render suministra `PORT`.

La base Render suministrada ya existe; no se crea otra ni se contrata un plan desde el código. La API aún debe desplegarse como servicio separado. Usa la URL interna cuando API y base estén en la misma región, con la política TLS apropiada de ese endpoint.

## Frontend en Vercel

Importa la raíz del repositorio. `vercel.json` define build, directorio y fallback de React Router. Configura `VITE_API_URL=https://TU-API/api` antes de compilar. No introduzcas credenciales de PostgreSQL en el frontend.

## GitHub Actions

`verify` usa PostgreSQL 16 efímero, genera Prisma, aplica migraciones, ejecuta lint, pruebas e integración y compila. Los secretos de pruebas son fixtures efímeros. Para activar el despliegue, configura el environment `production`, los secretos `DATABASE_URL`, `FRONTEND_DEPLOY_HOOK` y `BACKEND_DEPLOY_HOOK`, y la variable `DEPLOY_ENABLED=true`.

Los hooks solicitan el despliegue; confirma su finalización en cada proveedor. Desactiva despliegues que no esperen a CI. No se ejecutó el workflow en GitHub desde esta sesión.

## Migraciones

Los archivos SQL se generan mediante Prisma y viven en `apps/api/prisma/migrations`. El runner Node de `npm run db:migrate` aplica versiones pendientes en una transacción, verifica checksums y escribe el historial estándar de Prisma. Tiene bloqueo de concurrencia y rechaza bases existentes sin historial. No usa `db push` ni `migrate reset`.

El CLI estándar sigue disponible con `npm run db:migrate:prisma -w @stock-quest/api`; en esta sesión Windows falló su establecimiento TLS nativo, motivo por el que se incorporó el runner con `pg`. No mezcles la migración MySQL antigua con el nuevo historial PostgreSQL.

Referencias: [Render Postgres](https://render.com/docs/postgresql-creating-connecting) y [Prisma PostgreSQL](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql).
