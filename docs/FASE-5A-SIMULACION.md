# Fase 5A — Extracción de simulación

## Estado al 19 de octubre de 2026

El usuario autorizó avanzar inicialmente aplazando las pruebas PostgreSQL. El código de conexión entre Express y Java está implementado. Posteriormente el usuario ejecutó y compartió un registro exitoso de las 41 pruebas Java, incluidas las cinco IT PostgreSQL. Flyway aplicó V1/V2 en su base exclusiva de pruebas. No se ha activado el tráfico Java en un entorno real. El usuario también confirmó 38 pruebas del backend aprobadas, incluidas las ocho integraciones PostgreSQL. El recorrido local de simulación por API, eventos, controles de acceso, recuperación, administración e informe de líder fue verificado por el usuario. También confirmó acceso desde el frontend, perfil (86 XP, una simulación y logro) y los dos escenarios en catálogo. El usuario aprobó explícitamente el cierre de 5A y el inicio de 5B; su implementación se documenta por separado. La fase 5 completa aún incluye las extracciones 5B y 5C.

## Implementación

### Recorrido local ejecutado por el usuario

En las bases exclusivas `stockquest_test_simulation` y `stockquest_test_backend`, el usuario inició Express (4000) en modo Java y el servicio Java (4010) con eventos habilitados; ambos endpoints de salud respondieron `ok`. Registró e inició sesión con un aprendiz, consultó el catálogo a través de Express y completó la partida `4077f20a-725d-4ce4-a8db-9eb1f4c44984` del escenario `phase4-fixture`, con pedidos [6, 0, 0]. Resultado confirmado: día 3, stock 2, ventas 14, faltantes 3, beneficio 18 y puntuación 86. Una nueva consulta recuperó el mismo resultado; progreso informó una simulación, 86 XP y el logro esperado. El usuario confirmó entrega DELIVERED en outbox/entrega Java y los registros de inbox/logro en la base backend, tras corregir la selección de base en pgAdmin. Las salidas HTTP se compartieron en el chat; la comprobación SQL se confirmó verbalmente. El usuario comprobó además: decisión adicional del propietario sobre partida finalizada devuelve 409 sin alterar el resultado; otro aprendiz recibe 404 tanto al consultar como al decidir sobre esa partida, conservándose el resultado; detener Java provoca 503 en el catálogo de Express y, tras reiniciarlo, readiness responde ok y se recupera el mismo resultado persistido. Administración validada por el usuario: segunda cuenta de pruebas promovida a GESTOR_PEDAGOGICO, creación del escenario 68d9b8d9-9e24-4311-8aaa-fd58d69732c1 sin publicar, visible en panel del gestor y oculto al aprendiz; publicación mediante PUT y aparición única en catálogo del aprendiz. La descripción con tildes se recuperó correctamente tras enviar JSON como bytes UTF-8 con charset explícito desde PowerShell. El usuario validó además el informe individual del líder: cuenta cmvfjel1k0002qk3gzm4ahgom con rol LIDER vinculada al aprendiz de prueba; GET /api/reports/cmvfhyefx0000qk3gilzk4fsw devolvió el aprendiz con una simulación, 86 XP y PRIMERA_SIMULACION. El usuario confirmó la comprobación visual del frontend: HTTP 200 en Vite, inicio de sesión, perfil con 86 XP, una simulación y logro, y catálogo con los dos escenarios. Tras perder la terminal se restableció únicamente la contraseña de la cuenta de pruebas y se invalidaron sus sesiones previas; el acceso directo y el acceso por formulario funcionaron después de volver a copiar las credenciales. No se almacenan contraseñas ni hashes en esta documentación. El recorrido de decisiones se ejecutó por API: no se declara probado el juego completo mediante clics ni la interfaz de gestor/líder; la regresión integral de interfaz corresponde a las fases de integración y aceptación. El cierre de 5A fue aprobado explícitamente por el usuario.

