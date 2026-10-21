# Auditoría del ciclo de vida de Stock Quest

Fecha de evaluación: 21 de octubre de 2026, America/Bogota.

## Dictamen y criterio

Stock Quest tiene una entrega funcional aceptada y un despliegue temporal probado. No está cerrado todo el ciclo operativo ni acreditada su preparación para producción permanente.

Se marca una etapa como lista cuando existe evidencia suficiente de su objetivo en el alcance acordado. Definir requisitos no equivale a implementarlos, ni publicar una demostración equivale a liberar una plataforma de producción. Los checks de planificación, análisis y diseño corresponden a la migración aprobada. El check de despliegue corresponde exclusivamente a la presentación temporal solicitada por el usuario.

| Etapa | Estado | Evidencia y trabajo pendiente |
|---|---|---|
| 1. Planificación | [x] Lista para la migración y demostración acordadas | Alcance, Java progresivo, conservación de React/Phaser, secuencia de fases, puertas de validación y plan operativo documentados y aceptados. La planificación detallada de infraestructura permanente, costes y responsables de operación debe concretarse al retomar esa etapa. |
| 2. Análisis de requisitos | [x] Lista | Documento fuente identificado y sin cambios de checksum; 20 RF y 6 RNF inventariados, matriz de trazabilidad, diagnóstico y brechas explícitas. Que existan requisitos parciales no invalida el análisis: impide declarar terminado su cumplimiento. |
| 3. Diseño | [x] Listo para la arquitectura local aprobada | Tres límites de servicio, ocho capacidades con Application/domain/Infrastructure, propiedad de datos, contratos, migraciones, identidad y transición documentados. El inventario de contratos actual pasa. La topología permanente y la evolución de las proyecciones deben definirse o actualizarse antes de implementarlas. |
| 4. Desarrollo | [ ] Parcial en el alcance global | Funcionalidades principales y tres servicios implementados y aceptados localmente. Falta el material de vídeo RF11, cuya postergación aceptó el usuario. AG-05 sigue pendiente: informes por HTTP funcionan, pero las proyecciones, ProgresoActualizado y su replay no están implementados. Debe resolverse su entrega o mantenerse una modificación explícita del alcance. Falta consolidar los cambios locales en una versión controlada y actualizar documentación del estado actual. |
| 5. Pruebas | [ ] Parcial para aceptación global | Hay regresión histórica de 232 pruebas, 14 grupos HTTP, 106 pruebas Java posteriores, dos ensayos de observabilidad PASS y aceptación manual del usuario en Vercel. Faltan evidencias completas de RNF01–RNF05 y una regresión integrada de la versión final a liberar. No hay un pipeline Java/JUnit de Jenkins verificado. No se suman ejecuciones repetidas para afirmar un total acumulado de pruebas distintas. |
| 6. Despliegue | [x] Listo para la presentación temporal | Frontend publicado en https://stock-quest-five.vercel.app y API local por Cloudflare Tunnel; el usuario confirmó login, aprendizaje, simulación, progreso y recarga de rutas. Esta auditoría obtuvo HTTP 200 y status ok en /api/health público. El despliegue permanente completo sigue pendiente: servicios y bases fuera del PC, infraestructura, secretos, release y recuperación. |
| 7. Operación y mantenimiento | [ ] Parcial, en curso | Actuator, Micrometer, Prometheus, dashboard Grafana de ocho paneles y scripts de arranque/recuperación existen; dos ensayos previos PASS. En esta revisión Grafana 3000 y Prometheus 9090 no respondieron, aunque Java y el gateway sí. Faltan operación continua, alertas y notificaciones comprobadas, respaldo/restauración de BD, rutina de mantenimiento, responsabilidades y medición de disponibilidad. Jenkins está Running, pero instalarlo no demuestra un pipeline ejecutado. |
| 8. Retirada o sustitución | [ ] Pendiente de ejecutar en legacy | Existe un plan de retirada con dependencias, respaldo y puertas. No se completó la separación de Prisma/legacy del gateway ni su retirada controlada. Faltan validar una entrada sin dependencias SQL legacy, respaldar/restaurar datos, aceptar los recursos exactos y ejecutar cambios reversibles. No corresponde retirar Stock Quest completo mientras sigue en uso. |

Cuatro etapas tienen evidencia suficiente dentro de sus alcances indicados y cuatro permanecen parciales o pendientes. Este conteo no representa un porcentaje de calidad, cobertura de pruebas ni avance de producción.

## Evidencia inspeccionada y comprobaciones actuales

### Documentación y requisitos

