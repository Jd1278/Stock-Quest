# Pendientes de desarrollo

Fecha: 21 de octubre de 2026. La versión funcional local y la demostración temporal fueron aceptadas. Esta lista distingue funcionalidades incompletas, evolución arquitectónica y preparación de entrega. Incluye las actualizaciones implementadas durante el cierre de migración; cada estado identifica su aceptación y los pendientes restantes.

## Funcionalidad y datos

### DEV-01 — Completar los vídeos del material teórico, RF11

**Estado:** parcial, aplazamiento aceptado por el usuario. El reproductor/soporte de IDs YouTube existe; faltan los vídeos propios suministrados. No hace falta volver a desarrollar un reproductor por este pendiente.

**Trabajo:** recibir los IDs/enlaces definitivos y su asociación a lecciones, cargarlos por la gestión del propietario de aprendizaje y mantener coherente el contenido compartido cuando corresponda. No inventar IDs ni reemplazar fuentes sin autorización.

**Componentes:** `content/stockquest.json`, gestión de contenido de aprendizaje, persistencia de vídeos y vista de lección. El código solo requiere cambios si la validación encuentra un defecto o una necesidad acordada.

**Cierre observable:** las lecciones acordadas muestran el material correcto; los vídeos reproducen, se conservan tras recarga y respetan permisos/visibilidad. Hasta entonces RF11 permanece parcial. Este pendiente depende de material del propietario, no solamente de programación.

### DEV-02 — Resolver la protección pendiente de datos personales, RNF04

**Estado:** BCrypt, JWT, roles, revocación y secretos locales DPAPI ya están implementados. Correo, documento y teléfono se almacenan como columnas normales, sin cifrado de aplicación acreditado. Tampoco se certificó cifrado de almacenamiento/backups.

**Trabajo:** clasificar campos y amenazas, acordar qué controles exige el requisito y diseñar la protección. Si se requiere cifrado en la aplicación: definir administración/rotación de claves, lectura/escritura, migraciones, recuperación y tratamiento de búsquedas/unicidad. Una opción de infraestructura no debe presentarse como cifrado de aplicación, ni todo campo debe cifrarse sin analizar su uso.

**Componentes potenciales:** adaptadores de personas, migraciones y configuración de secretos; las reglas de dominio no deben depender de una librería criptográfica de infraestructura.

**Cierre observable:** decisión de diseño trazada a RNF04, controles acordados implementados, migración compatible y comprobaciones de no exposición/recuperación. La parte de almacenamiento y backups corresponde a operación; una prueba por sí sola no implementa un control faltante.

## Evolución arquitectónica y cierre

### DEV-03 — Proyecciones de progreso de personas, AG-05

**Estado:** implementado y activado el 21 de octubre de 2026. Resultado validado expresamente por el usuario el 21 de octubre de 2026; DEV-03 cerrado en el alcance técnico local. Se acreditan snapshots completos, versiones, outbox con leases/reintentos, inbox transaccional y reconstrucción por replay. Los informes inicializados leen la base de personas y funcionan con aprendizaje caído.

**Verificación:** 120 pruebas Java de personas/aprendizaje (82 unitarias y 38 IT PostgreSQL), 87 Node y ocho grupos HTTP específicos; doce proyecciones inicializadas y nueve respuestas de línea base sin cambios. Las pruebas repetidas no se suman como casos únicos. Simulación Java no cambió y su suite no se reejecutó en este bloque.

**Alcance:** los hechos de aprendizaje se cubren mediante ProgresoActualizado, no mediante la retransmisión HTTP independiente de cada hecho original. La inicialización/reconstrucción usa HTTP; la lectura habitual ya inicializada usa la proyección. El modo http se conserva como recuperación explícita, sin regresar a legacy. Los demás consumidores de eventos de personas no se declaran implementados.

**Evidencias y límites:** [AG05-PROYECCIONES-20261021.md](AG05-PROYECCIONES-20261021.md) y [contrato](../contracts/progreso-proyecciones-v1.md). La consistencia es eventual; no se promete información nueva durante una caída ni un tiempo máximo bajo carga/fallos.

### DEV-04 — Separar el gateway de Prisma y de las ramas legacy

