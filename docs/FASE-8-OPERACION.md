# Fase 8 — Preparación y ejecución operativa supervisada

Entrada: cierre funcional local de fase 7 validado por el usuario. Actualización del 21 de octubre de 2026: **instalación guiada local realizada; pipeline Jenkins pendiente; observabilidad demostrada y despliegue temporal Vercel validado**. El usuario eligió este equipo para Jenkins, instaló JDK 21 y completó el acceso inicial. La ejecución de herramientas operativas sigue siendo guiada y supervisada por él.

| Subfase | Situación vigente |
|---|---|
| 8A | Entorno Windows elegido; JDK 21 y Jenkins instalados. Jenkins observado Running en auditoría; el inventario inicial es histórico |
| 8B | Agente stockquest-windows conectado, diagnóstico de herramientas SUCCESS y tres credenciales CI creadas por el usuario. Jenkinsfile de microservicios preparado; ejecución Java en Jenkins pendiente. Los builds y pruebas locales no equivalen a un job Jenkins |
| 8C | Fuentes consolidadas y publicadas: etiqueta migracion-local-2026.10.21. Release de artefactos y fusión a la rama principal pendientes |
| 8D | Pendientes diseño y ejecución de infraestructura permanente con CloudFormation |
| 8E | Actuator/Micrometer, Prometheus, dashboard Grafana y dos ensayos locales PASS realizados. Pendientes alertas y operación continua; herramientas sin conexión en el momento de la auditoría |
| 8F | Aceptación de presentación temporal recibida; aceptación de producción permanente pendiente |

Por prioridad de la presentación se adelantó la demostración de 8E y se publicó la interfaz en Vercel con API local por túnel. Esto no completa automáticamente 8B–8D. Véanse [despliegue temporal](DESPLIEGUE-TEMPORAL-VERCEL.md), [estado actual](ESTADO-ACTUAL.md) y [pendientes de desarrollo](PENDIENTES-DESARROLLO.md).

## Diagnóstico inicial conservado como historial de preparación

- Los tres servicios tienen Maven Wrapper 3.9.11, compilación para Java 21 y perfil `postgres-it`. No hace falta instalar Maven global para usar esos wrappers.
- El equipo dispone de Java y Node. El Java detectado está en JDK 22; todavía debe verificarse el pipeline con el JDK 21 objetivo.
- No se detectaron Docker ni AWS CLI en el PATH. Tampoco Jenkins en el PATH o como servicio Windows; esto no descarta una instalación externa o manual.
- `.github/workflows/ci.yml` verifica el sistema Node y contiene un despliegue condicionado por `DEPLOY_ENABLED`; no configura Java ni construye los servicios. No se debe usar como evidencia de entrega Java.
- `render.yaml` describe la entrega Node anterior. `compose.yaml` contiene solamente PostgreSQL y publica su puerto local 5432. No representan la topología de los tres servicios.
- Hay cambios locales y archivos nuevos de las fases anteriores sin confirmar. Antes de publicar se revisará el diff completo y la inclusión de fuentes y evidencias, excluyendo secretos.

Inventario reproducible: desde la raíz, `node scripts/operation-preflight.cjs`. Su salida distingue disponibilidad de herramientas de una verificación de funcionamiento. No instala, inicia ni modifica servicios y no lee credenciales.

## Secuencia con puertas de validación

Cada subfase termina con evidencias y validación expresa del usuario antes de comenzar la siguiente. El usuario ejecuta y supervisa las herramientas operativas; el asistente prepara archivos, explica comandos y evalúa sus resultados.

