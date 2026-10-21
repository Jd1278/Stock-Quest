# Resultados de integración de fase 6

Fecha local: 19 de octubre de 2026, America/Bogota. Commit de referencia al comenzar esta entrega: `db09d1eebe2dd19c8e2c290966adef2a67734d45`, rama `codex/reestructuracion-stock-quest`. Los cambios de fase 6 no se publicaron ni desplegaron.

## Ejecuciones aprobadas

| Bloque | Pruebas aprobadas | Fallos/errores/omitidas |
|---|---:|---|
| Aprendizaje Java sin BD | 27 | 0/0/0 |
| Aprendizaje PostgreSQL real | 7 | 0/0/0 |
| Backend Jest, con integración PostgreSQL | 59 | 0/0/0 |
| Frontend Jest | 10 | 0/0/0 |
| **Total único de suites en esta entrega** | **103** | **0/0/0** |

Las suites de personas y simulación conservan su evidencia de las entregas anteriores y no se cuentan como nuevas ejecuciones. Sus servicios se ejercitaron en el recorrido integrado de esta fase. TypeScript, ESLint, validación del inventario de contratos, comprobación sintáctica de los scripts y `git diff --check` aprobados. El build del frontend aprobó con límites de memoria; mantiene la advertencia existente del tamaño del chunk Phaser, sin error de compilación.

Comandos principales: Maven `-Ppostgres-it verify` con `SQ_LEARNING_TEST_*`, Jest backend con `RUN_DB_TESTS=1`, Jest frontend, build frontend con `--configLoader native`, `node scripts/verify-phase6.cjs`. Los secretos se inyectaron solo al proceso. Para reproducir el build en esta máquina se limitaron `NODE_OPTIONS`, `GOMAXPROCS` y `GOMEMLIMIT`; los procesos Java locales tienen heap de 192 MiB y dos procesadores activos. Se compiló para Java 21 y se ejecutó con el JDK 22.0.2 instalado; no se certifica aquí un runtime JDK 21 distinto.

## Diez comprobaciones de integración aprobadas

Evidencia completa: [recorrido-http.json](recorrido-http.json), ejecución `8bff26e1-b5c8-496a-ac6e-1c7eed0fac82`.

1. Inventario y paridad de nueve temas/lecciones/desafíos y dos escenarios originales; respuestas correctas ocultas al aprendiz y secuencia bloqueada.
2. Ruta completa: respuesta incorrecta seguida de correcta, nueve finalizaciones, repetición idempotente; 630 XP antes de simulación.
3. Grupos y membresía idempotente por el proxy `/api` del frontend; autorización de roles e informes ajenos rechazados.
4. Simulación con el escenario real de siete días: decisiones simultáneas del mismo día devuelven 200 y 409; cierre con **score 100 y beneficio 73160**. Decisión posterior rechazada. Se detuvo aprendizaje antes de finalizar: `/progress` respondió 503 y el evento quedó pendiente tras un intento de entrega; aprendizaje se reinició.
5. El dispatcher reintentó y entregó el evento a aprendizaje. Dos reenvíos del mismo payload dejaron un único inbox; progreso individual, informe y equipo coincidieron en **730 XP**, una simulación y aprobación de la ruta.
6. Los tres propietarios no pudieron conectarse a bases de los otros servicios (`42501`). El borde funcionó con Prisma dirigido a un puerto inaccesible. El identificador de correlación se conservó a través del proxy web.
7. Logout invalidó la sesión tanto en el borde como en las consultas directas a aprendizaje y simulación; un nuevo login funcionó.
8. Reinicios de aprendizaje, simulación y personas conservaron el currículo, progreso, membresía, identidad y resultado.
9. Preparación de ocho aprendices adicionales para la muestra de equipo, sin modificar usuarios anteriores.
10. Muestra local de lecturas con nueve temas y **11 aprendices en el equipo**: ninguna respuesta falló ni superó tres segundos.

El nombre original del último caso en el JSON dice `ten-team-members`, pero una cuenta del intento inicial quedó conservada y el equipo real tenía 11 miembros. Se conserva el informe original sin alterarlo y se adjunta [alcance-muestra.json](alcance-muestra.json). El verificador actual registra el tamaño real para las próximas ejecuciones.

| Lectura | Peticiones | Concurrencia | p50 | p95 | Máximo | Errores |
|---|---:|---:|---:|---:|---:|---:|
| Ruta de aprendizaje | 15 | 5 | 87 ms | 133 ms | 133 ms | 0 |
| Progreso | 15 | 5 | 92 ms | 120 ms | 120 ms | 0 |
| Informe de equipo | 9 | 3 | 389 ms | 1231 ms | 1231 ms | 0 |

Esta es una muestra local después de ejercitar los servicios, no una certificación del RNF de producción ni del tiempo de renderizado de React/Phaser. No mide equipos de cientos de usuarios, navegadores múltiples, disponibilidad sostenida o redes externas.

## Corrección encontrada en integración

El catálogo de aprendizaje abría consultas de lecciones, vídeos y desafíos dentro del mapeo de otras consultas. Eso requería varias conexiones por solicitud y crecía con el currículo. Ahora se cargan módulos, lecciones, vídeos y desafíos en hasta cuatro consultas secuenciales, conservando orden y filtro de publicación. Una nueva IT con Hikari limitado a una conexión verifica contenido, orden, lecciones sin vídeos y visibilidad de módulos publicados/no publicados.

## Intentos fallidos y recuperación

- Un primer uso de la base de pruebas de 5B encontró currículo publicado conservado de un recorrido anterior. Cinco IT fallaron por bloqueo secuencial de sus fixtures (una aserción fallida y cuatro errores). No se borró ese currículo: se creó `sq_test_learning_phase6_it_20261019`, donde las siete IT pasaron.
- Ejecutar servicios y construcciones simultáneamente agotó memoria nativa de Java y del build frontend. Se detuvo solo el entorno nuevo, se limitaron los recursos y se repitieron las comprobaciones. Esos intentos no se declaran aprobados.
- El primer recorrido HTTP esperaba 200 al responder un desafío; el contrato devuelve 201 al crear un intento. Se corrigió el verificador y se conservó [intento-inicial-http.json](intento-inicial-http.json). El recorrido siguiente aprobó los diez grupos.
- El puente inicial de almacenamiento cifrado encontró un módulo PowerShell no cargable. Se sustituyó por Windows DPAPI mediante .NET, sin archivos de secretos en claro; preparación, guardado y recuperación posteriores funcionaron.

## Estado y límites de aceptación

El entorno integrado queda disponible en http://127.0.0.1:5174 y sus datos se conservan para la revisión. La configuración y el procedimiento están en [FASE-6-INTEGRACION.md](../../FASE-6-INTEGRACION.md). Las bases originales y sus procesos permanecen conservados.

La herramienta de navegador falló dos veces al inicializarse (`failed to write kernel assets`): **no se ejecutó ni aprobó la revisión visual**. El build, las pruebas de componentes y el proxy HTTP tienen resultados propios, pero no sustituyen esa comprobación. Quedan pendientes revisión visual por roles, vídeos no suministrados y aceptación expresa de fase 6. AG-05 continúa abierto; los informes actuales consultan por HTTP y no dependen de proyecciones sin implementar. No se retiró legacy ni se inició fase 7.