- Fuente: `C:\Users\LENOVO\Downloads\Stock_Quest.docx`.
- SHA-256 actual: `620e3ec0b5fd00366f9a6c44571ea3fd17276dc6a39f988b1bb3db4ee31dd149`, coincide con la matriz de fase 7.
- Se revisaron fases 2, 3, 7 y 8, decisiones de arquitectura, transición, arquitectura actual, matriz RF/RNF, pendientes globales, retirada legacy, scripts y configuración de entrega/observabilidad.
- Matriz vigente: RF 19 validados localmente y 1 parcial; RNF 1 validado localmente, 3 parciales y 2 pendientes. Es la evaluación documentada, no una nueva ejecución de cada requisito.

### Código y arquitectura

| Servicio | Archivos Java de producción | Archivos Java de pruebas | Capacidades verificadas |
|---|---:|---:|---|
| Personas/capacitación | 37 | 8 | identidad, usuarios, capacitacion |
| Aprendizaje/evaluación | 40 | 5 | contenidos, evaluaciones, progreso |
| Simulación/logística | 34 | 11 | escenarios, partidas |

Se comprobó la presencia literal de las tres capas en cada raíz de servicio y en sus ocho capacidades. Se inspeccionaron POM, perfiles, puertos, adaptadores HTTP, identidad, BCrypt, migraciones, propiedad de datos y puntos de integración. La arquitectura usa Express como gateway/compositor activo; conservar esa entrada no incumple por sí mismo el objetivo de tres microservicios ni obliga a borrarla.

`node contracts/validar-inventario.cjs` se ejecutó en esta auditoría y devolvió PASS de inventario estructural: 39 operaciones, 32 paths, 14 modelos propios, 7 tipos de evento y 107 referencias resueltas. No es una prueba HTTP ni una validación semántica exhaustiva de OpenAPI.

Se compararon los 68 archivos del inventario SHA-256 de fase 7: ninguno falta y tres difieren, los POM de los servicios tras incorporar observabilidad. También existen archivos nuevos posteriores, incluidos perfiles y scripts. Esta comparación no acredita equivalencia de todo el repositorio ni reemplaza pruebas de integración.

### Pruebas: historia frente a estado actual

- Fase 7: informe consolidado PASS de 232 pruebas, sin fallos/errores/omitidas, con 14 grupos HTTP aparte.
- Después de incorporar métricas: Surefire actual y salidas del usuario acreditan 40 + 29 + 37 = 106 pruebas Java aprobadas, sin fallos/errores/omitidas. Esas ejecuciones no incluyeron el perfil PostgreSQL.
- Observabilidad: dos informes locales con PASS, secuencia simulación up 1/0/1 y readiness posterior ok. Los otros dos servicios permanecieron UP durante las caídas observadas.
- Vercel: aceptación manual expresada por el usuario de los flujos acordados. No se volvió a ejecutar un login ni se modificaron datos de usuario durante esta auditoría.
- No se reejecutó la suite completa ni se detuvieron servicios para esta revisión. Tampoco se ejecutaron nuevos ensayos de carga, pentesting ni escáneres de vulnerabilidades de dependencias. No se certifica ausencia de vulnerabilidades.

### Servicios comprobados durante la auditoría

| Comprobación | Resultado observado |
|---|---|
| Supervisor Stock Quest | ready true; personas, aprendizaje, simulación, gateway y web activos |
| Gateway 14600 /api/health | HTTP 200, status ok |
| Personas 14630 /health/ready | HTTP 200, status ok |
| Aprendizaje 14620 /health/ready | HTTP 200, status ok |
| Simulación 14610 /health/ready | HTTP 200, status ok |
| URL Vercel /api/health | HTTP 200, status ok |
| Grafana 3000 /api/health | Sin conexión en ese momento |
| Prometheus 9090 /-/ready | Sin conexión en ese momento |
| Servicio Windows Jenkins | Running |

La falta de respuesta de Grafana/Prometheus en esta revisión no borra las pruebas históricas de la integración ni demuestra pérdida de sus configuraciones. Sí impide afirmar monitorización continua en ese momento.

La inspección de `C:\Program Files\Jenkins\jenkins.xml` encontró acceso denegado; no se alteraron ACL ni se intentó elevar permisos. No se certificó el inventario de jobs. No hay Jenkinsfile en el repositorio ni evidencia proporcionada de ejecución de un pipeline Java. La configuración GitHub Actions existente verifica Node y no construye los tres servicios Java.

## Brechas para cerrar las etapas incompletas