| Subfase | Entrada y trabajo | Comprobaciones y entregables | Aceptación y recuperación |
|---|---|---|---|
| 8A: preparación | Revisar configuración real, herramientas y pendientes; elegir ubicación de Jenkins | Este plan e inventario JSON; distinguir herramientas ausentes de comprobaciones no ejecutadas | Usuario revisa y confirma entorno. Solo se añaden documentos y script de lectura; retirar estos archivos revierte esta preparación |
| 8B: build y pruebas | Jenkins y agente acordados; workspace y bases exclusivos de CI; JDK 21 y Node definidos | Preparar Jenkinsfile: checkout, dependencias, Maven/JUnit de los tres servicios, Jest, lint, contratos, builds y archivo de informes. Comandos por servicio: `./mvnw -B -ntp -Ppostgres-it verify` o `mvnw.cmd` en Windows. Node: `npm ci`, generación/migración de BD de pruebas, `npm test`, `npm run lint`, `npm run build` | El usuario ejecuta el job; informes JUnit/Jest sin fallos, errores ni omisiones inesperadas y artefactos identificados por commit. Ante fallo, detener entrega y conservar logs; nunca migrar bases de aplicación desde CI |
| 8C: release y publicación GitHub | 8B aprobada; diff revisado y commit concreto seleccionado | Decidir versión, preparar notas y manifiesto SHA-256 de JAR y frontend, publicar fuentes y artefactos mediante flujo acordado. GitHub aloja repositorio/releases; la ejecución de servicios necesita hosting | Usuario revisa destino y ejecuta publicación; verificar correspondencia commit/artefactos. Ante fallo no promover; conservar versión previa y documentar cualquier corrección sin reescribir historial compartido |
| 8D: operación AWS CloudFormation | Publicación aprobada y cuenta, región, presupuesto, dominio y topología definidos | Diseñar primero plantilla con red, cómputo, TLS, secretos, bases independientes, backups y permisos. Validar plantilla y revisar change set antes de ejecutar; registrar costes estimados y recursos | Usuario ejecuta y supervisa infraestructura. Salud, migraciones, acceso y restauración comprobados. Fallos: detener promoción, usar rollback revisado y restauración ensayada; no borrar recursos de datos automáticamente |
| 8E: monitorización Grafana | Servicios en entorno acordado y fuente de métricas elegida | Implementar instrumentación y recolección, dashboards de latencia, errores, disponibilidad, BD y entrega de eventos; reglas y prueba de alertas. Grafana requiere una fuente de datos, no sustituye el recolector | Mostrar series reales y caída/recuperación controlada. Usuario valida. Ante fallo revertir configuración de observabilidad sin alterar datos de negocio |
| 8F: aceptación operativa | Evidencia completa de subfases y brechas RF/RNF reevaluadas | Runbook, respaldo/restauración, rollback de versión, permisos, carga y compatibilidad acordadas, seguimiento de disponibilidad durante la ventana requerida | Aceptación humana explícita de la liberación. No declarar RNF cumplidos por disponer de pipeline o dashboards |

## Condiciones del pipeline que se preparará en 8B

1. Usar un checkout propio del agente. El verificador de fase 7 usa bases locales con nombres concretos y puede detener el supervisor; se conserva para regresión local, no se trasladará sin adaptación a Jenkins.
2. Crear bases y roles exclusivos de pruebas con nombres que cumplan las protecciones existentes. Entregar secretos por el almacén de credenciales de Jenkins y variables temporales; no copiar `.stockquest-local/config.dpapi` ni cuentas de interfaz al agente.
3. Ejecutar los bloques secuencialmente en este equipo si comparte la memoria con la aplicación. Archivar informes Surefire/Failsafe y Jest, diferenciando una prueba no ejecutada de una aprobada.
4. Mantener las pruebas útiles del borde Node y frontend: todavía forman parte del producto. La compilación de Java por sí sola no verifica el sistema completo.
5. Separar verificación, empaquetado y promoción. Publicación y despliegue se prepararán después de la validación de 8B; revisar también cómo se coordinará el workflow GitHub existente para evitar dos flujos de entrega.

## Pendientes que continúan abiertos

Vídeos RF11, rendimiento y usabilidad según condiciones del documento, disponibilidad observada, protección completa de datos sensibles y matriz de navegadores/móvil. AG-05 y archivo de fuentes legacy AG-08 ya fueron aceptados en el alcance técnico local; las bases históricas se conservan. El registro global conserva su estado; iniciar operaciones no los da por resueltos.

## Evidencia inicial y avances posteriores

`verificaciones/fase8a/preflight.json` conserva el inventario anterior a las instalaciones; sus valores no describen el entorno actual. Posteriormente se instaló Jenkins en este equipo y JDK 21, se ejecutaron 106 pruebas Java con métricas y se completaron dos ensayos de observabilidad PASS. Las capturas y presentaciones están en `entregables/grafana`; los informes locales del ensayo quedan en `.stockquest-local/observability`. El usuario confirmó login, aprendizaje, simulación, progreso y recarga de rutas desde Vercel. Se acredita un diagnóstico de herramientas SUCCESS en Jenkins, pero no una ejecución de pruebas de producto en Jenkins, una release GitHub ni infraestructura AWS.

## Primer job Java preparado

Véase [Jenkins: microservicios](JENKINS-MICROSERVICIOS.md) y el Jenkinsfile de la raíz. La configuración histórica de 8B que menciona generación/migración Node ya no corresponde al gateway independiente: este no utiliza Prisma ni base de datos. Las migraciones de integración las ejecuta Flyway en bases exclusivas. Gateway/frontend se añadirán en un siguiente bloque supervisado.
