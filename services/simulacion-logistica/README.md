# Servicio de simulación logística

Primer servicio Java de Stock Quest. Incluye el corte de fase 4 y la extracción de fase 5A. Estado al 21 de octubre de 2026: el entorno integrado activa `SIMULATION_BACKEND=java` y usa el puerto 14610, con su base propia; el usuario validó la simulación local y la publicación temporal Vercel. La configuración por defecto del borde aún permite legacy. Después de añadir métricas pasaron 37 pruebas JUnit sin BD y se ensayó dos veces la caída/recuperación de este servicio con PASS. Consultar [estado actual](../../docs/ESTADO-ACTUAL.md); la fase 5A conserva su evidencia histórica.

## Estructura implementada

```text
src/main/java/com/stockquest/simulacion/
  Application/        IdentidadActual, UnidadDeTrabajo
  domain/             UsuarioAutenticado, ParametrosEscenario, Fallo
  Infrastructure/     Arranque Spring, composición, JSON, transacciones, salud
  escenarios/
    Application/      CatalogoEscenarios
    domain/           Escenario
    Infrastructure/   Catálogo PostgreSQL
  partidas/
    Application/      RegistrarDecision, GestionPartidas, puertos de partida y outbox
    domain/           Partida, MotorInventario, ResultadoSimulacion
    Infrastructure/
      http/           Controladores, DTO, validación, errores y filtro
      identity/       Consulta HTTP al propietario de identidad
      persistence/    JDBC y outbox
```

Dominio y aplicación no dependen de Spring, Jackson ni JDBC. Los adaptadores se conectan en ConfiguracionSimulacion. No hay acceso a tablas Prisma ni a bases de otros servicios.

## Versiones y construcción

- Java objetivo 21; compilación de referencia realizada con JDK 22 y `--release 21`.
- Spring Boot 3.5.16; su BOM fija JUnit Jupiter 5.12.2, Surefire/Failsafe 3.5.6 y dependencias compatibles.
- Maven 3.9.11 mediante Wrapper 3.3.4, con SHA-256 de distribución fijado.
- ArchUnit 1.4.1 para las pruebas de dependencias.

