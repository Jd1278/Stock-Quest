# AG-05 — Proyecciones de progreso implementadas

21 de octubre de 2026. El usuario validó el archivo del backend anterior y autorizó continuar. AG-05 está implementado y activado en el entorno local; el usuario validó expresamente su cierre el 21 de octubre de 2026. Jenkins, publicación permanente y ciclo operativo siguen pausados.

## Resultado

Personas conserva un informe derivado completo de cada aprendiz inicializado. Aprendizaje publica `ProgresoActualizado` con una versión persistida por usuario. Un inbox y la actualización de la proyección se confirman juntos; duplicados y entregas atrasadas no hacen retroceder el estado. Si se pierde la fila derivada, el último snapshot puede reconstruirla incluso conservando el inbox anterior.

Los informes habituales ya inicializados leen personas sin consultar aprendizaje. Durante una caída de aprendizaje siguen disponibles con el último estado confirmado. Un usuario todavía sin proyección necesita bootstrap HTTP y puede recibir 503 si la fuente está caída: no se inventan valores cero. La autorización de equipo se verifica antes de consultar el informe.

Los hechos de desafío/lección y de simulación recibida provocan la generación de snapshots. La reconciliación periódica también recoge cambios del catálogo. Las versiones de snapshots son independientes de las versiones de hechos individuales; su cobertura se confirma después del 204 del consumidor. Este flujo entrega snapshots completos, no retransmite cada hecho original como un mensaje HTTP independiente. No se implementan aquí otros consumidores del outbox de personas.

Detalles de formato, tiempos, credenciales y endpoints: [contrato de proyecciones](../contracts/progreso-proyecciones-v1.md).

## Componentes y datos

| Servicio | Implementación |
|---|---|
| Aprendizaje, progreso/Application | Puerto y DTO de snapshots |
| Aprendizaje, progreso/Infrastructure | Captura transaccional, outbox, leases, reintentos, cola de reconciliación y endpoints de consulta/replay |
| Personas, capacitacion/domain | Evento v1 e informe validado |
| Personas, capacitacion/Application | Puertos de proyecciones/snapshots y consulta con bootstrap de usuarios aún no inicializados |
| Personas, capacitacion/Infrastructure | Inbox/proyección JDBC, transporte HTTP de snapshots y endpoints internos de recepción/reconstrucción |
| Supervisor local | Token adicional cifrado con DPAPI y configuración explícita del emisor y del lector |

Flyway V2 añadió tablas propias: `learning_progress_snapshots`, `learning_progress_outbox`, `learning_progress_refresh_queue`, `people_progress_inbox` y `people_progress_projections`. No se modificaron ni borraron tablas de negocio existentes. No hay consultas SQL entre servicios ni FK entre sus bases. Las conexiones de verificación a varias bases pertenecen a herramientas de prueba, no a los servicios.

El modo activo es `reportsMode=projection`, con `progressEventsEnabled=true`, consultable mediante `node scripts/local-java.cjs status`. El gateway continúa independiente y sin Prisma. Las preparaciones locales nuevas incluyen la configuración de proyecciones; las configuraciones antiguas no se cambian silenciosamente al llamar start.

## Activación y comprobaciones

1. Se crearon backups custom de las bases de personas/aprendizaje y se comprobó que `pg_restore --list` podía leerlos. No se ensayó una restauración completa: ese pendiente operativo continúa abierto.
2. Se conservaron los JAR y la configuración cifrada anteriores. El primer empaquetado encontró el bloqueo de archivos de Windows por los JAR abiertos; las pruebas pasaron por separado y el empaquetado terminó correctamente después de detener el supervisor.
3. Se iniciaron los JAR nuevos en modo de informes HTTP y se aplicaron las migraciones aditivas. Se inicializaron doce aprendices y se comparó cada proyección con su snapshot fuente.
4. Se activó el modo projection y se verificaron nueve respuestas de línea base sin cambios.
5. Se ejecutaron las pruebas reales de fallo, reinicio, replay y reconstrucción. El entorno quedó activo con los cinco procesos disponibles; los fixtures de prueba se limpiaron por sus identificadores exactos.

