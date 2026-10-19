# Evaluación de fase 5B — 19 de octubre de 2026

El usuario autorizó explícitamente al asistente a conectarse a PostgreSQL y ejecutar las pruebas, sustituyendo la restricción anterior de ejecución personal. Las credenciales se usaron en variables de proceso y no se guardaron en archivos del proyecto ni en esta evidencia.

## Resultado

| Bloque | Aprobadas | Fallos/errores | Omitidas |
|---|---:|---:|---:|
| Aprendizaje Java sin BD | 27 | 0 | 0 |
| Aprendizaje PostgreSQL real | 6 | 0 | 0 |
| Simulación Java sin BD | 36 | 0 | 0 |
| Simulación PostgreSQL real | 5 | 0 | 0 |
| Backend Jest, incluidas integraciones PostgreSQL y puente 5B | 47 | 0 | 0 |
| Frontend Jest | 10 | 0 | 0 |
| **Pruebas únicas de las suites** | **131** | **0** | **0** |

Además se ejecutaron **11 comprobaciones de integración HTTP/SQL con los tres procesos juntos**, todas aprobadas. Las 27 pruebas iniciales repetidas durante Maven verify se cuentan una sola vez. Los 11 escenarios del verificador son grupos de aserciones del recorrido, no once pruebas JUnit adicionales.

Evidencia resumida: [pruebas.json](pruebas.json), [recorrido-http.json](recorrido-http.json) y [postgres-evidence.json](postgres-evidence.json). Los totales Java se extrajeron de Surefire/Failsafe; frontend del JSON Jest; backend de la salida observada de Jest (ocho suites, 47 tests).

## Entorno e aislamiento

Conexión confirmada a PostgreSQL 16.13 en 127.0.0.1:5432. Se crearon bases nuevas, propiedad del rol de pruebas sq_phase4_test:

- sq_test_learning_phase5b_20261019: Flyway V1 de aprendizaje.
- sq_test_simulation_phase5b_20261019: Flyway V1/V2 de simulación.
- sq_test_backend_phase5b_20261019: dos migraciones PostgreSQL del backend.

No se reutilizaron los historiales entre servicios. El rol administrativo local se utilizó para crear las bases; las suites y la aplicación de verificación se conectaron como el rol de pruebas. Las bases se conservan para inspección; no se ejecutó DROP DATABASE ni Flyway clean.

El recorrido completo usó Express 14000, simulación 14010 y aprendizaje 14020, con tokens efímeros y secretos distintos de los procesos del usuario. Los procesos de verificación fueron cerrados al finalizar, incluido el reinicio controlado de aprendizaje. Los puertos originales 4000, 4010 y 5173 siguen activos y las rutas de salud originales responden ok. No se cambió el modo de aprendizaje del entorno abierto.

Se verificó por SQL de solo lectura que en las bases originales siguen el aprendiz, su inbox y su logro; la simulación original conserva día 3, score 86 y profit 18.

## Comandos ejecutados

- Aprendizaje: `mvnw.cmd -B -ntp test`, seguido de `mvnw.cmd -B -ntp -Ppostgres-it verify` con variables de BD exclusivas.
- Simulación: `mvnw.cmd -B -ntp -Ppostgres-it verify` con su propia base nueva.
- Backend: migrador PostgreSQL y `npm.cmd test -w @stock-quest/api`, RUN_DB_TESTS=1; el modo inicial de las integraciones legacy sigue legacy y las suites del puente fijan java en su propio entorno.
- Frontend: `npm.cmd test -w @stock-quest/web -- --json --outputFile=../services/aprendizaje-evaluacion/target/frontend-jest-results.json`.
- Recorrido real: `node scripts/verify-phase5b-e2e.cjs`, con SQ_VERIFY_DB_PASSWORD y SQ_VERIFY_SUFFIX en la sesión.
- Construcción frontend: `npm.cmd run build -w @stock-quest/web`, correcta.
- Emisión TypeScript backend: `tsc -p backend/tsconfig.json --outDir services/aprendizaje-evaluacion/target/backend-build`, correcta, sin regenerar ni sustituir el cliente Prisma cargado por la aplicación del usuario.
- Sintaxis de verificadores Node, inventario de contratos y `git diff --check`, correctos.

