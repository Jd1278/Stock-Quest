# Eliminación de lecciones y desafíos

Extensión solicitada por el usuario durante la revisión de fase 6. Al seleccionar una lección o un desafío, aparece el mismo botón rojo de eliminación con confirmación, título o pregunta del registro, cancelación, bloqueo durante la solicitud y recarga tras el éxito. La selección se conserva ante error. El mensaje de lección utiliza el género correcto y la confirmación de desafíos incluye su pregunta.

## Reglas y contratos

- `DELETE /api/admin/lessons/{id}` elimina una lección sin uso con sus vídeos y desafíos. Conserva el módulo y las demás lecciones. El progreso o los intentos de sus desafíos impiden la eliminación y revierten toda la transacción, incluidos los desafíos eliminados antes de detectar un conflicto de progreso.
- `DELETE /api/admin/challenges/{id}` elimina un desafío sin intentos y conserva su lección y módulo. Si tiene intentos registrados devuelve conflicto y mantiene el historial.
- Ambos requieren GESTOR_PEDAGOGICO: 401 sin sesión, 403 para otros roles, 404 inexistente, 409 con historial y 204 sin cuerpo al eliminar. Están implementados en el propietario Java y en el modo legacy, con sus guardas de propiedad.
- Una lección/desafío no dispone de Publicado individual. Para retirar del catálogo material utilizado se puede despublicar su módulo, conservando datos. No se permite borrar intentos o progreso para forzar la eliminación.

Se incorporan métodos a los puertos/casos de uso existentes y adaptadores de las capacidades de contenidos/evaluaciones. No se añaden dependencias de frameworks al dominio ni consultas entre bases. No cambia el esquema; se conservan las FK RESTRICT y transacciones existentes. El contrato estructural contiene ahora **39 operaciones**.

## Resultados ejecutados

| Bloque | Aprobadas | Fallos/errores/omitidas |
|---|---:|---|
| Aprendizaje Java sin BD | 29 | 0/0/0 |
| Aprendizaje PostgreSQL real | 15 | 0/0/0 |
| Backend, incluidas integraciones PostgreSQL legacy | 72 | 0/0/0 |
| Frontend | 23 | 0/0/0 |
| **Total único de esta ejecución** | **139** | **0/0/0** |

TypeScript frontend/backend, ESLint, sintaxis del verificador, inventario de contratos y `git diff --check` aprobados. Las suites de simulación/personas no se repitieron: su evidencia previa no se suma como nueva. Se conserva la regresión completa del área afectada y las pruebas de arquitectura de aprendizaje.

Las pruebas abarcan los cuatro tipos de registro del editor: confirmación, cancelación, actualización del catálogo, texto del aviso y selección conservada ante conflicto. Las IT de lecciones/desafíos verifican eliminación sin uso, repetición con 404, progreso, intentos, rollback de desafíos/vídeos y conservación del módulo y de otras lecciones. El primer intento de pruebas frontend detectó una opción `exact` no válida en el nuevo test de Testing Library; se corrigió y se repitieron todas las pruebas y los chequeos estáticos. No fue un fallo de la aplicación y no se declara aprobado ese intento inicial.

El verificador `scripts/verify-admin-deletion.cjs` se amplió y aprobó **diez grupos HTTP con los servicios reales**, incluidos ambos nuevos endpoints a través del proxy del frontend, permisos, conflictos y conservación de padres/historial. Los fixtures creados en esa ejecución se retiraron por sus IDs; se conservaron el contenido y los datos anteriores.

Evidencias: [eliminacion-lecciones-pruebas.json](eliminacion-lecciones-pruebas.json) y [eliminacion-lecciones-recorrido-http.json](eliminacion-lecciones-recorrido-http.json).

El entorno de fase 6 se reinició con el nuevo JAR de aprendizaje y quedó disponible en http://127.0.0.1:5174. No se cambiaron contraseñas ni se borraron datos existentes. Falta la confirmación visual del usuario; no se cierra fase 6 ni se inicia fase 7.