**Estado:** implementado, activado y verificado el 21 de octubre en `gateway/`; 64 pruebas del borde, 23 de frontend, aislamiento sin imports SQL y flujos Java reales aprobados. Backend anterior archivado en `legacy/backend`, fuera del workspace, con 42 checksums verificados. Validación de activación/archivo recibida expresamente del usuario antes de iniciar AG-05; ver [evidencias](RETIRADA-LEGACY-20261021.md). El gateway Express sigue siendo necesario; arquitectura hexagonal y tres microservicios no obligan a convertirlo a Java. Véase [resultado y recuperación](MIGRACION-GATEWAY-20261021.md). El trabajo previsto debajo se conserva como criterio de cierre, no como descripción de algo aún sin comenzar.

**Trabajo:** desacoplar errores y tipos compartidos de repositorios Prisma, separar composición/rutas activas de implementaciones de negocio antiguas y construir un gateway que no requiera conexión ni modelos SQL legacy. Después se podrá proponer la retirada por capacidad.

**Componentes vigentes:** `gateway/src`, `scripts/local-java.cjs`, workspaces/lockfile y plantillas del borde. Fuentes anteriores conservadas en `legacy/backend`; ver el inventario del plan de retirada.

**Cierre observable:** build y contratos, autenticación, permisos, aprendizaje, simulación, eventos y reportes pasan con los tres servicios Java y sin imports/requisitos de Prisma en la entrada activa. El código anterior ya fue retirado de la ejecución y archivado, sin borrar bases. La eliminación definitiva de archivos o bases requiere otras puertas.

## Consolidación de la entrega

### DEV-05 — Registrar una versión reproducible de lo implementado

**Estado:** consolidación en la etiqueta local `migracion-local-2026.10.21`, con fuentes, contratos y evidencias. Los JAR mantienen `0.1.0-SNAPSHOT`; no se presenta esta etiqueta como una release de producción. Véase [registro de versión](VERSION-MIGRACION-20261021.md).

**Trabajo:** revisar el diff completo, seleccionar fuentes/configuración/evidencias necesarias, excluir secretos, registrar un commit y definir la versión de entrega con trazabilidad a artefactos. Commit y etiqueta locales preparados en este cierre; publicación remota y release permanecen aplazadas. La reconstrucción completa en un checkout limpio sigue pendiente; no se acredita solo por registrar el código.

**Cierre observable:** un checkout limpio del commit, con herramientas y configuración documentadas, produce los artefactos y pruebas esperados. La publicación/release y la promoción del pipeline se tratan por separado con el usuario.

## Orden de trabajo sugerido

1. Consolidar la migración local aceptada mediante commit y etiqueta, conservando evidencias.
2. Mantener DEV-01 y DEV-02 fuera del alcance de esta versión, por decisión del usuario.
3. DEV-03 y DEV-04 están implementados y aceptados; no requieren comenzar otra implementación.
4. Acordar los criterios RNF y completar material de vídeo cuando el usuario retome esos pendientes.
5. Reanudar Jenkins, reconstrucción limpia, release y despliegue permanente cuando se autorice.

Cada implementación futura tendrá validación expresa del usuario antes de avanzar a otra fase, como se acordó en el proyecto.

## Qué no se cuenta como desarrollo funcional pendiente

| Trabajo | Etapa principal |
|---|---|
| Completar mediciones de rendimiento/usabilidad/compatibilidad y regresión final | Pruebas. Solo se añadirán correcciones de código si los resultados demuestran una necesidad |
| Configurar y ejecutar el pipeline de Jenkins | Integración y entrega; Jenkins ya está instalado |
| Alojar los tres servicios y bases permanentemente y ejecutar CloudFormation | Despliegue/infraestructura |
| Mantener Grafana/Prometheus activos, configurar alertas y probar notificaciones | Operación/observabilidad |
| Backups de bases, ensayo de restauración y medición de disponibilidad | Operación y recuperación |
| Retirar recursos legacy después de desacoplar la entrada | Retirada controlada |

No se ha identificado aquí la necesidad de un cuarto microservicio, reescribir React o sustituir el motor de simulación. Las funcionalidades principales y las eliminaciones protegidas ya se implementaron y validaron.
