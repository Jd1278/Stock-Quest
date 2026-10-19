# Fase 5B — Aprendizaje y evaluación

## Entrada y estado

El usuario autorizó posteriormente avanzar a 5C dejando los pendientes globales registrados. No se confunde esa autorización con la activación de aprendizaje Java en la aplicación local abierta. El seguimiento continúa en FASE-5C-PERSONAS.md y PENDIENTES-ACEPTACION-GLOBAL.md.

El usuario aprobó expresamente cerrar 5A e iniciar 5B tras confirmar el acceso, perfil y catálogo en frontend. Esta entrega implementa el segundo servicio Java y el puente de compatibilidad desactivado por defecto. Posteriormente autorizó al asistente a acceder a PostgreSQL y ejecutar las pruebas: las suites y el recorrido real aislado fueron aprobados. [Evaluación y evidencias](verificaciones/fase5b-20261019/RESULTADOS.md). No se inició 5C ni se cambió el propietario de aprendizaje del entorno abierto. Se crearon únicamente tres bases exclusivas para la verificación y procesos temporales en otros puertos.

## Cambios revisables

1. Servicio independiente `services/aprendizaje-evaluacion`, con Maven Wrapper fijado, Java 21, puerto 4020 y base propia.
2. Capacidades contenidos, evaluaciones y progreso, cada una con Application, domain e Infrastructure. Puertos para catálogo, intentos, progreso, resumen externo y hechos de aprendizaje; infraestructura compone los casos de uso.
3. Flyway V1 crea módulos, lecciones, contenidos, desafíos, intentos, progreso, logros, inbox, versión y outbox. Solo referencias internas usan FK. user_id es una referencia externa opaca.
4. Ruta secuencial y respuestas públicas sin correctIndex/explanation. Lecciones bloqueadas conservan metadatos y ocultan material. Se conserva la restricción por rol de finalización e intentos.
5. Transacción y bloqueo asesor por usuario para intentos, finalización y recepción de eventos. Finalización repetida no concede otro logro ni publica otro hecho; fallo de outbox revierte el intento.
6. Progreso conserva XP = lecciones x 50 + mejor nota de cada desafío / 5 + suma completa de puntuaciones de simulación. El promedio por tema usa todos los intentos. No se duplica XP por evento y consulta.
7. Administración crea/reemplaza módulos, lecciones, vídeo y desafíos; PUT sin youtubeId retira vídeo, conflictos de posición/referencia devuelven 409.
8. Informes internos conservan actividades (máximo 100) y permiten consulta por lote de 1–100 IDs únicos. El borde sigue comprobando pertenencia al equipo antes del informe.
9. LEARNING_BACKEND=legacy|java elige propietario. Java exige simulación Java y credencial propia. Express reenvía catálogo, lecciones, intentos, progreso, administración y eventos; no escribe aprendizaje legacy en ese modo. El seed conserva usuarios pero evita contenido de aprendizaje legacy.

## Validación y evidencia

Las 79 pruebas previas pertenecen a la entrega 5A y no sustituyen la regresión tras este cambio. La autorización posterior del usuario permitió al asistente ejecutar la regresión completa: 131 pruebas aprobadas y 11 comprobaciones de recorrido real, sin fallos u omisiones. Las repeticiones no se cuentan como pruebas únicas adicionales.

| Comprobación | Estado de la entrega |
|---|---|
| Maven package con -DskipTests | Compilación y empaquetado verificados; no implica pruebas aprobadas |
| JUnit/IT aprendizaje | 27 sin BD y seis PostgreSQL aprobadas, sin omisiones |
| TypeScript sin emisión | Aprobado; incluye comprobación estática de las pruebas de los puentes de simulación y aprendizaje |
| ESLint | Aprobado tras los cambios finales, sin avisos |
| Inventario de contratos | 35 operaciones públicas, 14 modelos, 107 referencias; verificación estructural |
| Backend build | TypeScript emitido a carpeta de verificación; no se regeneró la DLL Prisma en uso, esquema sin cambios |
| PostgreSQL y recorrido conjunto 5B | Aprobados en bases exclusivas y puertos 14000/14010/14020; procesos cerrados al finalizar |
| Regresiones | Simulación 41, backend 47 y frontend 10 aprobadas; build frontend correcto |

Se ejecutaron y aprobaron 27 pruebas Java sin PostgreSQL (12 de casos de uso, dos de arquitectura, ocho HTTP y cinco del resumen de simulación), seis IT de persistencia/concurrencia/rollback y nueve pruebas Jest del puente, incluidas en las 47 del backend. Los siguientes pasos quedan como guía reproducible; la activación local y aceptación humana siguen pendientes.

## Secuencia personal de validación

1. Desde el nuevo servicio, ejecutar `mvnw.cmd -B -ntp test` y revisar la salida juntos. Esperado: 27 pruebas sin omisiones ni fallos.
2. Ejecutar regresión Jest desde la raíz con RUN_DB_TESTS=0 y LEARNING_BACKEND=legacy, conservando configuración aislada de suites; esperado 39 aprobadas y ocho omitidas por PostgreSQL. Con bases preparadas y RUN_DB_TESTS=1, esperado 47 sin omisiones. No sembrar currículo en la base de integración legacy.
3. Crear nueva base exclusiva `stockquest_test_learning`. Configurar SQ_LEARNING_TEST_JDBC_URL, SQ_LEARNING_TEST_DB_USER y SQ_LEARNING_TEST_DB_PASSWORD; ejecutar perfil postgres-it. No reutilizar los dos historiales anteriores.
4. Tras aprobar las pruebas, preparar otra base nueva para desarrollo de aprendizaje, aplicar Flyway al arrancar y cargar fixture explícito. Configurar tokens de los tres procesos, detener solo el Express de pruebas y compilar/reiniciarlo con LEARNING_BACKEND=java. Resolver EPERM mediante cierre controlado del proceso que mantiene Prisma, no borrando node_modules ni DLL.
5. Verificar: ruta y bloqueo; errores al completar sin aprobar; intento incorrecto/correcto, conteo, feedback y XP; finalización repetida, desbloqueo siguiente; administración y vídeo; informes de líder; simulación nueva y evento aplicado por inbox Java; caída de aprendizaje devuelve 503 sin fallback; frontend a través del mismo /api.
6. Presentar evidencias y solicitar aprobación explícita para cerrar 5B. Solo entonces iniciar 5C.

## Recuperación, límites y siguiente servicio

Las bases de 5A siguen intactas. El puente queda legacy por defecto y no se activó en procesos existentes. No se migran automáticamente los registros del inbox anterior; el logro de simulación se deriva del resumen confirmado para no depender de un mensaje antiguo ya entregado.

La primera activación requiere decidir el contenido inicial Java: el fixture de dos lecciones permite validar, pero no sustituye la carga revisada de los nueve temas existentes antes de aceptación final. Se conserva su fuente TypeScript.

El outbox almacena LeccionCompletada y DesafioRespondido con versión transaccional por usuario. El dispatcher a personas, ProgresoActualizado y snapshots reconstruibles siguen pendientes de integrar con 5C antes de usar proyecciones. Hasta entonces los informes son consultas directas, sin proyección ni consistencia eventual oculta. No se declara cumplida la latencia RNF01 con lotes grandes; el presupuesto de 2,5 segundos del borde y las consultas JDBC por módulo requieren medición en integración/rendimiento.

Tras escrituras Java, volver a legacy requiere conciliación explícita. No se borra ninguna tabla antigua ni se declara aprobada la fase 5 completa.
