# Estado vigente de Stock Quest

Última revisión documental: 21 de octubre de 2026. Este documento reúne el estado aceptado; los informes fechados de fases anteriores conservan sus resultados históricos. No es un monitor en tiempo real.

## Entrega funcional y arquitectura

- Cierre funcional local de fase 7 validado expresamente por el usuario el 19 de octubre.
- Tres servicios Java 21: personas/capacitación, aprendizaje/evaluación y simulación/logística. Ocho capacidades organizadas en Application/domain/Infrastructure y un propietario de escritura por conjunto de datos.
- Frontend React/Phaser y gateway independiente en `gateway/` activos. El supervisor se reinició después de la validación del usuario; nueve snapshots y sesiones conservaron sus resultados. Sin Prisma/SQL ni fallback legacy en el borde. Backend anterior archivado en `legacy/backend`, fuera de los workspaces; 42 fuentes verificadas por SHA-256. Véase [activación y retirada](RETIRADA-LEGACY-20261021.md).
- AG-05 implementado y activado: aprendizaje genera snapshots versionados, entrega ProgresoActualizado a personas y sus informes leen proyecciones locales. Doce aprendices inicializados y nueve respuestas de línea base conservadas. Pasaron 120 pruebas Java de los dos servicios afectados, 87 Node y ocho grupos HTTP específicos, incluida disponibilidad del informe con aprendizaje detenido y reconstrucción. Bloque validado expresamente por el usuario el 21 de octubre de 2026; cierre técnico de la migración local aceptado; véase [resultado AG-05](AG05-PROYECCIONES-20261021.md).
- Contenido textual, lecciones, desafíos y escenarios cargados. Vídeos propios pendientes de suministro y validación, RF11 parcial.

## Herramientas y ejecución acreditadas

| Elemento | Situación |
|---|---|
| JDK | Temurin 21.0.12.1 instalado por el usuario; compilaciones posteriores de los tres servicios correctas |
| Maven/JUnit | Wrapper por servicio; 106 pruebas Java posteriores a observabilidad aprobadas. Son ejecuciones distintas de la regresión de fase 7 |
| Regresión de fase 7 | 232 pruebas aprobadas y 14 grupos HTTP aparte; no reejecutada en la auditoría del 21 de octubre |
| Jenkins | Instalado y acceso inicial completado. Servicio Windows Running en auditoría; sin job/pipeline Java acreditado |
| Prometheus/Grafana | Instalación local, fuente conectada y dashboard de ocho paneles importado. Dos ensayos de simulación PASS. En auditoría no respondían en 9090/3000: no se afirma monitorización continua |
| GitHub Actions | Workflow ajustado a gateway/frontend, sin Prisma, migraciones ni hooks legacy. No ejecutado en GitHub en este bloque; no construye los tres Java |
| Release | Cambios locales y archivos nuevos aún por consolidar; JAR 0.1.0-SNAPSHOT; sin release de esta entrega acreditada |
| AWS CloudFormation | Infraestructura permanente pendiente |

## Publicación temporal aceptada

URL: https://stock-quest-five.vercel.app. Proyecto Vercel: `stock-quest`, reutilizado por el asistente CLI al vincular por Git. La interfaz compilada se publica desde una carpeta estática preparada, con `/api` reenviado al túnel Cloudflare del gateway local 14600.

En la comprobación de activación del 21 de octubre, local y proxy frontend respondieron 200 con la entrada nueva; el dominio previo del túnel devolvió ENOTFOUND y la API Vercel 502. La publicación temporal necesita recuperar su conexión antes de otra presentación. No se cambió ni republicó Vercel en este bloque.

El usuario confirmó anteriormente login, aprendizaje, simulador, progreso y recarga de rutas. La auditoría comprobó `/api/health` público con HTTP 200 y status ok. Los tres servicios Java y PostgreSQL siguen ejecutándose localmente, por lo que el equipo, la aplicación y el túnel deben permanecer activos. La URL del túnel puede cambiar al reiniciarlo. Acceso de terceros sin sesión Vercel: no acreditado mediante una comprobación separada.

Esto completa la demostración temporal solicitada; no representa alojamiento permanente ni aprobación de todos los RNF.

## Trabajo abierto

- Desarrollo: [lista concreta y criterios de cierre](PENDIENTES-DESARROLLO.md).
- Requisitos y pruebas no funcionales: [matriz RF/RNF](MATRIZ-ACEPTACION-FASE-7.md) y [auditoría](AUDITORIA-CICLO-VIDA-20261021.md).
- Entrega/operación: pipeline Jenkins, versión/release, infraestructura permanente, alertas, backups/restauración y mantenimiento.
- Retirada: ejecutar el [plan de legacy](PLAN-RETIRADA-LEGACY.md) únicamente tras cumplir sus puertas.

Los avances no cambian automáticamente las aceptaciones pendientes ni autorizan publicar, eliminar datos o modificar infraestructura adicional.
