# Decisiones de arquitectura de la fase 3

Estado: diseño aprobado expresamente por el usuario antes de fase 4. Las versiones concretas fijadas al implementar el primer servicio están en `services/simulacion-logistica/pom.xml` y su README. La aprobación de diseño no declara aprobadas pruebas pendientes.

## D01 — Java y construcción

Objetivo propuesto: Java 21, Maven Wrapper por servicio, Spring Boot en infraestructura y JUnit Jupiter. Fijar versiones estables, plugins y distribución de Maven durante fase 4; no usar `LATEST`, snapshots ni milestones. El JDK local 22 no obliga a generar bytecode 22: se utilizará `--release 21`, sujeto a compilación y aceptación en el runtime objetivo. No se instalará un JDK sin necesidad revisada.

Spring Boot publica requisitos de Java y Maven compatibles con esta elección. Maven Wrapper descarga y utiliza la versión fijada sin exigir Maven global. Fuentes: [Spring Boot](https://docs.spring.io/spring-boot/system-requirements.html), [Maven Wrapper](https://maven.apache.org/tools/wrapper/).

Consecuencia: se conserva npm para el frontend y el backend Express durante transición. No se envuelven las pruebas TypeScript en Maven como sustituto de migrar las reglas Java.

## D02 — Tres servicios y monorepo

Se extraen simulación, aprendizaje y personas en ese orden. Cada servicio tiene configuración y persistencia independientes. El gateway/compositor de compatibilidad se mantiene ligero en la entrada existente; no añade un cuarto dominio. Sin discovery, Kubernetes ni service mesh para este alcance de desarrollo.

## D03 — Estructura literal y dirección de dependencias

Cada módulo y submódulo de negocio contiene `Application`, `domain`, `Infrastructure`. La raíz compartida de un módulo no duplica entidades de sus submódulos. Los nombres visibles serán identidad, capacitación, aprendizaje y simulación; los adaptadores técnicos quedan debajo.

Pruebas de arquitectura futuras impedirán imports de Spring/ORM desde dominio y dependencias hacia adaptadores ajenos. Estas pruebas quedan previstas para ejecución del usuario, no aprobadas aquí.

## D04 — Propiedad de datos y entornos nuevos

No se requiere ETL de datos históricos. Se crearán bases nuevas para los servicios con fixtures explícitos de desarrollo; no se elimina ni reutiliza silenciosamente una base existente. Los IDs de fixtures coordinados pueden conservar referencias de usuario sin FK entre servicios. En el futuro cada alta genera su identificador estable de texto, opaco para el cliente; no se exige formato UUID al recibir IDs actuales.

El snapshot de cada partida es inmutable. Escenarios históricos y resultados pertenecen solo a simulación. Las notas, logros y XP pertenecen solo a aprendizaje. Los permisos de equipo pertenecen solo a personas.

## D05 — Persistencia Java

Propuesta inicial: JDBC/Spring JDBC en adaptadores y migraciones Flyway por servicio. Facilita expresar el UPDATE condicional existente sin introducir entidades ORM en dominio. Cada migración afecta solo a la base propia. Outbox comparte la transacción local. No se reutiliza el historial Prisma en bases Java nuevas.

Los scripts Prisma del monolito se mantienen hasta retirarlo. Su corrección previa permanece intacta. No se ejecutan SQL ni migraciones en esta fase.

## D06 — Identidad y autorización

Inicialmente autenticación delegada al `/auth/me` existente, sin compartir secretos de firma con consumidores. Roles y propiedad se comprueban del lado del servicio. Identidad usa datos de personas; aprendizaje/simulación reciben el ID autenticado por el puerto.

Lecturas internas de otro aprendiz: ruta no pública, identidad de servicio separada y autorización de equipo antes de llamar. No se confía en `X-User-Id` público ni en un `userId` arbitrario del body. La entrada elimina cabeceras de identidad entrantes. Tráfico interno autenticado y TLS fuera de desarrollo local. No registrar Bearer ni PII en logs.

Logout y cambio sensible conservan tokenVersion y revocación en el propietario. Los servicios no cachean la aceptación del token durante esta primera versión. La disponibilidad de identidad se convierte en dependencia explícita: timeout 503, sin fallback permisivo.

## D07 — HTTP y errores

Base `/api`, fechas ISO 8601, cuerpos JSON, propiedades y estados actuales. Los PUT de gestor son reemplazos completos y omitir youtubeId elimina el video asociado; no convertirlos en PATCH parcial.

Spring debe adaptar sus errores a `{message, issues?}`; no sustituirlos por ProblemDetail por defecto. IDs privados ajenos siguen devolviendo 404. Day duplicado sigue devolviendo 409 y no se convierte en replay 200. Tamaño de body y límites por IP se aplican en una sola entrada para no multiplicarlos por servicio.

503 se incorpora como fallo explícito de dependencia; verificar que el frontend muestre su `message`. Contratos externos versionados en Git, sin cambiar URLs a `/v2` durante esta migración.

## D08 — Consistencia observada por el usuario

El contrato actual de progreso incluye cada simulación finalizada. El resumen HTTP de resultados confirmados mantiene esa lectura inmediata, evitando depender solo de mensajes atrasados. Personas compone informes después de validar pertenencia; aprendizaje calcula las reglas. No se suman puntuaciones provenientes simultáneamente de evento y consulta.

Timeout propuesto por llamada interna: conexión 1 segundo, respuesta 2 segundos, sin reintentos automáticos de escrituras. El presupuesto extremo a extremo de 3 segundos requiere medir y posiblemente reducir estos límites: los valores iniciales son límites de fallo, no garantía RNF01. No hay cascadas recursivas entre consultas.

Los endpoints internos definidos en `contracts/README.md` se implementan antes de habilitar el cambio de propietario. El endpoint público `/auth/me` de identidad evita una nueva API para el puente inicial.

## D09 — Eventos

Outbox/inbox y entrega al menos una vez. Evento confirmado, eventId estable por publicación, versión de agregado creciente y schemaVersion 1. Reintentos con backoff, límite configurable y cola de errores; no descartar silenciosamente. Cambios incompatibles crean nueva versión de esquema.

Resultados de simulación se identifican por simulationId: un duplicado no suma XP ni logros. Los snapshots de progreso llevan versión y reemplazan la proyección solo si son más nuevos. Las proyecciones se reconstruyen desde endpoints de snapshot paginados previstos; no acceder directamente a bases ajenas. Un consumidor no debe depender de recibir todos los eventos de otro consumidor.

## D10 — Números y paridad

Primer port del motor: `double` y orden de operaciones equivalente a TypeScript, con beneficio final redondeado como `Math.round(x * 100) / 100`. No usar silenciosamente otro redondeo para valores negativos o BigDecimal en este corte. Validar entradas finitas y límites existentes. Establecer comparación con tolerancia explícita para valores intermedios de punto flotante y equivalencia exacta para enteros, score, texto y beneficio con dos decimales en fixtures aceptados.

Una conversión futura a BigDecimal es una mejora separada: representación decimal y escala/rounding deben acordarse. [Referencia Java BigDecimal](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/math/BigDecimal.html).

## D11 — Disponibilidad y observabilidad

Cada servicio expone liveness y readiness internas separadas; readiness verifica dependencias indispensables sin devolver secretos. Se conserva `/api/health` público como vivacidad del borde por compatibilidad. CorrelationId propagado en HTTP y eventos; métricas de latencia, errores, conflictos y retraso de outbox. Grafana y sus fuentes se implementarán en una etapa operativa posterior.

## D12 — Alcance y validación humana

No se agregan recuperación de contraseña, IA, multiempresa completa ni nuevos criterios pedagógicos como parte del port. Las brechas identificadas se planifican por separado. No se eliminan pruebas ni se omiten errores para presentar un resultado aprobado. El usuario ejecuta las pruebas aisladas y valida cada fase. Compilar no equivale a aceptar comportamiento.
