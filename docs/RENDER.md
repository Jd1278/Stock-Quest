# Render: plantilla del gateway y frontend

La plantilla raíz render.yaml se actualizó el 21 de octubre de 2026 para la entrada independiente. No fue desplegada durante el archivo de legacy. No aloja los tres Java ni crea sus bases.

Build: npm ci --include=dev && npm run build. Arranque: npm run start -w @stock-quest/gateway. HOST=0.0.0.0 permite escuchar en el puerto del proveedor; SERVE_WEB=true sirve frontend/dist. Configurar FRONTEND_URL, los tres SERVICE_URL y los tokens de aprendizaje/simulación. Los orígenes Java deben ser accesibles mediante HTTPS; no usar direcciones loopback del PC desde Render.

El gateway no requiere DATABASE_URL ni JWT_SECRET, y no ejecuta migraciones ni seed. Cada servicio Java conserva Flyway y su propia conexión. La plantilla y el procedimiento Node/Prisma anteriores están archivados en legacy; no aplicarlos a las bases Java.

El alojamiento permanente y la elección de proveedores/planes siguen pendientes de la etapa operativa supervisada. Consultar [estado vigente](ESTADO-ACTUAL.md), [despliegue](DESPLIEGUE.md) y [presentación temporal](DESPLIEGUE-TEMPORAL-VERCEL.md).
