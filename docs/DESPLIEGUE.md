# Despliegue de Stock Quest

Estado actualizado al 21 de octubre de 2026. La entrega temporal fue validada anteriormente. En la verificación posterior a la retirada, la API local y el proxy frontend dieron 200; el túnel anterior no resolvió y la API pública Vercel dio 502. Esa conexión temporal necesita recuperación antes de otra presentación. No se republicó Vercel en este bloque. La infraestructura permanente sigue pendiente.

## Arquitectura publicada para la presentación

- Frontend compilado en Vercel, proyecto `stock-quest`: https://stock-quest-five.vercel.app.
- `/api` reenviado por Vercel al túnel HTTPS Cloudflare hacia el gateway local 14600.
- Gateway Express y tres servicios Java con sus bases PostgreSQL en el equipo del usuario.
- Stock Quest y el túnel deben estar activos; reiniciar el túnel puede cambiar su URL y exigir actualizar la publicación.

El procedimiento vigente es [DESPLIEGUE-TEMPORAL-VERCEL.md](DESPLIEGUE-TEMPORAL-VERCEL.md). Se subió una carpeta de estáticos preparada, no toda la raíz del repositorio. El usuario confirmó login, aprendizaje, simulación, progreso y recarga de rutas. La auditoría verificó salud pública HTTP 200; eso no sustituye una prueba de disponibilidad prolongada.

## Preparación de la entrega permanente

Continúan pendientes el pipeline Java de Jenkins, una versión/release reproducible, alojamiento estable de API/servicios y bases, infraestructura acordada con CloudFormation, protección de datos, restauración/rollback y monitorización continua con alertas. Consultar [fase 8](FASE-8-OPERACION.md) y [estado actual](ESTADO-ACTUAL.md).

Grafana y Prometheus ya se instalaron y se ensayaron localmente; no se certificaron como operación permanente. Jenkins ya está instalado, pero no hay ejecución acreditada del pipeline de los tres servicios. GitHub Actions se ajustó a gateway/frontend sin Prisma, migraciones ni hooks antiguos. Su nueva ejecución en GitHub, el build Java y el release no se acreditan en este bloque.

## Plantillas del borde y archivo histórico

`render.yaml`, `vercel.json` y `api/index.js` raíz ahora usan el gateway independiente sin Prisma. No se desplegaron en esta entrega ni alojan los Java/bases. Las plantillas anteriores están en `legacy/`. Véanse [RENDER.md](RENDER.md) y [VERCEL.md](VERCEL.md).

Migraciones legacy archivadas en `legacy/backend/prisma/migrations`, fuera de los comandos y workspaces actuales. Migraciones Java: `services/<servicio>/src/main/resources/db/migration`, propias de cada servicio y ejecutadas por Flyway. No ejecutar migraciones/seed legacy sobre las bases Java ni aplicar SQL de MySQL a PostgreSQL. No usar `db push`, `migrate reset`, DROP o TRUNCATE como procedimiento de despliegue.

Secretos de base, JWT y servicio pertenecen a configuración privada del servidor; nunca a variables VITE ni al paquete estático. El archivo DPAPI local no se publica y depende del usuario Windows del equipo preparado.
