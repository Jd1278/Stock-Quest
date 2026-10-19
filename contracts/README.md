# Contratos propuestos para la migración

Estado: diseño aprobado en fase 3; simulación 5A aprobada por el usuario; aprendizaje 5B probado en PostgreSQL y recorrido aislado; el usuario autorizó 5C conservando pendientes globales. Los tres servicios Java están implementados y se verifican en puertos/bases aislados. La activación local y aceptación global siguen pendientes. Los archivos de contrato no prueban por sí mismos que un servicio esté ejecutándose.

| Archivo | Alcance |
|---|---|
| `openapi-compatibilidad.json` | OpenAPI 3.1; 35 operaciones públicas en 32 paths y 43 esquemas, derivadas del código actual |
| `propiedad-datos.json` | Propietario objetivo de los 14 modelos Prisma actuales, incluido el inbox añadido en fase 5A |
| `eventos-v1.schema.json` | JSON Schema 2020-12; siete tipos de eventos confirmados, versión 1 |

Verificación estructural reproducible desde la raíz:

```powershell
node contracts/validar-inventario.cjs
```

El script solo lee archivos: compara rutas y modelos con el código existente, verifica propietarios, IDs de operación, parámetros, referencias internas y cobertura RF. Su parser está adaptado al router actual y deberá revisarse si cambia la forma de declarar rutas. No verifica permisos en ejecución ni reemplaza un validador semántico OpenAPI/JSON Schema.

## Reglas públicas

El contrato conserva la base `/api`, fechas ISO 8601, IDs opacos de texto y nombres/códigos actuales. `x-owner` asigna responsabilidad objetivo, no disponibilidad actual; `x-roles` conserva restricciones del router. RF04 es navegación frontend y no requiere un endpoint nuevo. Las extensiones no sustituyen autorización ni validación de negocio.

Los errores conservan `{message, issues?}`. Estados actuales: 400 validación/prerrequisito, 401 sesión/credenciales, 403 rol/desbloqueo, 404 inexistente/ajeno, 409 conflicto, 413 tamaño, 429 límite y 500 interno. Se propone 503 para dependencias inaccesibles. La respuesta de error nunca expone SQL, stack, claves ni tokens.

OpenAPI refleja formas de respuestas y restricciones principales. Hay reglas que requieren código: validación en bytes de contraseña, correo normalizado, unicidad, correctIndex dentro de opciones, precio de venta >= coste, propiedad y secuencia de aprendizaje. `default` describe errores sin afirmar que cada operación produzca todos los estados. La corrección semántica se verificará con pruebas de contrato en cada extracción.

Solo las respuestas administrativas pueden contener correctIndex/explanation de desafíos. Las lecciones bloqueadas devuelven body vacío y arrays vacíos. Los DTO administrativos no se reutilizan como DTO del aprendiz. Los contratos de respuesta permiten campos adicionales cuando el código actual devuelve filas o relaciones Prisma; el port debe conservar esos campos de compatibilidad y no exponer otros datos sensibles. No usar entidad JDBC como respuesta HTTP.

## Consultas internas propuestas

En fase 5A se implementaron el resumen de simulación y la lista administrativa de escenarios. En 5B se implementaron y probaron contenido administrativo, informe individual y consulta por lote de aprendizaje. Personas Java consume los lotes después de verificar pertenencia al líder. Los snapshots siguen pendientes de la integración de proyecciones registrada en AG-05. No forman parte del contrato público. Autenticación de servicio independiente del Bearer del usuario, acceso restringido por destino y credenciales por servicio; no confiar en cabeceras públicas. Nunca publicar `/internal` mediante el enrutamiento del frontend.

### Simulación — resumen de un usuario

`GET /internal/users/{userId}/simulation-summary`

Consumidor permitido: aprendizaje, inicialmente su adaptador Express. El consumidor valida antes el usuario o el permiso para consultarlo; el endpoint solo acepta identidad de ese servicio. No requiere lookup de personas para resolver el resumen, evitando recursión con `/progress`.

```json
{
  "userId": "learner-1",
  "completedCount": 1,
  "scoreTotal": 86,
  "hasPassingRun": true,
  "firstCompletedAt": "2026-10-18T15:00:00Z"
}
```

Cuenta TODOS los resultados confirmados, no solo los 100 del historial público. Sin resultados: 0, 0, false, null. Los dos enteros son >=0 y scoreTotal <= completedCount*100. La respuesta se calcula sobre una instantánea coherente de resultados ya confirmados. No incluye timeline, datos personales ni escenarios futuros.

Al calcular ProgressDTO: XP = 50 por lección + mejor score de cada desafío / 5 + scoreTotal; simulaciones = completedCount; aprobación = ruta completa y hasPassingRun. El logro inicial de simulación se obtiene de firstCompletedAt si aún no se aplicó su evento, con deduplicación por key. El evento y la consulta no acumulan dos veces los puntos.

### Simulación — escenarios administrativos

`GET /internal/admin/scenarios`

Consumidor permitido: adaptador compositor del panel del gestor. Además de identidad de servicio, propagar Bearer del gestor para validación mediante IdentidadActual. Devuelve ScenarioRow[], incluyendo publicados y no publicados. No sustituir por `/api/simulations/scenarios`, que oculta campos y escenarios.

### Aprendizaje — contenido administrativo

