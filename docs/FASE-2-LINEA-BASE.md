# Fase 2 — Línea base previa a la migración Java

## Alcance y referencia

Revisión del 18 de octubre de 2026, sobre el commit `0547d891c06e6f0c7160ecb4cd0598d7cf0f1312`, en la rama `codex/reestructuracion-stock-quest`.

El usuario confirmó la migración progresiva a Java y que no existen datos que deban conservarse. Las pruebas aisladas serán ejecutadas personalmente por el usuario. Esta fase comprueba dependencias, análisis estático y compilación; no ejecuta Jest, integración, migraciones, seed, conexiones de aplicación a PostgreSQL ni despliegues.

La fase 2 no certifica aceptación funcional. Su validación queda pendiente de los resultados de pruebas del usuario o de su aceptación expresa de esas excepciones.

## Entorno observado

| Elemento | Resultado |
|---|---|
| Node.js | 24.15.0 |
| npm | 11.12.1 |
| Java y javac | 22.0.2 |
| Maven | No localizado en PATH |
| Maven Wrapper | No presente en el proyecto inspeccionado |
| Docker | No localizado en PATH |
| CI existente | Node.js 22.18.0 y PostgreSQL 16 |
| Archivos `.env` raíz/backend | No presentes al inicio |
| Dependencias locales | No presentes al inicio |

La diferencia de versión Node local/CI limita la equivalencia de los resultados. Java 22 disponible no fija todavía la versión objetivo del backend. Maven y su wrapper se prepararán cuando se apruebe el diseño del servicio Java; no se instalaron herramientas globales en esta fase.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| Estado Git inicial | Árbol limpio en el commit de referencia |
| Inspección de scripts y configuración | Completada |
| `npm.cmd ci --no-audit --no-fund` | Aprobada; 692 paquetes instalados, código de salida 0 |
| `npm.cmd run lint` | Aprobada; sin errores ni advertencias, código de salida 0 |
| `npm.cmd run build` | Aprobada; generación Prisma 6.19.0, TypeScript backend/frontend y Vite, código de salida 0 |
| Jest backend/frontend | No ejecutado; a cargo del usuario |
| Integración PostgreSQL | No ejecutada; a cargo del usuario |
| Flujos completos y navegadores | No ejecutados |

No se ejecutó auditoría de vulnerabilidades. Las advertencias de obsolescencia de npm no se interpretan como un análisis de seguridad completo.

Vite 6.4.3 emitió una advertencia de tamaño: el chunk de Phaser ocupa 1.481,77 kB minificado y 339,84 kB gzip. La compilación terminó correctamente. Estos tamaños no demuestran el cumplimiento del requisito de carga en tres segundos a 10 Mbps.

## Fallos y limitaciones preexistentes

### LB-01 — Script de migraciones incompatible con el cliente actual — corregido en código

En la línea base original, `backend/scripts/migrate-postgres.mjs:11` llama a `connection.connectionOptions()`, pero `backend/prisma/client.cjs` exportaba únicamente `createClient`.

La incompatibilidad se identificó por inspección del código; no se ejecutó una migración para reproducirla. Afectaba a `npm run db:migrate`, al workflow CI/deploy y al inicio configurado en Render. El fallo ocurría antes de abrir la conexión del runner. No fue introducido durante la reestructuración.

Por solicitud expresa del usuario, se restauró `connectionOptions` y su exportación sin cambiar `createClient()` ni el motor binario de Prisma. Se recupera la configuración previa para el migrador node-postgres: esquema validado, TLS según la URL, certificado CA, límite de conexiones y timeout. El runner conserva transacciones, bloqueo asesor e historial con checksums.

Se añadieron tres pruebas de regresión en `backend/src/config/database.test.ts`, conservando la prueba existente de creación del cliente. Cubren opciones TLS/esquema, eliminación de parámetros interpretados, límites/timeout, URL no PostgreSQL y esquema inseguro. No se ejecutaron, por acuerdo con el usuario.