| Pendiente | Acción y evidencia de cierre |
|---|---|
| RF11, vídeos | Aportar IDs/enlaces reales, cargarlos y verificar reproducción y acceso. Hasta entonces mantener el requisito parcial, incluso con aplazamiento aceptado. |
| RNF01, rendimiento | Medir carga/renderizado completo a 10 Mbps, arranque frío y volumen representativo; comparar con el límite del documento. El warning del bundle Phaser no es por sí solo un fallo ni una aprobación del requisito. |
| RNF02, usabilidad | Evaluación cronometrada con usuarios para acreditar la condición de aprendizaje menor de 15 minutos. |
| RNF03, disponibilidad | Mantener monitoreo, definir ventana y criterio, registrar indisponibilidad y calcular el 99 %. El ensayo breve de reinicio no demuestra esa cifra. |
| RNF04, seguridad | Clasificar datos sensibles y acreditar su protección en aplicación/almacenamiento/backups según el requisito. Contraseñas BCrypt y secretos DPAPI sí existen; correo, documento y teléfono son columnas normales y no hay evidencia de cifrado de aplicación de esos campos. No se infiere el estado del cifrado de disco sin comprobarlo. |
| RNF05, compatibilidad | Ejecutar y documentar matriz de navegadores y dispositivos indicada en requisitos. |
| AG-05, proyecciones | Implementar transporte/inbox, ProgresoActualizado, versiones y reconstrucción/replay, o formalizar un diseño/alcance que conserve las consultas HTTP. No declarar implementadas proyecciones por tener outbox. |
| Versión reproducible | Revisar cambios locales y archivos nuevos; registrar commit, versión y artefactos de entrega. Hay cambios sin confirmar y los JAR siguen en 0.1.0-SNAPSHOT. No se comprobaron publicaciones remotas nuevas. |
| Jenkins y CI/CD | Configurar agente, bases exclusivas, credenciales, build/pruebas, informes JUnit/Jest, archivo de artefactos y promoción revisada. Ejecutar un job y conservar evidencia de resultado. |
| Producción permanente | Definir alojamiento, presupuesto y topología; publicar API/servicios y bases, configurar TLS/secretos, infraestructura acordada con CloudFormation, validar restauración y rollback. Vercel estático más túnel depende del equipo encendido. |
| Operación | Arranque duradero, paneles activos, alertas y su prueba, seguimiento de incidentes y plan de actualización. El dashboard actual no incluye un ensayo de notificaciones ni trazabilidad distribuida completa. |
| Legacy | Separar dependencias activas del gateway, verificar paridad sin Prisma y ejecutar retirada por capacidad con aprobación. No borrar toda la carpeta backend. |

## Desfase documental detectado

`FASE-8-OPERACION.md`, `ARQUITECTURA-ACTUAL.md`, `PENDIENTES-ACEPTACION-GLOBAL.md`, `observability/README.md` y `DESPLIEGUE-TEMPORAL-VERCEL.md` contienen declaraciones de estado previas a instalaciones, métricas o publicación ya realizadas. Los documentos de fases históricas pueden conservar su fecha, pero el índice de estado actual necesita distinguir claramente historia y situación vigente.

Ejemplos: Jenkins ya está instalado; el JDK 21 se utilizó en las compilaciones posteriores; Grafana/Prometheus se instalaron y se ensayaron; el dashboard se importó; Vercel se publicó y el usuario validó sus flujos. El proyecto Vercel real es `stock-quest`, con alias `stock-quest-five.vercel.app`, y no el nombre de demostración propuesto inicialmente. El manifiesto de preparación `deployed: false` no consulta el estado de publicación y no debe tratarse como prueba de que no se desplegó.

Esta auditoría registra las diferencias sin reescribir las evidencias históricas, alterar funcionalidades, publicar cambios o ejecutar retiradas.

### Seguimiento documental posterior a la auditoría

Por solicitud del usuario se actualizó la documentación vigente el 21 de octubre: README, arquitectura, fase 8, pendientes globales, despliegue temporal y guías Vercel/Render, observabilidad, contratos y README de los servicios. Se añadieron [ESTADO-ACTUAL.md](ESTADO-ACTUAL.md) y [PENDIENTES-DESARROLLO.md](PENDIENTES-DESARROLLO.md). Los informes fechados conservan sus resultados; el desfase documental señalado quedó corregido en las guías actualizadas. Esto no completa los pendientes de implementación, pruebas no funcionales u operación. La consolidación Git y la release siguen pendientes.

## Documentos de respaldo

- [Diseño aprobado](FASE-3-DISENO.md) y [decisiones](arquitectura/DECISIONES-FASE-3.md).
- [Matriz RF/RNF](MATRIZ-ACEPTACION-FASE-7.md), [aceptación local](FASE-7-ACEPTACION.md) e [informe de regresión](verificaciones/fase7-20261019/RESULTADOS.md).
- [Plan operativo](FASE-8-OPERACION.md), [despliegue temporal](DESPLIEGUE-TEMPORAL-VERCEL.md) y [retirada controlada](PLAN-RETIRADA-LEGACY.md).
- [Evidencias resumidas de esta auditoría](verificaciones/auditoria-sdlc-20261021/evidencia.json).
