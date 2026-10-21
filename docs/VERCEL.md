# Vercel: publicación temporal actual

Actualizado al 21 de octubre de 2026. Proyecto Vercel `stock-quest`, URL https://stock-quest-five.vercel.app. El usuario validó login, aprendizaje, simulador, progreso y recarga de rutas.

La interfaz estática compilada se publicó desde una carpeta `.stockquest-local/vercel-demo-*`, preparada con `scripts/prepare-vercel-demo.cjs`. Su configuración reenvía `/api` al túnel HTTPS de la API local y mantiene el fallback de React Router. No contiene los servicios Java, bases ni secretos. El PC, Stock Quest y Cloudflared deben permanecer activos.

El procedimiento reproducible y el cambio de URL del túnel están en [DESPLIEGUE-TEMPORAL-VERCEL.md](DESPLIEGUE-TEMPORAL-VERCEL.md). Inicialmente se propuso crear un proyecto de demostración, pero la CLI vinculó al proyecto existente `stock-quest`; antes de una nueva publicación revisar ese destino.

No se requieren credenciales PostgreSQL ni JWT en Vercel para este frontend estático. `VITE_API_URL=/api` se fijó al compilar. Nunca publicar secretos con prefijo VITE.

La CLI indicó protección de acceso Vercel. El usuario pudo ingresar y probar la aplicación; el acceso de terceros sin sesión debe comprobarse por separado antes de compartir el enlace. Cerrar el túnel deja la interfaz accesible, pero interrumpe la API.

## Configuración raíz del gateway

El `vercel.json` raíz y `api/index.js` se actualizaron para servir el gateway independiente como función sin Prisma. No son la carpeta usada en la presentación temporal y no fueron publicados en este bloque. Requieren PEOPLE_SERVICE_URL, LEARNING_SERVICE_URL, SIMULATION_SERVICE_URL, sus tokens HTTP y FRONTEND_URL; los Java deben ser accesibles por HTTPS. No alojan los tres servicios ni sus bases. Las plantillas anteriores se conservaron en `legacy/`.

Comprobación posterior a la activación: el túnel anterior no resolvió y `/api/health` público devolvió 502. La API local y el proxy frontend devolvieron 200; recuperar la conexión temporal antes de otra presentación.

No importar toda la raíz suponiendo que eso publicará la arquitectura Java actual. Para la entrega permanente falta desplegar gateway, servicios y bases con sus criterios operativos. Consultar [FASE-8-OPERACION.md](FASE-8-OPERACION.md).
