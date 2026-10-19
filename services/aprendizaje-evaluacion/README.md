# Aprendizaje y evaluación — Java

Servicio de fase 5B, puerto local 4020, Java 21 y Maven Wrapper. El usuario autorizó posteriormente la ejecución por el asistente: 27 pruebas sin BD y seis IT PostgreSQL aprobadas, junto con el recorrido aislado Express–Java y las regresiones. [Evaluación completa](../../docs/verificaciones/fase5b-20261019/RESULTADOS.md). La activación en el entorno abierto y la validación humana siguen pendientes; no se cambia automáticamente su propietario.

## Capacidades

`contenidos`, `evaluaciones` y `progreso` contienen cada uno `Application`, `domain` e `Infrastructure`. Dominio y aplicación no importan Spring, Jackson, JDBC ni adaptadores de otro servicio. Spring Boot compone puertos y adaptadores en la raíz de infraestructura. Maven y sus versiones coinciden con el servicio de simulación ya validado.

- Ruta secuencial, ocultación de lecciones bloqueadas y DTO de desafío sin solución.
- Intentos, nota 0/100, feedback, conteo de intentos y finalización con prerrequisitos.
- Administración de módulos, lecciones, vídeos y desafíos, incluido PUT sin vídeo que lo retira.
- XP por mejor intento, promedio de todos los intentos por tema, logros, resumen completo de simulación y actividades.
- Inbox de simulación con deduplicación, conflicto de payload y transacción de logro.
- Outbox transaccional de hechos LeccionCompletada y DesafioRespondido, versionados por usuario. Sin dispatcher de aprendizaje ni proyección de personas activos todavía; corresponden a la integración del siguiente servicio.

## Construcción y pruebas personales

Desde esta carpeta:

```powershell
.\mvnw.cmd -B -ntp -DskipTests package
.\mvnw.cmd -B -ntp test
```

Las 27 pruebas sin PostgreSQL y seis IT PostgreSQL se ejecutaron y aprobaron en la verificación del 19 de octubre de 2026. Compilar las fuentes por sí solo no declara aprobadas otras comprobaciones.

Para las IT, crear una base nueva, vacía y exclusiva `stockquest_test_learning`, cuyo dueño sea el usuario de pruebas. No reutilizar `stockquest_test_simulation` ni `stockquest_test_backend`: cada servicio tiene su propio historial Flyway.

Configurar en la sesión, sin publicar contraseñas:

```powershell
$env:SQ_LEARNING_TEST_JDBC_URL = 'jdbc:postgresql://127.0.0.1:5432/stockquest_test_learning'
$credencialLearning = Get-Credential -Message 'Usuario y contraseña de la base exclusiva de aprendizaje'
$env:SQ_LEARNING_TEST_DB_USER = $credencialLearning.UserName
$env:SQ_LEARNING_TEST_DB_PASSWORD = $credencialLearning.GetNetworkCredential().Password
.\mvnw.cmd -B -ntp -Ppostgres-it verify
```

Flyway aplica solo la migración del servicio. Las IT no ejecutan clean; retiran sus propios fixtures. Usar una base con currículo vacío y no cargar el fixture de desarrollo antes de ejecutar estas pruebas.

## Arranque posterior a validación

`.env.example` es referencia; Spring no lo carga. Configurar LEARNING_JDBC_URL, LEARNING_DB_USER y LEARNING_DB_PASSWORD para una nueva base de desarrollo, diferente de la base de IT; IDENTITY_ME_URL hacia Express; SIMULATION_SERVICE_URL hacia Java; SIMULATION_SERVICE_TOKEN compartido con simulación; LEARNING_SERVICE_TOKEN compartido con Express y SIMULATION_EVENT_TOKEN coincidente con el productor.

```powershell
java -jar target/aprendizaje-evaluacion-0.1.0-SNAPSHOT.jar
```

Liveness `/health/live`, readiness `/health/ready` comprueba persistencia. No acredita disponibilidad de identidad o simulación, que se verifica por el recorrido correspondiente. Referencia explícita de contenido de desarrollo: `src/main/resources/db/dev/contenido.sql`, solo para una base nueva de desarrollo tras Flyway.

Rutas públicas compatibles: GET /api/modules, GET /api/lessons/{id}, POST /api/lessons/{id}/complete, POST /api/challenges/{id}/attempts, GET /api/progress; POST/PUT /api/admin/modules, lessons y challenges. Todas resuelven Bearer mediante Express; las escrituras pedagógicas requieren gestor, los intentos/finalización requieren aprendiz.

Internas: GET /internal/admin/modules (servicio y gestor), GET /internal/users/{id}/learning-report y POST /internal/learning-reports/query (servicio), POST /internal/events (credencial de eventos y esquema v1). El borde autoriza pertenencia al equipo antes de solicitar informes. Nunca publicar estas rutas mediante el proxy del frontend.

## Cambio de propietario

Solo tras validar: reiniciar Express con SIMULATION_BACKEND=java, LEARNING_BACKEND=java, LEARNING_SERVICE_URL y LEARNING_SERVICE_TOKEN. Se mantiene `/api` del frontend. El endpoint temporal de eventos de Express reenvía a aprendizaje y confirma 204 únicamente tras ACK de Java. La lógica legacy de aprendizaje y su seed quedan bloqueados en ese modo; no existe fallback a Prisma.

Las pruebas SQL y cambios de usuarios de fase 5A no se trasladan al esquema de aprendizaje. La identidad continúa en Express y los resultados de simulación siguen en Java. El progreso consulta el resumen de simulación sin sumar XP del evento. Los eventos antiguos ya entregados al consumidor Express no se reproducen automáticamente en el nuevo inbox.

Antes de habilitar escrituras Java puede mantenerse LEARNING_BACKEND=legacy. Después del cambio, volver a legacy exige conciliación revisada de los datos creados; no es un rollback automático por variable. No se borran tablas existentes.
