# Personas y capacitación — Java

Tercer servicio del monorepo, Java 21 y Maven Wrapper fijado como los otros servicios. Puerto local por defecto 4030. Las capacidades `identidad`, `usuarios` y `capacitacion` tienen `Application`, `domain` e `Infrastructure`. La composición Spring/JDBC/HTTP queda en infraestructura; no se importan implementaciones de aprendizaje o simulación.

Estado al 21 de octubre de 2026: el entorno integrado usa el puerto 14630, con base propia y aceptación funcional local y temporal Vercel. Después de añadir métricas pasaron 40 pruebas JUnit sin BD. Los informes consultan aprendizaje por HTTP; las proyecciones AG-05 permanecen pendientes. Consultar [estado actual](../../docs/ESTADO-ACTUAL.md).

## Responsabilidades

- Registro público de aprendices y alta de empleados por su líder.
- Login con BCrypt coste 12 y JWT HS256 mediante Spring Security/Nimbus, issuer stock-quest y audience stock-quest-web.
- Validación de firma, vencimiento, issuer/audience y versión vigente de sesión. Se consulta la cuenta en cada petición; no hay caché de revocación.
- Perfil propio con confirmación de contraseña para cambiar correo/clave; esos cambios incrementan tokenVersion. No se exponen hashes, leaderId ni versiones en el perfil público.
- Edición/desactivación de aprendices del líder; desactivación revoca sesiones, reactivación no restaura tokens anteriores.
- Grupos, miembros, permisos y operaciones idempotentes de asignación/retirada.
- Informes individual/equipo mediante aprendizaje HTTP, previa autorización de pertenencia. Equipos se dividen en lotes de máximo 100 IDs; no se consulta SQL de otros servicios ni se devuelven informes parciales como éxito.
- Hechos MiembroAsignado, MiembroRetirado y UsuarioDesactivado en outbox de la misma transacción. Los informes siguen siendo consultas directas; no se depende de proyecciones aún no aceptadas.

## Persistencia y configuración

Flyway V1 administra exclusivamente people_users, people_groups, people_memberships, people_versions y people_outbox. Las FK son internas a personas. Usar una base NUEVA de desarrollo y otra exclusiva de pruebas; nunca la base Prisma o los historiales Flyway de los otros servicios.

Configurar PEOPLE_JDBC_URL, PEOPLE_DB_USER, PEOPLE_DB_PASSWORD, PEOPLE_JWT_SECRET (mínimo 32 bytes), opcional PEOPLE_JWT_EXPIRES_IN (8h), LEARNING_SERVICE_URL y LEARNING_SERVICE_TOKEN. `.env.example` es referencia, no se carga automáticamente.

No hay credenciales universales ni endpoint público para crear líderes/gestores. El aprovisionamiento inicial se revisa explícitamente en la activación; las verificaciones insertan únicamente cuentas ficticias en sus bases exclusivas. Los JWT de Express no se trasladan silenciosamente al nuevo propietario: al activar identidad Java se inicia sesión nuevamente.

## Construcción y pruebas

```powershell
.\mvnw.cmd -B -ntp test
.\mvnw.cmd -B -ntp -DskipTests package
```

Para PostgreSQL: crear una base exclusiva stockquest_test_people o sq_test_people_*, configurar SQ_PEOPLE_TEST_JDBC_URL, SQ_PEOPLE_TEST_DB_USER y SQ_PEOPLE_TEST_DB_PASSWORD; después:

```powershell
.\mvnw.cmd -B -ntp -Ppostgres-it verify
```

Las IT no ejecutan clean y solo limpian sus propios fixtures. El verificador completo `scripts/verify-phase5c-e2e.cjs` utiliza bases nuevas/migradas, puertos 14400/14410/14420/14430 y credenciales de proceso. No es idempotente sobre un currículo ya sembrado: para repetir desde cero se usa otro sufijo y nuevas bases. Conserva sus fixtures para inspección y cierra solo los procesos que creó.

## Activación supervisada posterior

1. Preparar bases y cuentas Java de desarrollo; verificar claves de servicio y JWT sin publicarlas.
2. Iniciar personas y comprobar `/health/ready`; mantener una recuperación revisada.
3. Configurar IDENTITY_ME_URL de simulación/aprendizaje hacia `http://127.0.0.1:4030/api/auth/me`. Personas valida sesiones en su propia base y no llama al endpoint Express, evitando recursión.
4. Reiniciar el borde con PEOPLE_BACKEND=java, PEOPLE_SERVICE_URL, LEARNING_BACKEND=java y SIMULATION_BACKEND=java. La configuración rechaza personas Java con los otros propietarios legacy.
5. El borde delega autenticación y rutas de personas. No necesita conectarse a Prisma en ese modo; las implementaciones legacy y el seed de usuarios quedan bloqueados. Se conserva `/api` del frontend y el límite de intentos de login/registro del borde.
6. Validar sesiones, perfiles, roles, equipos, grupos, contenido, simulación y eventos en UI. La activación en la aplicación abierta del usuario no es automática.

Antes de aceptar escrituras Java se puede mantener PEOPLE_BACKEND=legacy. Después, volver a legacy exige conciliación de cuentas, versiones y relaciones; cambiar una variable no sincroniza datos ni convierte sesiones. No se eliminó backend ni ninguna tabla anterior.

## Contratos HTTP

Rutas compatibles: POST /api/auth/register, login y logout; GET /api/auth/me; PATCH /api/users/me; POST /api/users; PATCH /api/users/{id}; GET/POST /api/groups; PATCH/DELETE /api/groups/{id}; POST /api/groups/{id}/members; DELETE /api/groups/{id}/members/{userId}; GET /api/reports y /api/reports/{id}.

Errores `{message, issues?}`; sin sesión 401, rol 403, objeto ajeno/inexistente 404, unicidad/referencias 409 y dependencia inaccesible 503. Readiness comprueba la base propia, no acredita por sí sola la disponibilidad de aprendizaje. Las rutas y bases privadas deben quedar protegidas en la infraestructura de despliegue posterior.

## Informes proyectados, AG-05

PEOPLE_REPORTS_MODE=projection activa los informes desde su proyección local. PEOPLE_SERVICE_TOKEN protege la recepción y reconstrucción; LEARNING_SERVICE_TOKEN protege bootstrap/replay hacia la fuente. http conserva un modo explícito de recuperación. Un informe inicializado funciona con aprendizaje caído; uno sin inicializar requiere un snapshot y puede responder 503. El supervisor local está activado en projection. Véase [implementación y resultados](../../docs/AG05-PROYECCIONES-20261021.md).
