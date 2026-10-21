# ProgresoActualizado y proyecciones de personas

Implementado y activado localmente el 21 de octubre de 2026. Contrato independiente del modelo de tablas de aprendizaje. El formato se define en `eventos-v1.schema.json`, tipo `ProgresoActualizado`, versión 1; se completó el diseño que aún no tenía consumidor activo.

## Mensaje y propiedad

El mensaje contiene `eventId`, `type`, `schemaVersion`, `producer`, `occurredAt`, `aggregateId`, `aggregateVersion`, `correlationId` y `data`. `data` es el informe completo `{userId, progress, activities}`: no incluye correo, documento, contraseña, respuestas correctas ni perfil personal. Las actividades conservan únicamente los campos del informe público permitido.

`aggregateId == data.userId`. El productor es `aprendizaje-evaluacion`. La versión es la secuencia persistida del snapshot de progreso del usuario, independiente de la secuencia de hechos individuales `learning_versions`. Una versión y su eventId son inmutables. Si el contenido no cambia, se devuelve el mismo evento; si cambia, se crea otro con una versión superior.

Los hechos de desafío/lección y de simulación recibida alimentan el generador de snapshots. Su `learning_outbox.status=DELIVERED` significa que un snapshot confirmado por personas cubre esa versión del hecho. No significa que cada hecho individual se haya retransmitido como un mensaje HTTP separado: este consumidor recibe el estado completo `ProgresoActualizado`. El registro original se conserva para auditoría. Los otros tipos del inventario de siete eventos no se declaran todos desplegados por esta entrega.

## Endpoints internos

Todos requieren `X-StockQuest-Service-Token`; no están registrados en el gateway público.

| Propietario y ruta POST | Entrada | Resultado |
|---|---|---|
| Personas `/internal/progress-events` | Evento completo v1 | 204; 400 inválido, 401 sin credencial, 404 usuario inexistente, 409 identidad/versión reutilizada con otro contenido |
| Aprendizaje `/internal/progress-snapshots/query` | `{userIds:[...]}`, 1–5 únicos | `{snapshots:[...]}`; captura consistente y persistida del estado actual |
| Aprendizaje `/internal/progress-snapshots/replay` | Igual | Devuelve snapshots y habilita la reentrega de la versión actual; no roba una lease vigente |
| Personas `/internal/progress-projections/rebuild` | `{userIds:[...]}`, 1–100 usuarios propios existentes | 204 después de recuperar y aplicar snapshots; solicitudes a aprendizaje en grupos de cinco |

## Entrega y lectura

El dispatcher se activa con `LEARNING_PROGRESS_ENABLED=true`, destino `LEARNING_PROGRESS_TARGET` y `LEARNING_PROGRESS_TOKEN` coincidente con `PEOPLE_SERVICE_TOKEN`. Solo permite HTTPS o HTTP loopback, la ruta esperada y ninguna redirección. El token no se entrega al gateway ni al frontend. `PEOPLE_REPORTS_MODE=projection` activa el lector local; `http` conserva una vía de recuperación compatible, sin volver al backend archivado.

El emisor genera cambios a partir de hechos y reconcilia snapshots conocidos cada 30 segundos, también cuando cambia el catálogo. Son intervalos de planificación, no una garantía de latencia durante fallos o backlog. La cola de refresco conserva fallos y los difiere para no bloquear otros usuarios. Cada lote de entrega tiene hasta cinco mensajes, lease de 60 segundos y confirmación condicionada a su lease token. Solo un 204 confirma. Los fallos transitorios se reintentan con esperas 1/5/30/120/600 segundos; ciertos 4xx o diez intentos llevan a FAILED y requieren replay explícito después de corregir la causa.

Personas confirma inbox y proyección en una transacción por usuario. Duplicados idénticos no duplican datos; una versión atrasada no sustituye una más reciente, incluso al reconstruir una fila que se perdió conservando el inbox. Se permite saltar versiones porque el mensaje contiene el estado completo. Cambios reales del catálogo pueden modificar porcentajes o totales; la protección se refiere al orden de versiones, no a impedir correcciones legítimas del propietario.

Los informes existentes leen solamente la base de personas y continúan disponibles durante una caída de aprendizaje, mostrando el último estado confirmado. Un usuario aún sin proyección necesita inicialización HTTP; si la fuente está caída se responde 503, sin inventar progreso cero. La autorización de equipo se verifica antes de esa consulta. La reconstrucción de varios usuarios no es una transacción distribuida: cada usuario es idempotente y una solicitud parcialmente completada puede repetirse.

## Recuperación

Reenviar el último snapshot reconstruye una proyección perdida aunque el inbox aún registre ese evento. Conservar los contadores/versiones, snapshots y outboxes en los respaldos de aprendizaje: no reiniciar su secuencia ni borrar esos metadatos durante una restauración. La recuperación de una fuente completa desde un backup anterior requiere conciliación de versiones antes de emitir nuevos mensajes.

No ejecutar DROP/TRUNCATE ni borrar historial para provocar el replay. Las pruebas de recuperación solo eliminan una fila derivada de un usuario de prueba recién creado. Véanse [implementación y resultados](../docs/AG05-PROYECCIONES-20261021.md).
