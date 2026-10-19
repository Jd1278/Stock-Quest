# Fase 4 — Primer corte Java de simulación

## Autorización y alcance

El usuario aprobó el diseño de fase 3 y autorizó comenzar fase 4. Se implementa un servicio separado en `services/simulacion-logistica`; no se inicia fase 5 ni se cambia el tráfico de React/Express. Inicialmente las pruebas aisladas quedaron a cargo del usuario; el 19 de octubre de 2026 autorizó expresamente al asistente a ejecutarlas para esta fase.

Se preservan la corrección local de migraciones de fase 2, el frontend, el esquema Prisma y sus datos. No se ejecutaron migraciones, seed, conexiones PostgreSQL ni despliegues por el asistente.

## Cambios implementados

- Proyecto Java con Spring Boot, Maven Wrapper y bytecode objetivo 21.
- Capacidad `simulacion` con las tres capas y submódulos `escenarios` y `partidas`, también con tres capas.
- Motor equivalente al TypeScript y snapshot inmutable de escenario.
- Casos de uso de inicio, consulta, historial y decisión.
- JDBC con propiedad de datos local, actualización condicional por día y transacción que incluye resultado/outbox.
- Identidad mediante `/auth/me`, sin caché, redirecciones ni acceso a User.
- Cinco rutas de simulación compatibles, errores, validación JSON estricta y salud.
- Migración Flyway y fixture de desarrollo explícito, sin ejecución automática del fixture.
- Pruebas JUnit de dominio/aplicación, MockMvc, identidad, ArchUnit y perfil PostgreSQL.

Los pasos de ejecución y las limitaciones están en `services/simulacion-logistica/README.md`.

## Evidencias de construcción

Comando final ejecutado desde el servicio:

```powershell
.\mvnw.cmd -B -ntp -DskipTests -Ppostgres-it verify
```

Resultado inicial: BUILD SUCCESS, código de salida 0. Compiló 28 fuentes de producción y siete fuentes de prueba/fixtures. Surefire y Failsafe informaron explícitamente `Tests are skipped`. Hay 25 métodos de prueba preparados: 22 sin PostgreSQL y tres IT. Los resultados de la ejecución posterior autorizada se registran a continuación.

El JAR generado es `services/simulacion-logistica/target/simulacion-logistica-0.1.0-SNAPSHOT.jar`. Inspección sin arrancarlo: manifest con JarLauncher y Start-Class del servicio, clases y dependencias incluidas, class major version 65 (Java 21). Build-Jdk-Spec 22 registra el JDK utilizado, no cambia el destino 21.

Otras comprobaciones ejecutadas:

- Imports de las capas Application/domain: no se encontraron dependencias hacia frameworks ni Infrastructure. Esto no reemplaza ejecutar ArchUnit.
- `node contracts/validar-inventario.cjs`: aprobado, 35 operaciones, 13 propietarios de modelos y 107 referencias resueltas. El inventario sigue siendo del contrato público completo, no una afirmación de que las 35 operaciones estén implementadas en Java.
- `git diff --check`: sin errores en cambios registrados por Git.
- Comparación de rutas Express, frontend, lockfile, esquema Prisma y despliegues: sin cambios de fase 4.
- `target` y archivos `.env` permanecen ignorados; `.env.example` sí está disponible para versionar.

Se corrigió durante la preparación la sintaxis de un argumento Maven en PowerShell (`-Dmaven=3.9.11` debe pasarse entre comillas al generar el wrapper). La generación posterior del wrapper terminó correctamente. No fue un fallo del código de Stock Quest.

No se ejecutó el servidor, no hubo conexión a PostgreSQL ni ejecución de Flyway. La compilación no demuestra el SQL en ejecución, el arranque de Spring ni la compatibilidad funcional con la UI; son verificaciones a cargo del usuario.

## Criterios de aceptación y pendientes

| Criterio | Estado |
|---|---|
| C4-01 Separación de dependencias | Dos pruebas ArchUnit aprobadas |
| C4-02 Paridad del motor | Ocho pruebas de motor aprobadas; cobertura limitada a los casos preparados |
| C4-03 Permisos y errores | Pruebas de aplicación, MockMvc y adaptador de identidad aprobadas; no se certifica un servidor completo |
| C4-04 Rollback de persistencia/outbox | Adaptadores e IT preparados; pendiente PostgreSQL |
| C4-05 Concurrencia | UPDATE condicional e IT preparados; pendiente PostgreSQL |
| C4-06 Snapshot | Modelo inmutable e IT preparada; pendiente PostgreSQL |
| C4-07 Contrato | Cinco pruebas MockMvc aprobadas; no equivalen a validación integral de las 35 operaciones públicas |
| C4-08 Evidencias de pruebas | 22 aprobadas; tres IT no ejecutadas, pendientes |

No se presenta la compilación como aceptación funcional. Para validar esta fase el usuario ejecuta sus pruebas y comparte los resultados o acepta expresamente sus pendientes. Solo después se solicita autorización para fase 5A.

## Ejecución autorizada del 19 de octubre de 2026

Comando: `.\mvnw.cmd -B -ntp test`. Resultado: BUILD SUCCESS, código 0, duración Maven 26,259 segundos. Se inspeccionaron los XML de `target/surefire-reports`, no solo el mensaje de compilación.

| Suite | Casos | Fallos | Errores | Omitidos |
|---|---:|---:|---:|---:|
| ArquitecturaTest | 2 | 0 | 0 | 0 |
| IdentidadHttpTest | 3 | 0 | 0 | 0 |
| MotorInventarioTest | 8 | 0 | 0 | 0 |
| PartidasHttpTest | 5 | 0 | 0 | 0 |
| RegistrarDecisionTest | 4 | 0 | 0 | 0 |
| Total ejecutado | 22 | 0 | 0 | 0 |

Se verificaron reglas de inventario, restricciones de dependencia, consulta de identidad sin caché, errores/validación HTTP y orquestación del cierre con evento. Las pruebas de HTTP usan MockMvc y las de identidad su propio servidor loopback, no cuentas o bases reales.

Mockito/Byte Buddy emitieron advertencias sobre carga dinámica de agente en JDK 22. No provocaron fallos. Su configuración explícita como agente es una mejora pendiente de mantenimiento, no una prueba fallida.

Las variables SQ_TEST_JDBC_URL, SQ_TEST_DB_USER y SQ_TEST_DB_PASSWORD no estaban configuradas. Se encontró PostgreSQL 16.13 instalado fuera de PATH. El intento de preparar y arrancar un cluster temporal independiente fue rechazado antes de ejecutar el comando por la revisión automática, con el motivo genérico `blocked by policy`; no se proporcionó razón adicional. No se creó el cluster, no se conectó a las bases existentes y no se ejecutaron migraciones.

Por ello, las tres pruebas PersistenciaPostgresIT de concurrencia, rollback y snapshot/propiedad no se ejecutaron. No figuran como omitidas en el total de Surefire porque pertenecen al perfil separado de integración. No hay XML de ejecución Failsafe. Permanecen pendientes antes de certificar persistencia y dar aceptación completa a fase 4.
