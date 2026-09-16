# Desplegar toda la aplicación en Render

Usa https://dashboard.render.com/select-repo?type=blueprint y selecciona Jd1278/Stock-Quest, rama main. Render lee render.yaml en la raíz. Se crea un Web Service gratuito en Oregon que publica frontend y API bajo el mismo dominio. La base PostgreSQL existente se conserva.

Introduce DATABASE_URL usando la External Database URL de tu base Render, comenzando por postgresql:// y añadiendo ?sslmode=require. No incluyas comillas, DATABASE_URL= ni espacios. JWT_SECRET se genera automáticamente. No necesitas VITE_API_URL ni FRONTEND_URL: se usa /api y RENDER_EXTERNAL_URL.

Build: npm ci --include=dev && npm run build
Start: npm run db:migrate && npm run start -w @stock-quest/api
Root Directory: raíz del repositorio (vacío).

Las migraciones se aplican antes de iniciar el servidor; no se ejecuta seed automáticamente ni se borran datos. Comprueba /api/health, /login y el inicio de sesión al finalizar. La aplicación verifica la conexión PostgreSQL antes de escuchar solicitudes.

El plan gratuito puede suspender el servicio por inactividad. No se crea otra base de datos ni se configura un plan de pago.
