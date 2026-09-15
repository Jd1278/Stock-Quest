# Conexión PostgreSQL remota

Esta versión usa PostgreSQL. Las instrucciones MySQL de versiones anteriores ya no aplican al código actual.

Configura `DATABASE_URL` en `apps/api/.env` o en el entorno del backend. Para Render externo:

```dotenv
DATABASE_URL="postgresql://USUARIO:CONTRASEÑA@HOST:5432/BASE?sslmode=require&sslaccept=strict&connect_timeout=15&connection_limit=5"
```

Codifica caracteres especiales de usuario y contraseña para URL. El adaptador `@prisma/adapter-pg` utiliza Node.js/pg para conectar; no usa el proveedor TLS de Windows. Se requiere cifrado y se valida el certificado con `sslaccept=strict`. `sslaccept=accept_invalid_certs` desactiva esa validación y no es necesario en la conexión Render que se comprobó.

Ejecuta `npm run db:check`. Para comprobar un archivo privado sin cambiar la configuración activa: `npm run db:check -- --env "C:/ruta/privada/remoto.env"`. El diagnóstico solo ejecuta `SELECT 1` y consulta `pg_stat_ssl`; no escribe datos ni muestra credenciales.

Cuando alojes la API en Render, usa preferiblemente la URL interna de la base si ambos servicios están en la misma región. La política TLS del endpoint interno puede ser diferente: consulta la configuración del proveedor y no copies parámetros a ciegas. Mantén la URL externa para desarrollo desde tu equipo.

No se trasladan automáticamente los datos de MySQL al cambiar la conexión. El seed crea contenido inicial y cuentas opcionales, sin sobrescribir registros existentes.

Referencia: [conexiones Render Postgres](https://render.com/docs/postgresql-creating-connecting).