El wrapper se obtuvo del plugin oficial Maven. El bootstrap se descargó en un directorio temporal y se contrastó con su SHA-512 publicado; no se instaló Maven global ni se cambió el JDK. Fuentes: [Spring Boot](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [Maven Wrapper](https://maven.apache.org/tools/wrapper/).

Desde esta carpeta:

```powershell
.\mvnw.cmd -B -ntp -DskipTests package
```

Compila también las fuentes de pruebas sin ejecutarlas. Genera `target/simulacion-logistica-0.1.0-SNAPSHOT.jar`. La versión SNAPSHOT corresponde al proyecto en desarrollo; las dependencias y herramientas están fijadas a versiones estables.

## Pruebas a ejecutar personalmente

No requieren Docker. Las unitarias, de contrato con MockMvc y de arquitectura no usan PostgreSQL. La prueba del adaptador de identidad levanta su propio servidor HTTP en loopback y puerto efímero; no consulta cuentas reales.

```powershell
.\mvnw.cmd -B -ntp test
```

Para integración, preparar una base PostgreSQL exclusiva nueva cuyo nombre comience por `sq_test_` o `stockquest_test`. Las IT se niegan a conectar si faltan variables o si el nombre no cumple. No utilizar datos compartidos: Flyway crea las tablas del servicio y las pruebas escriben y retiran sus propios fixtures. No se ejecuta `clean`, `DROP DATABASE` ni truncado general.

Configurar `SQ_TEST_JDBC_URL`, `SQ_TEST_DB_USER` y `SQ_TEST_DB_PASSWORD` en una terminal dedicada, con los valores propios de esa base. `.env.example` es una referencia, no se carga automáticamente. No copiar sus contraseñas de ejemplo a un entorno real.

```powershell
.\mvnw.cmd -B -ntp -Ppostgres-it verify
```

Ejecuta las pruebas anteriores y tres IT de PostgreSQL: concurrencia, rollback completo ante fallo de outbox y snapshot/propiedad. Sin ese perfil no se ejecutan las IT. Los resultados quedan en `target/surefire-reports` y `target/failsafe-reports`.

No confundir `-DskipTests` con pruebas aprobadas. El 19 de octubre de 2026 el usuario autorizó ejecutarlas: las 22 pruebas sin PostgreSQL pasaron con cero fallos, errores u omisiones. Las tres IT siguen sin ejecutar: no había conexión de pruebas configurada y la revisión automática rechazó preparar el cluster temporal. Ver las evidencias en `docs/FASE-4-IMPLEMENTACION.md`, desde la raíz del repositorio.

## Ejecución de desarrollo por el usuario

1. Preparar una base nueva de simulación, separada de Prisma y de las IT.
2. Establecer `SIMULATION_JDBC_URL`, `SIMULATION_DB_USER` y `SIMULATION_DB_PASSWORD` en la terminal. La URL usa formato JDBC, diferente de DATABASE_URL de Express.
3. Ejecutar el JAR. Flyway aplicará V1 al iniciar: hacerlo solo sobre la base nueva elegida.

```powershell
java -jar target/simulacion-logistica-0.1.0-SNAPSHOT.jar
```

El puerto por defecto es 4010, enlazado únicamente a 127.0.0.1. Comprobar `/health/live` y `/health/ready`: el primero es vivacidad; el segundo comprueba PostgreSQL. El estado de identidad se verifica en cada petición protegida, no mediante readiness. No hay credenciales ni bypass de autenticación de desarrollo.

4. Aplicar personalmente `src/main/resources/db/dev/escenario.sql` a esa misma base después de Flyway. El fixture explícito crea `phase4-fixture`; nunca se aplica automáticamente.
5. Levantar el backend Express de identidad en el puerto 4000 y obtener un token real de un aprendiz. El alta sigue en Express; Java no necesita copiar ese usuario a su base.
6. Enviar el Bearer a las rutas siguientes sobre el puerto 4010. `IDENTITY_ME_URL` permite cambiar el destino fijo de identidad; fuera de loopback exige HTTPS y no sigue redirecciones. No comparte el secreto de firma ni cachea sesiones.

| Método y ruta | Función |
|---|---|
| GET `/api/simulations/scenarios` | Escenarios publicados |
| POST `/api/simulations` | Iniciar con `{scenarioId:"phase4-fixture"}` |
| GET `/api/simulations/{id}` | Consultar partida propia |
| POST `/api/simulations/{id}/decisions` | Registrar `{day:0,quantity:10}`, después días 1 y 2 con cantidad 0 |
| GET `/api/simulations` | Últimas 100 partidas propias |

El fixture debe producir beneficio 6, score 86, vendidos 14 y faltantes 3 al terminar. Son expectativas para comprobar, no resultados medidos de un servidor en esta entrega. No se expone la secuencia futura de demanda en RunDto.

Las respuestas conservan el RunDTO y errores `{message,issues?}`. Se rechazan propiedades extra, fracciones y números enviados como texto en los campos enteros. Los conflictos de día devuelven 409. Timeout/error de identidad devuelve 503 y no permite la operación.

## Persistencia y límites de esta fase

La actualización condicional compara usuario, partida y día. Una única transacción incluye decisiones, resultado final y fila SimulacionFinalizada de outbox; si falla cualquiera, se revierte completa. Java no escribe UserAchievement. Outbox guarda el sobre v1 y su dispatcher puede entregarlo a Express cuando se habilita expresamente.

La fase 5A añade dispatcher, inbox transaccional en Express, resumen interno de simulaciones, composición administrativa y creación/edición de escenarios. Los otros dos servicios Java y su extracción siguen pendientes. El modo Java y el dispatcher están desactivados por defecto; no se ha validado PostgreSQL ni el flujo conjunto real.

El puerto separado es de desarrollo. Tamaño de cuerpo, rate limiting y política pública de entrada se consolidarán en el borde antes de activar tráfico; no se ha certificado uso productivo, rendimiento ni disponibilidad. No se cambia VITE_API_URL para apuntar todo el frontend a este servicio parcial.

## Recuperación

Al no haber cambiado el enrutamiento público, detener el proceso Java mantiene el sistema Express anterior. No borrar ni revertir bases automáticamente. Si comienzan a generarse datos que deban conservarse, revisar conciliación antes de cualquier cambio de propietario.
