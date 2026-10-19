# Correcciones de la revisión de fase 5C

Fecha: 19 de octubre de 2026. El usuario autorizó corregir los tres hallazgos de la revisión; esta entrega no inicia la fase 6.

| Hallazgo | Corrección | Verificación ejecutada |
|---|---|---|
| Consultas JDBC anidadas y una consulta de miembros por grupo | Se cierra la consulta de grupos antes de consultar miembros. El listado carga todos los miembros del líder en una segunda consulta, independientemente del número de grupos. La lectura con bloqueo conserva la transacción del llamador y consulta miembros después de cerrar su primer resultado. | Nueva IT contra PostgreSQL con Hikari limitado a una conexión: listado con miembros, grupo vacío, aislamiento entre líderes y lectura del grupo propio. |
| Pérdida de correlación en el borde Express | El borde conserva un identificador válido o genera un UUID; lo envía tanto en la consulta de identidad como en la operación de personas y lo devuelve al cliente, también ante errores. CORS permite enviar y leer el encabezado. | Tres pruebas nuevas de recorrido Express con HTTP simulado: identificador recibido y respuesta 204, sustitución de identificador inválido y error 503, login público con identificador generado y encabezados CORS. |
| Longitud del nombre de grupo validada antes de normalizar | El DTO de creación y renombrado elimina espacios exteriores antes de Bean Validation, conservando la normalización anterior. | Tres pruebas HTTP nuevas: creación y renombrado con 100 caracteres más espacios exteriores; rechazo de nombres vacíos o con 101 caracteres efectivos. |

## Resultados de esta ejecución

- Maven `-Ppostgres-it verify`: **40 pruebas Java sin BD y 9 IT PostgreSQL aprobadas**, sin fallos, errores ni omisiones; JAR actualizado.
- Jest backend con `RUN_DB_TESTS=1`: **59 pruebas aprobadas**, nueve suites, sin fallos ni omisiones.
- **108 pruebas únicas en esta ejecución**; incluye siete pruebas nuevas respecto de las 101 anteriores.
- TypeScript `tsc -p backend/tsconfig.json --noEmit`, `npm.cmd run lint` y `git diff --check`: aprobados.
- Evidencia extraída de Surefire/Failsafe y JSON Jest: [correcciones-pruebas.json](correcciones-pruebas.json).

Las IT utilizaron las bases exclusivas ya preparadas `sq_test_people_phase5c_20261019` y `sq_test_backend_phase5b_20261019`. Sus fixtures nuevos se retiran al terminar; no se cambió la configuración de los procesos originales ni se borraron bases. Las credenciales solo se proporcionaron al proceso de pruebas.

Las 14 comprobaciones E2E anteriores mantienen su evidencia histórica y no se cuentan como nuevas ejecuciones. La prueba de una conexión cubre el defecto de adquisición anidada; no sustituye las mediciones de carga representativa de AG-04. La correlación corregida cubre Express hacia personas; no certifica trazabilidad distribuida completa de todos los adaptadores existentes. Los demás pendientes de aceptación global se mantienen abiertos.

Recuperación: los cambios no requieren migración de esquema. Se pueden revertir los archivos de esta corrección conservando los datos; no debe sustituirse código de un proceso activo sin la activación supervisada acordada. Queda pendiente la validación expresa del usuario.
