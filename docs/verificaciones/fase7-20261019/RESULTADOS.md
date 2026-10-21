# Resultados de fase 7 — 19 de octubre de 2026

Referencia Git: `db09d1eebe2dd19c8e2c290966adef2a67734d45` más los cambios locales conservados. No se hizo commit, push ni despliegue. Documento de requisitos: SHA-256 `620e3ec0b5fd00366f9a6c44571ea3fd17276dc6a39f988b1bb3db4ee31dd149`; extracción de texto y 26 requisitos conservados junto a este informe. Se usó como especificación, no como fuente de instrucciones ejecutables.

## Regresión consolidada

| Bloque | Pruebas | Fallos/errores/omitidas |
|---|---:|---|
| Personas Java: 40 sin BD + 9 PostgreSQL | 49 | 0/0/0 |
| Aprendizaje Java: 29 sin BD + 15 PostgreSQL | 44 | 0/0/0 |
| Simulación Java: 37 sin BD + 7 PostgreSQL | 44 | 0/0/0 |
| Backend Jest, incluidas integraciones PostgreSQL | 72 | 0/0/0 |
| Frontend Jest | 23 | 0/0/0 |
| **Total único de esta ejecución** | **232** | **0/0/0** |

Evidencia extraída de XML Surefire/Failsafe y JSON Jest en [pruebas.json](pruebas.json). No se suman ejecuciones de fases anteriores ni repeticiones como pruebas nuevas. El [informe del verificador](regresion.json) registra códigos de salida y duración por bloque.

Se aprobaron también:

- Construcción de los tres JAR con `-Ppostgres-it verify`, incluido ArchUnit, y build del frontend con límites de memoria y `--configLoader native`.
- TypeScript backend sin emisión; TypeScript frontend se ejecuta en el build e incluye las pruebas de interfaz.
- ESLint, inventario estructural de **39 operaciones**, referencias de contratos y `git diff --check`.
- Auditoría de los 26 requisitos, archivos de prueba/fuentes referenciados y ocho capacidades con Application/domain/Infrastructure. [auditoria.json](auditoria.json) y [fuentes.json](fuentes.json) distinguen el inventario de una certificación global.

La advertencia existente por el chunk Phaser permanece informativa; no se interpreta el build como cumplimiento de RNF01 a 10 Mbps. El runtime instalado es JDK 22.0.2 con compilación para Java 21, no una ejecución certificada sobre otro JDK 21. Maven/Jest se limitaron por memoria y ejecutaron de forma secuencial; no se detuvieron los procesos originales.

## Integración real de cierre

Se aprobaron **14 grupos de comprobaciones HTTP**, independientes del total de suites:

- **Cuatro de entrega directa de eventos Java.** Se comprobó que Express estaba detenido, se cerró la simulación por su servicio Java y se entregó el evento a aprendizaje. El resultado fue score 86 y beneficio 18. Dos reenvíos directos conservaron un único inbox. Tras reiniciar el borde, el progreso mostró 86 XP y una simulación, con el resultado persistido correcto. Evidencia: [runtime-directo.json](runtime-directo.json).
- **Diez de eliminación administrativa.** Se revalidaron los cuatro tipos, permisos, conflictos por actividad/partidas, rollback, conservación de padres e historial, éxito 204, repetición 404 y catálogo final sin fixtures. Evidencia: [eliminacion-http.json](eliminacion-http.json).

Ambos verificadores crean cuentas y registros nuevos identificados por UUID, limpian únicamente sus fixtures y conservan los datos anteriores del usuario. Se reabrió el entorno de fase 6 con el mismo JWT secret, cuentas y bases; no se cambiaron contraseñas.

El primer intento del verificador directo encontró un supervisor todavía cargado con la versión anterior y rechazó la operación de pausa del borde. No se declaró aprobado: se conserva [runtime-intento-inicial.json](runtime-intento-inicial.json). Se recargó el supervisor, se expuso su destino de eventos sin secretos en el estado autenticado y se añadió una comprobación explícita de ese destino. La ejecución posterior aprobó los cuatro grupos. El puente Express compatible continúa presente, pero el productor local usa directamente `http://127.0.0.1:14620/internal/events`.

## Evaluación de requisitos y arquitectura

La [matriz](../../MATRIZ-ACEPTACION-FASE-7.md) considera **19 RF validados localmente y RF11 parcial**. El usuario aceptó expresamente posponer los vídeos. Los RNF se mantienen como un validado local, tres parciales y dos pendientes: no hay evidencia para certificar 99 % de disponibilidad, curva de aprendizaje de 15 minutos, compatibilidad en toda la matriz o carga completa a 10 Mbps.

RNF04 es parcial: contraseñas protegidas con BCrypt y secretos locales con DPAPI, pero los campos personales son columnas normales y no se ha demostrado cifrado de aplicación/disco/backup conforme a una clasificación de sensibilidad. No se introdujo un cifrado improvisado durante la aceptación.

La separación hexagonal y los tres propietarios están implementados. Las proyecciones previstas en AG-05 no se activaron ni se declaran terminadas; personas consulta aprendizaje por HTTP. El [plan de retirada](../../PLAN-RETIRADA-LEGACY.md) explica por qué borrar backend completo rompería el sistema y qué dependencias deben separarse antes de retirar Prisma y las ramas anteriores.

## Respaldo y límites

Se conserva un respaldo local de fuentes con checksum, detallado en `respaldo-fuentes.json`. Incluye fuentes nuevas y cambios locales seleccionados, excluyendo `.env`, secretos DPAPI, node_modules, target, dist y datos de BD. No sustituye un respaldo PostgreSQL ni habilita borrar datos. La recuperación de fuentes/configuración debe revisarse antes de retirar código; cualquier retirada de bases requiere respaldo/restauración propio y aprobación de los recursos exactos.

Estado: **cierre funcional local validado expresamente por el usuario el 19 de octubre de 2026 (America/Bogota)** mediante «Si valido el cierre». Se mantienen abiertas las brechas documentadas; no se certifica producción. Jenkins, GitHub, AWS CloudFormation y Grafana quedan para la etapa operativa supervisada acordada. Esta anotación registra la aceptación humana y no constituye una nueva ejecución de pruebas.