`GET /internal/admin/modules`

Consumidor permitido: adaptador compositor del panel del gestor, con identidad de servicio y Bearer del gestor. Devuelve AdminModule[], incluyendo material no publicado y respuestas de desafíos. Se valida rol GESTOR_PEDAGOGICO. Permite componer `/api/admin` sin convertir aprendizaje en propietario de escenarios.

### Aprendizaje — informe individual y lote

`GET /internal/users/{userId}/learning-report`

Respuesta: `{userId, progress: ProgressDTO, activities: Activity[]}`; actividades ordenadas por createdAt descendente, máximo 100. Personas verifica primero que el aprendiz pertenece al líder solicitante. El endpoint acepta solo credenciales de personas, no un token de aprendiz que cambie el path. El caso individual y el de equipo deben reutilizar la misma política de permisos.

Para equipo: `POST /internal/learning-reports/query`, body `{userIds: string[]}` con 1–100 IDs únicos autorizados por personas; devuelve `{reports: LearningReport[]}`. Personas divide equipos mayores en lotes acotados. Un fallo de dependencia no se convierte en reporte vacío ni promedio cero; la composición devuelve 503. Inicialmente se puede implementar el individual para compatibilidad y entregar el lote antes de validar rendimiento de equipos.

### Snapshots de proyección

`GET /internal/progress-snapshots?after={cursor}&limit={1..100}`

Consumidor permitido: seguimiento de personas. Respuesta: `{items:[{userId, aggregateVersion, progress}], nextCursor:string|null}`. Cursor opaco y orden estable; cada snapshot lleva versión del agregado de progreso. Capturar un watermark antes del barrido y reproducir eventos desde ese watermark para no perder cambios concurrentes. No se requiere para activar el primer corte de decisiones; sí antes de depender de proyecciones reconstruibles.

## Eventos v1

Sobre común: eventId UUID, type, schemaVersion=1, producer, occurredAt UTC, aggregateId, aggregateVersion >=1, correlationId y data. Nunca contiene password, hash, correo, documento ni Bearer. Los userId son identificadores personales indirectos y requieren control de acceso y retención.

| Tipo | Productor | Agregado / consumidores previstos |
|---|---|---|
| SimulacionFinalizada | Simulación | Partida / aprendizaje concede logro; score no se suma si ya está en resumen |
| LeccionCompletada | Aprendizaje | Progreso del usuario / seguimiento y auditoría |
| DesafioRespondido | Aprendizaje | Progreso del usuario / seguimiento y auditoría |
| ProgresoActualizado | Aprendizaje | Progreso del usuario / proyección de seguimiento |
| MiembroAsignado | Personas | Grupo / proyecciones de pertenencia |
| MiembroRetirado | Personas | Grupo / proyecciones de pertenencia |
| UsuarioDesactivado | Personas | Usuario / limpieza de proyecciones, nunca sustituto de revocación vigente |

Tipos de un mismo agregado comparten un contador transaccional. Los contadores no son globales entre productores. Una proyección de snapshot solo acepta versiones mayores; una bitácora puede conservar hechos antiguos sin revertir estado. El inbox registra eventId y aplicación del cambio en una transacción. No se exige que un consumidor observe todos los números consecutivos si filtra tipos.

Transporte inicial propuesto para desarrollo: dispatcher HTTP de outbox hacia `/internal/events` de cada consumidor autorizado, con credencial de productor y allowlist de tipos. Un evento se confirma al recibir 2xx después de confirmar inbox/cambio. Los reintentos conservan eventId. Se guardan entregas por eventId y consumidor para no perder un destino al completar otro.

Backoff propuesto: 1, 5, 30, 120 y 600 segundos, luego hasta 10 intentos totales con espera de 600 segundos; errores permanentes de esquema/autorización van a revisión. El agotamiento queda en tabla de errores con replay manual y métricas. Credenciales/URL no van en el evento. No activar tareas periódicas antes de configurar destinos y revisar fallos. Puede sustituirse el adaptador por SNS/SQS en la etapa AWS sin cambiar puertos ni payloads.

Durante 5A el consumidor temporal de SimulacionFinalizada vive en aprendizaje Express y solo escribe su propio UserAchievement. No se permite que simulación Java escriba esa tabla. Durante 5B LEARNING_BACKEND=java bloquea el escritor legacy y el receptor Express reenvía a Java, confirmando solo tras ACK del inbox Java. Alternativamente el productor puede dirigirse al receptor Java privado, con la misma credencial de eventos, después de revisar la activación. No deben estar activos ambos escritores simultáneamente. El outbox de aprendizaje almacena los hechos LeccionCompletada y DesafioRespondido; dispatcher a personas, ProgresoActualizado y snapshots se integrarán antes de depender de proyecciones en 5C.

## Compatibilidad y cambios futuros

Se agregan campos opcionales de evento sin romper v1; cambios de significado, tipos o campos obligatorios crean versión nueva y periodo de coexistencia. No publicar eventos desde una transacción fallida. No borrar outbox entregado sin política de retención que permita investigar y reconstruir.

La validación de JSON, referencias y cobertura de inventario de fase 3 es estructural. Las pruebas HTTP, autorización, schema validator completo, fallos de transporte y replay corresponden a las siguientes fases y serán ejecutadas por el usuario.