El aviso de chunk grande de Phaser durante Vite y las advertencias de Mockito/JDK no produjeron fallos. No se declara resuelta la regeneración de Prisma bajo bloqueo de DLL: en esta verificación no era necesaria, pues 5B no cambia su esquema.

## Evaluación funcional y de arquitectura

**Arquitectura y propiedad: aprobadas dentro del alcance probado.** ArchUnit confirmó que dominio/aplicación no dependen de Spring, Jackson o adaptadores y que el servicio no importa implementaciones de los otros servicios. Cada capacidad mantiene sus tres capas. El recorrido real confirmó cero escrituras en LearningProgress, ChallengeAttempt, UserAchievement y SimulationEventInbox de Prisma para el aprendiz de verificación con aprendizaje Java activo.

**Reglas pedagógicas: aprobadas.** Material de borradores y lecciones bloqueadas oculto; soluciones fuera de DTO públicos; desafío obligatorio antes de finalizar; feedback y contador conservados; mejor intento para XP y todos los intentos para el promedio del tema; finalización repetida sin duplicar el hecho. El usuario de prueba finalizó dos lecciones, aprobó el desafío tras un fallo y completó una simulación: 100 + 20 + 86 = 206 XP, una simulación y passed=true.

**Persistencia y concurrencia: aprobadas.** Las IT ejercitaron rollback ante fallo de outbox, duplicados concurrentes de inbox, finalización concurrente y restricciones de posición. El recorrido conjunto comprobó persistencia tras reiniciar aprendizaje.

**Integración de eventos: aprobada para simulación hacia aprendizaje.** El productor Java entregó a Express, este reenvió al inbox Java y solo entonces confirmó. El evento y la entrega quedaron DELIVERED, consumidor transitorio legacy-learning, un intento. Reenvío idéntico: 204; mismo identificador con score distinto: 409. Un único logro almacenado. El nombre histórico del consumidor se conserva durante el puente; no implica que su almacenamiento siga en Express.

**Permisos y fallo de dependencias: aprobados en los escenarios ejecutados.** Sin sesión: 401; aprendiz administrando: 403; informe de usuario ajeno al líder: 404. Aprendizaje detenido: 503 en módulos y progreso, sin fallback. La recuperación restauró el progreso original.

**Compatibilidad: verificada por API y pruebas frontend.** Administración, UTF-8, informes individual/equipo, retirado de vídeo por PUT y consulta de progreso conservaron sus formas esperadas. No se realizó una nueva inspección visual del navegador conectado a aprendizaje Java; el recorrido completo se ejecutó por HTTP real, y los diez tests frontend corresponden a componentes/stores/hooks.

## Pendientes antes de aceptación global

1. Cargar y revisar los nueve temas de contenido existentes en una base de desarrollo Java. El fixture mínimo permite probar las reglas, pero no es el contenido completo del producto.
2. Activar el nuevo propietario en el entorno local del usuario de manera supervisada y comprobar visualmente las pantallas de aprendizaje/gestor/líder contra ese servicio.
3. Medir latencia con equipos y currículos representativos. El código realiza consultas por módulo/lección y llamadas de resumen por usuario; las pruebas actuales no certifican RNF01, concurrencia de carga ni SLA.
4. Al integrar personas en 5C: dispatcher de hechos de aprendizaje, ProgresoActualizado, snapshots reconstruibles y el tercer microservicio. El outbox actual conserva hechos y no se presenta como un sistema de proyecciones terminado.

No se encontraron defectos en las comprobaciones ejecutadas. Esto no acredita ausencia general de defectos ni aceptación de las funcionalidades no probadas. Se mantiene el punto de validación humana: no se inició 5C.

## Reproducción

Los scripts auxiliares no incluyen la contraseña. `verify-phase5b.cjs inspect` consulta la instancia; `prepare` crea exclusivamente nombres nuevos bajo sq_test_ y rechaza reutilizar nombres existentes. El recorrido HTTP requiere esas bases migradas y vacías de contenido previo al primer recorrido, así como los JAR construidos; conserva sus fixtures para inspección. Para repetir todo desde cero usar otro SQ_VERIFY_SUFFIX y nuevas bases, no borrar los datos existentes. No ejecutar el recorrido sobre las bases del usuario ni asumir que es idempotente sobre un currículo ya sembrado.