- Express elige un solo propietario con `SIMULATION_BACKEND=legacy|java`, por defecto legacy.
- En modo java se reenvían las cinco operaciones públicas de simulación y la creación/edición de escenarios a Java, conservando Bearer, cuerpo y códigos de respuesta.
- No hay fallback automático a las tablas antiguas cuando Java falla: se devuelve 503.
- `/api/admin` compone módulos de Express y escenarios administrativos Java, incluidos no publicados. Un fallo no devuelve un panel parcial con 200.
- Progreso e informes leen un resumen de TODOS los resultados Java. No se limita a las 100 partidas del historial ni se duplican XP/logros con los eventos.
- Los endpoints internos Java requieren `SIMULATION_SERVICE_TOKEN`; el administrativo también exige sesión de gestor.
- Outbox Java incorpora entrega HTTP con lease, reintentos, estado por consumidor y retención de fallos.
- Express recibe `SimulacionFinalizada` en `/internal/events` con `SIMULATION_EVENT_TOKEN` y aplica inbox/logro en una transacción. Los duplicados no conceden el logro dos veces.
- El seed y los servicios legacy evitan escribir simulación cuando el propietario configurado es Java.

## Evidencias disponibles

| Verificación | Resultado |
|---|---|
| Compilación backend y lint | Aprobados |
| Jest backend, con RUN_DB_TESTS=0 | 30 aprobadas, 0 fallos, 8 omitidas por requerir PostgreSQL |
| JUnit Java, XML Surefire y registro posterior aportado por usuario | 36 aprobadas, 0 fallos, 0 errores, 0 omitidas |
| Java PostgreSQL, registro aportado por usuario | 5 aprobadas, 0 fallos, 0 errores, 0 omitidas |
| Compilación y empaquetado Java durante la entrega | Aprobados; fuentes de integración también compilan |
| Inventario de contratos | 35 operaciones, 14 modelos asignados, 107 referencias resueltas |
| Migraciones Java en base de pruebas | V1/V2 aplicadas correctamente por Flyway en ejecución del usuario |
| Jest backend con PostgreSQL, registro posterior del usuario | 38 aprobadas, 0 fallos, 0 omitidas; siete suites aprobadas |
| Recorrido local de aprendiz Express–Java | Aprobado por ejecución del usuario: cierre, progreso y evento |
| Controles y recuperación locales | 409 al decidir tras cierre; 404 lectura/escritura ajenas; 503 con Java detenido y recuperación del resultado |
| Administración Express–Java | Creación, borrador y publicación aprobados por ejecución del usuario; texto UTF-8 conservado |
| Informe individual de líder | Aprobado por ejecución del usuario: una simulación, 86 XP y logro del aprendiz vinculado |
| Frontend: acceso, perfil y catálogo | Confirmados visualmente por el usuario; no incluye partida completa mediante clics |

Las pruebas sin BD usan dobles de persistencia, MockMvc y servidores HTTP de prueba donde corresponde. Las cinco IT Java posteriores sí verificaron PostgreSQL real: concurrencia, rollback, snapshot/propiedad, resumen de más de 100 partidas y entrega de outbox con ACK HTTP. No acreditan el arranque conjunto de Express y Java. El backend añade dos pruebas de inbox además de las seis integraciones legacy existentes; las ocho se ejecutaron y aprobaron en el registro posterior del usuario. No se confunden omisiones con aprobaciones.

### Ejecución del usuario confirmada el 19 de octubre de 2026

Fuente: registro pegado por el usuario, finalizado a las 10:54:56 America/Bogota. Comando `mvnw.cmd -B -ntp -Ppostgres-it verify`; BUILD SUCCESS, duración 38,570 segundos. Surefire informó 36 pruebas y Failsafe cinco, todas sin fallos, errores ni omisiones. PostgreSQL 16.13, base exclusiva `stockquest_test_simulation`; Flyway validó y aplicó las dos migraciones desde un esquema vacío, hasta v2. Este resultado fue ejecutado por el usuario, no reproducido por el asistente. Las advertencias de Mockito/Byte Buddy no impidieron la ejecución.

## Activación posterior

### Primera ejecución PostgreSQL del backend por el usuario

