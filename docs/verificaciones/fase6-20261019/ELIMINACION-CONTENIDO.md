# Eliminación de módulos y escenarios

El usuario pidió añadir esta función durante la validación visual de fase 6, tras confirmar el contraste de los botones Crear.

## Comportamiento

Al seleccionar un módulo o escenario, el gestor dispone de un botón rojo Eliminar al final del formulario. Requiere confirmación con el título del registro, permite cancelar y bloquea envíos mientras procesa. Tras el éxito, limpia la selección y recarga el catálogo; ante conflicto conserva la selección y muestra el motivo.

- Un módulo sin intentos ni progreso se elimina con sus lecciones, vídeos y desafíos. La operación se realiza dentro de una transacción. Si cualquier relación protege actividad, se revierte todo, incluso los desafíos que se hubieran eliminado antes de comprobar el progreso.
- Un escenario solo se elimina si no tiene partidas. Partidas en curso, finalizadas y sus resultados quedan protegidos por claves foráneas RESTRICT.
- Si el registro tiene uso, la API devuelve 409. Para retirarlo del catálogo se debe desmarcar Publicado en lugar de borrar el historial. No se añadió eliminación de usuarios, partidas ni resultados.
- Solo GESTOR_PEDAGOGICO puede ejecutar DELETE; sin sesión se obtiene 401, otro rol 403, registro inexistente 404 y éxito 204 sin cuerpo. Se conserva la misma protección en Java y legacy.

Se añadieron `DELETE /api/admin/modules/{id}` y `DELETE /api/admin/scenarios/{id}` al borde y a sus propietarios Java, mediante casos de uso y puertos de las capacidades existentes. El contrato público pasa a 37 operaciones; la propiedad de datos no cambia. No requiere migraciones: se aprovechan las relaciones restrictivas existentes.

## Verificación ejecutada

| Bloque | Aprobadas |
|---|---:|
| Aprendizaje Java sin BD | 28 |
| Aprendizaje PostgreSQL | 10 |
| Simulación Java sin BD | 37 |
| Simulación PostgreSQL | 7 |
| Backend, incluidas integraciones PostgreSQL legacy | 65 |
| Frontend | 15 |
| **Total único de suites** | **162** |

Sin fallos, errores ni omisiones. TypeScript frontend/backend, ESLint, inventario de contratos, sintaxis del verificador y `git diff --check` aprobaron. No se mezclan estos totales con ejecuciones anteriores de las mismas pruebas. La suite legacy específica se repitió tras reforzar las guardas de limpieza de fixtures; sus cuatro pruebas no se suman otra vez.

Las comprobaciones cubren confirmación/cancelación, ambos tipos de registro, visualización del conflicto, permisos de gestor, eliminación con hijos, intentos y progreso que impiden borrar, rollback que restaura desafíos y contenido, escenario con partida y repetición con 404.

Además, `node scripts/verify-admin-deletion.cjs` aprobó **seis grupos HTTP con los servicios reales**, incluidos el proxy frontend, ambos conflictos de aprendizaje y una partida que permaneció legible tras rechazar la eliminación de su escenario. Solo crea y retira sus propios fixtures; al terminar se conservaron las cantidades iniciales del catálogo y los datos anteriores. La limpieza SQL del verificador está limitada por IDs creados en la ejecución, nunca por títulos o filtros abiertos.

Evidencias: [eliminacion-pruebas.json](eliminacion-pruebas.json) y [eliminacion-recorrido-http.json](eliminacion-recorrido-http.json).

El entorno local se detuvo durante la construcción de los dos JAR y se reinició con los cambios. Continúa disponible en http://127.0.0.1:5174 con sus cuentas y datos. La confirmación visual de los nuevos botones corresponde al usuario; las pruebas de interfaz utilizan jsdom y no sustituyen esa comprobación. La fase 6 sigue abierta y no se inicia fase 7.