Comprobaciones posteriores a la corrección: `node --check backend/prisma/client.cjs`, `node --check backend/scripts/migrate-postgres.mjs`, `npm.cmd run lint`, `npm.cmd run build -w @stock-quest/api` y `git diff --check`: todas terminaron con código 0. No se ejecutaron migraciones ni conexiones PostgreSQL; la aceptación con base real sigue pendiente.

### LB-02 — Documentación histórica de PostgreSQL desactualizada

`docs/POSTGRESQL.md` describe `engineType = client` y el adaptador Node/pg. El esquema actual utiliza el motor binario de Prisma para la aplicación. El migrador utiliza node-postgres y, tras la corrección LB-01, recupera su función de opciones. Los resultados históricos de pruebas no acreditan el estado actual.

### LB-03 — Validación funcional pendiente

No hay un entorno de aplicación configurado en esta copia. No se comprobó autenticación, persistencia ni navegación integrada. El usuario ejecutará sus pruebas aisladas; no se considera aprobada ninguna prueba no ejecutada.

## Comandos para las pruebas del usuario

Ejecutar desde la raíz del repositorio en una terminal dedicada. Los valores siguientes son exclusivos del entorno local de pruebas, no credenciales de aplicación.

### Unitarias y frontend, sin habilitar integración

```powershell
$env:DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/stockquest_test'
$env:JWT_SECRET = 'stockquest-local-tests-only-secret-2026'
$env:RUN_DB_TESTS = '0'
npm.cmd test
```

Para ejecutar únicamente las pruebas de configuración de conexión, con las mismas variables de sesión:

```powershell
npm.cmd test -w @stock-quest/api -- --runTestsByPath src/config/database.test.ts
```

La URL permite cargar la configuración del backend; no acredita que exista una base. Revisar por separado pruebas aprobadas, fallidas y omitidas. Las seis pruebas de integración deben aparecer omitidas en este recorrido. Una falla de importación también cuenta como fallo, aunque la integración esté deshabilitada.

### Integración con una base PostgreSQL vacía y exclusiva

1. Aprovisionar personalmente una base de pruebas cuyo nombre empiece por `sq_test_` o `stockquest_test`.
2. Configurar `DATABASE_URL` con esa base y `JWT_SECRET` para pruebas, únicamente en la terminal dedicada.
3. Confirmar el destino antes de ejecutar comandos que escriben datos.
4. La corrección LB-01 permite volver a utilizar `npm.cmd run db:migrate`; verificar su ejecución e idempotencia en esa base exclusiva. No se ha validado este paso aquí. El comando de Prisma CLI siguiente sigue disponible como alternativa, pero no sustituye la comprobación del runner corregido.

```powershell
npm.cmd run db:migrate:prisma -w @stock-quest/api
$env:RUN_DB_TESTS = '1'
npm.cmd test -w @stock-quest/api -- --runTestsByPath src/services/integration.test.ts
```

La alternativa Prisma CLI está prevista en el repositorio, pero no se ejecutó ni validó aquí. La suite crea y elimina fixtures. Utilizar una base vacía sin seed para evitar interferencias con sus supuestos de orden del currículo.

Al cerrar la terminal se descartan estas variables de sesión. Compartir los resúmenes de Jest y errores, sin URLs de conexión ni secretos.

## Cierre y siguiente fase

La revisión inicial solo añadió este registro. La medida correctiva posterior modificó `backend/prisma/client.cjs` y amplió `backend/src/config/database.test.ts`; el lockfile, el esquema y las migraciones SQL permanecen sin cambios. Las dependencias y productos de compilación están ignorados. No se crearon commits ni se publicó nada.

Antes de pasar a diseño: revisar resultados estáticos y de compilación y registrar las pruebas pendientes a cargo del usuario. LB-01 está corregido en código, pendiente de verificación funcional por el usuario. Se requiere validación expresa del usuario para avanzar a la fase 3.