Prisma Client se generó y las migraciones `202609150001_postgresql` y `202610190001_simulation_event_inbox` se aplicaron correctamente. La ejecución posterior de Jest informó 36 pruebas aprobadas y dos fallidas, sin omisiones. Ambas fallaron durante la preparación del usuario de prueba del inbox: se asignaba un UUID de 36 caracteres a `User.document`, cuyo límite es `VARCHAR(30)`. No llegaron a comprobar el comportamiento de eventos. Se corrigió exclusivamente el dato de prueba para usar 30 caracteres hexadecimales del identificador aleatorio; el esquema y las migraciones no cambian. El usuario repitió `npm.cmd test -w @stock-quest/api` tras la corrección: siete suites aprobadas y 38 pruebas aprobadas, sin fallos ni omisiones, en 13,456 segundos. Incluye las pruebas de duplicados concurrentes y rollback del inbox con PostgreSQL. Fuente: archivo adjunto `d65736d1-ae3b-4527-8b49-0a85f0f82f86/Texto pegado.txt`, última ejecución del registro. La ejecución fue realizada por el usuario; el asistente revisó su salida.

Antes de cambiar el propietario:

1. Configurar una base nueva de simulación Java y la base del backend restante.
2. Aplicar V1/V2 de Flyway en la base Java y la nueva migración Prisma `202610190001_simulation_event_inbox` en el backend. No se modificó la migración inicial existente.
3. Configurar el mismo `SIMULATION_SERVICE_TOKEN` en Express y Java, y el mismo `SIMULATION_EVENT_TOKEN` en productor/consumidor. Son dos secretos distintos de al menos 32 caracteres, sin valores universales.
4. Verificar `IDENTITY_ME_URL` de Java hacia `/api/auth/me` de Express y `SIMULATION_SERVICE_URL` de Express hacia Java. Se permite HTTP solo en loopback y HTTPS fuera de él.
5. Pausar las escrituras de simulación, elegir `SIMULATION_BACKEND=java` en Express y habilitar `SIMULATION_EVENTS_ENABLED=true` en Java cuando el consumidor y su migración estén listos.
6. Comprobar sesiones, escenarios no publicados, inicio/decisiones/cierre, progreso inmediato, informe de líder y entrega del evento. No cambiar VITE_API_URL para apuntar todo el frontend al servicio parcial.

Los archivos `.env.example` documentan variables y no se cargan automáticamente por Spring. Las rutas `/internal` deben quedar en red privada o bloqueadas en la entrada pública; las credenciales de servicio complementan ese aislamiento. No se configuró una publicación ni firewall en esta entrega.

## Operación de eventos y recuperación

Dispatcher deshabilitado por defecto. El consumidor actual es `legacy-learning`. Cada entrega tiene lease de 60 segundos, token de lease, hasta 10 intentos y backoff de 1, 5, 30, 120 y 600 segundos, manteniendo 600 en los siguientes intentos. 400/401/403/409/422 pasan a FAILED para revisión; otros fallos se reintentan. Los eventos permanecen almacenados.

Para replay tras corregir la causa, el operador deberá revisar el eventId, restablecer a PENDING su entrega del consumidor y el evento padre, poner attempts=0, next_attempt_at a la fecha actual y limpiar lease/error. No hay replay automático ni endpoint público de administración de cola. No borrar inbox ni cambiar eventId para reintentar.

Antes de aceptar escrituras Java, mantener legacy conserva el recorrido anterior. Después de generar datos Java, volver a legacy requiere conciliación o descarte de datos de desarrollo expresamente autorizado; no basta cambiar una variable. No se eliminaron tablas antiguas ni bases existentes.

## Siguiente entrega

El usuario aprobó expresamente el cierre de 5A y el inicio de 5B. La implementación y comprobaciones pendientes del segundo servicio se registran en `FASE-5B-APRENDIZAJE.md`. Esta aprobación no declara finalizada la fase 5 completa.

Aprobados el cierre de 5A y el inicio de 5B: aprendizaje y evaluación Java. Personas y capacitación corresponde a 5C. Las 79 pruebas automatizadas (41 Java y 38 backend) y las comprobaciones locales descritas están aprobadas por sus resultados; las comprobaciones manuales no se cuentan como pruebas automatizadas adicionales. La regresión integral de interfaz y la aceptación global se mantienen en fases 6 y 7. No se declara completada la fase 5 ni desplegado el sistema en producción.