| Prueba ejecutada | Resultado |
|---|---|
| JUnit personas | 53 casos unitarios/HTTP/arquitectura aprobados, incluyendo las nuevas pruebas de fuente e informes proyectados |
| PostgreSQL personas | 15 IT aprobadas: nueve existentes y seis de proyección, concurrencia, conflictos, rollback y replay |
| JUnit aprendizaje | 29 casos aprobados; recepción duplicada de simulación genera un solo hecho nuevo |
| PostgreSQL aprendizaje | 23 IT aprobadas: quince existentes y ocho de snapshots/dispatcher, incluida reconciliación de catálogo sin hechos nuevos |
| Node | 87 pruebas aprobadas: 64 gateway y 23 frontend |
| Integración específica AG-05 | Ocho grupos reales aprobados |
| Integración general del gateway | Once grupos reales aprobados después de activar las proyecciones |
| Lint, aislamiento y archivo legacy | Aprobados; cero Prisma/imports legacy en el gateway |

Son **120 casos Java y 87 Node ejecutados en este bloque**, contabilizados una vez por caso aunque algunos se repitieron en ejecuciones focalizadas. No se suman las 232 pruebas históricas ni las 106 Java de otra entrega. Simulación Java no cambió; su suite Maven no se reejecutó aquí, aunque se usó el servicio real en la cadena completa. Los empaquetados finales usaron skipTests porque las pruebas ya se habían ejecutado por separado; no se presentan como otra ejecución de pruebas.

La integración específica comprobó desafíos/lección → informe; duplicados concurrentes, versiones atrasadas y contenido conflictivo; credenciales y permisos; lectura con aprendizaje detenido; simulación → aprendizaje → personas; reentrega persistida tras caída/reinicio; reconstrucción de una fila derivada conservando inbox; y protección de endpoints internos. No se hizo un recorrido visual manual completo de todos los roles en este bloque.

Evidencias sanitizadas: [resultados](verificaciones/ag05-20261021/RESULTADOS.md), [resumen](verificaciones/ag05-20261021/evidencia.json) y [integración HTTP](verificaciones/ag05-20261021/integration.json).

## Recuperación

Backups y artefactos previos se guardan bajo `.stockquest-local/ag05-20261021/before`, excluidos de Git. Los dumps contienen datos del entorno y no deben adjuntarse a documentación o despliegues. Las evidencias compartibles solo incluyen resultados, hashes y contadores.

Para recuperar temporalmente la consulta HTTP manteniendo los escritores Java y las migraciones V2:

```powershell
node scripts/local-java.cjs stop
node -e "const h=require('./scripts/local-java.cjs'),c=h.load();c.reportsMode='http';c.progressEnabled=false;h.save(c);"
$env:SPRING_PROFILES_ACTIVE = 'observabilidad'
node scripts/local-java.cjs start
```

Después de corregir la causa se pueden reactivar las proyecciones, reconstruir snapshots y reintentar entregas. No borrar inbox, versiones, snapshots ni outboxes para reiniciar contadores. No restaurar un JAR anterior sin verificar su compatibilidad con Flyway V2. No volver a escritores legacy ni restaurar un dump sobre datos más recientes automáticamente.

## Límites y pendientes globales

La consistencia es eventual. El intervalo de reconciliación no certifica un SLA bajo carga; los fallos permanentes necesitan corrección y replay autorizado. Se valida reconstrucción de proyecciones a partir del último snapshot, no recuperación automática de una base fuente completa desde un backup antiguo.

El bloque técnico de AG-05 fue aceptado expresamente por el usuario el 21 de octubre de 2026. Con esta aceptación se cierra la migración de arquitectura en el entorno local. Continúan abiertos los vídeos pendientes, controles RNF, consolidación/versionado y operación/publicación permanente. El túnel temporal anterior y la API pública Vercel se registraron como no disponibles en la entrega anterior; no se republicaron en esta tarea. No confundir cierre técnico de arquitectura local con aceptación de producción.
