# Retirada controlada del backend anterior

Actualización del 21 de octubre de 2026 tras validación del usuario: gateway independiente activado y backend anterior trasladado a `legacy/backend`, fuera de los workspaces. Nueve snapshots conservaron sus resultados y las 42 fuentes archivadas mantuvieron sus checksums. Véase [resultado de activación y archivo](RETIRADA-LEGACY-20261021.md). Véase [el bloque de migración](MIGRACION-GATEWAY-20261021.md). El inventario de abajo describe la entrada anterior, ya archivada. No representa componentes del runtime activo. No se eliminaron bases ni progreso. La instalación Jenkins, observabilidad y publicación temporal posteriores no eliminan las dependencias inventariadas aquí. El apartado operativo final describe el alcance histórico de la preparación; consultar [estado vigente](ESTADO-ACTUAL.md) para los avances posteriores.

Estado: plan concreto para revisión de fase 7. No se ha borrado código, tablas, bases ni ramas. La instrucción de avanzar a fase 7 autoriza la evaluación y preparación de la retirada; no se interpreta como autorización para perder el progreso registrado durante las validaciones posteriores.

## Inventario histórico de los componentes sustituidos

| Componente | Uso actual con los tres modos Java | Tratamiento |
|---|---|---|
| `backend/src/app.ts`, `server.ts`, `routes/index.ts` | Entrada `/api`, CORS, límites de solicitudes, cabeceras, rutas y respuestas | Conservar hasta disponer de un gateway equivalente y verificado |
| `middlewares/index.ts`, `validators/index.ts` | Identidad por HTTP, permisos, manejo de errores y validación de contratos | Conservar; separar dependencia de Prisma antes de extraer el borde |
| `peopleGateway.ts`, `learningGateway.ts`, `simulationGateway.ts` | Adaptadores activos y composición de respuestas | Conservar |
| `controllers/index.ts`, partes de `adminService.ts` | Enrutamiento y composición del panel del gestor | Separar rutas activas de ramas legacy antes de eliminar código |
| `routes/internalEvents.ts` | Puente compatible para configuración anterior | El entorno local nuevo entrega directamente a aprendizaje; retirar el puente solo después de migrar todos sus consumidores |
| `repositories/index.ts`, `prisma/client.cjs` y dependencia Prisma | Sus símbolos se importan aunque no haya conexión SQL en modo Java | No se pueden borrar mientras AppError, errores y servicios sigan importándolos |
| `authService.ts`, `learningService.ts`, `simulationService.ts`, `simulationEngine.ts`, ramas legacy de `progressService.ts` y `adminService.ts` | Implementaciones anteriores protegidas por flags | Candidatas a retirada después de separar el gateway y aceptar el entorno único |
| `backend/prisma`, seed, scripts de migración y modelos | Necesarios para modo legacy, restauración e integración de ese modo | Conservar junto al respaldo hasta aprobar la retirada de datos |
| `.github/workflows/ci.yml` | Verifica Node/Prisma y contiene despliegue opcional existente | No certifica Java/JUnit ni sustituye Jenkins. Revisar antes de cualquier publicación |

No corresponde eliminar toda la carpeta backend: eso dejaría sin `/api` al frontend. Tampoco basta borrar su conexión Prisma: todavía hay imports y tipos compartidos que deben separarse.

## Secuencia de retirada y puertas

1. **Congelar y respaldar.** Registrar HEAD y cambios locales, archivar fuentes no ignoradas y verificar checksum. Preparar respaldo/restauración de cada base antes de cualquier retirada de datos. Un ZIP de código no respalda el progreso ni sustituye un dump de BD.
2. **Aceptar el entorno habitual Java.** Identificar puertos/URL definitivos, usuarios y bases; confirmar que todos los recorridos escriben únicamente en Java. Conservar el acceso anterior sin nuevas escrituras mientras se realiza esa aceptación. No hay sincronización automática entre propietarios.
3. **Separar el borde activo.** Extraer manejo de errores independiente de Prisma, separar ramas de negocio legacy de controllers/composición y trasladar imports comunes. Mantener los 39 contratos, autenticación, límites y composición. Puede conservarse Express como gateway; hacerlo Java sería una decisión nueva, no una exigencia de arquitectura hexagonal.
4. **Verificar sin Prisma ni legado.** Construir un gateway sin imports SQL/modelos legacy, retirar DATABASE_URL/JWT_SECRET legacy de sus requisitos y ejecutar contratos, permisos, currículo, decisiones, eventos y reportes completos con las tres bases Java. Aceptación humana antes del cambio de entrada.
5. **Retirar código por capacidad.** Un cambio pequeño revisable para identidad/personas, otro para aprendizaje y otro para simulación; con su referencia de recuperación y pruebas correspondientes. Conservar pruebas de contrato útiles, trasladándolas cuando corresponda. No borrar pruebas solo para obtener un resultado verde.
6. **Retirar infraestructura/datos anteriores.** Solo después de respaldo probado y aprobación explícita para los recursos exactos. Deshabilitar primero tráfico y procesos identificados; observar; archivar antes de plantear eliminación. Ninguna operación DROP, TRUNCATE o limpieza automática forma parte de esta fase ejecutada.

## Recuperación

Antes de cambiar escritores se puede mantener el entorno anterior intacto. Después de aceptar datos Java, volver a dirigir a legacy exige conciliación; los datos no regresan por cambiar flags. La recuperación preferida consiste en volver a un ejecutable/configuración Java compatible manteniendo su base como propietario. Las migraciones futuras deben mantener compatibilidad con la versión recuperable durante la transición.

El supervisor local admite `node scripts/local-java.cjs stop` y `start` sin borrar bases. La entrega directa de eventos se configura en un único punto del supervisor; si hubiera que volver al puente anterior, se cambia el destino a `origin.edge + '/internal/events'` y se reinicia únicamente este entorno después de comprobar inbox y credenciales. Los reenvíos conservan sus eventId y no deben duplicar logros.

## Fuera de la retirada ejecutada

Jenkins, publicación en GitHub, AWS CloudFormation y Grafana siguen como etapa operativa supervisada por el usuario. Este plan no realiza releases, push, despliegues ni cambios de infraestructura externa. Los ejecutables actuales continúan siendo versiones de desarrollo.
