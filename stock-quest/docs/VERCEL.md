# Despliegue completo en Vercel

Importa Jd1278/Stock-Quest. Root Directory: stock-quest. Framework: Other. Node.js: 22.x. La configuración vercel.json instala con npm ci, compila API y web y publica apps/web/dist. /api se atiende mediante Express en una función; el resto usa React Router. No depende de localhost ni de un backend adicional en Render.

Variables del servidor (Production):
- DATABASE_URL: conexión externa PostgreSQL Render con ?sslmode=require&sslaccept=strict&connection_limit=2&connect_timeout=15. Usa el valor privado, no lo subas al repositorio.
- JWT_SECRET: secreto aleatorio de al menos 32 caracteres.
- JWT_EXPIRES_IN: 8h.
- FRONTEND_URL: URL pública definitiva del proyecto, por ejemplo https://tu-proyecto.vercel.app.

No configurar VITE_API_URL: el frontend usa /api en el mismo dominio. Nunca usar prefijo VITE_ para credenciales. Configurar una base independiente si se habilitan previews con escrituras.

Las migraciones y seed no se ejecutan en cada build. La base Render actual ya tiene el esquema. Para una base nueva, ejecutar npm run db:migrate y npm run db:seed desde un entorno con sus variables privadas antes de usar la app.

Después de desplegar, verificar /api/health, /login, el logo, inicio/cierre de sesión y carga de módulos. Los límites de solicitudes actuales viven en memoria por instancia; para límites globales entre instancias se necesita un almacén compartido o reglas de Vercel Firewall.

Referencia: https://vercel.com/docs/functions/runtimes/node-js