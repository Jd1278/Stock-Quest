# Pendientes de aceptación global

Registro creado por solicitud del usuario al autorizar la fase 5C. La aprobación de avanzar no declara cumplidos estos pendientes ni autoriza eliminar datos, publicar o desplegar. Se conserva la evaluación de 5B en `verificaciones/fase5b-20261019/RESULTADOS.md`.

| ID | Pendiente | Etapa | Evidencia para cerrar | Estado |
|---|---|---|---|---|
| AG-01 | Carga revisada de los nueve temas formativos existentes, vídeos disponibles y escenarios de producto | 6–7 | Inventario de contenido, carga explícita y recorrido de la ruta completa | Pendiente |
| AG-02 | Activación supervisada de los propietarios Java en el entorno local del usuario | 6 | Configuración sin secretos, bases independientes, escritores únicos y recuperación ensayada | Pendiente; pruebas previas usaron puertos/bases aislados |
| AG-03 | Recorrido visual completo aprendiz/gestor/líder en React/Phaser contra todos los servicios Java | 6–7 | Sesiones, formularios, decisiones, progreso, administración y reportes en interfaz | Pendiente; API y pruebas de componentes no sustituyen recorrido visual |
| AG-04 | Latencia, carga y concurrencia con currículos y equipos representativos | 6 | Mediciones repetibles y comparación con RNF01; revisar consultas por módulo/lección y llamadas por usuario | Pendiente |
| AG-05 | Integración de hechos de aprendizaje con personas: entrega, deduplicación, ProgresoActualizado y reconstrucción por snapshots antes de depender de proyecciones | 5C–6 | Outbox/inbox, reintentos, replay, versiones, recuperación y pruebas | Pendiente; los informes usan consultas directas hasta aceptación de proyecciones |
| AG-06 | Tercer servicio Java: identidad, usuarios y capacitación | 5C | Autenticación/revocación, permisos, grupos e informes con base propia | Implementado y verificado en aislamiento; pendiente de validación humana de 5C |
| AG-07 | Regresión y trazabilidad completas frente a requisitos y contratos | 7 | Matriz RF/RNF → cambios → pruebas ejecutadas, brechas documentadas y aceptación humana | Pendiente |
| AG-08 | Retirada controlada del código/tablas legacy sustituidos | 7 | Tráfico Java aceptado, respaldo, plan de recuperación y aprobación explícita antes de retirada | Pendiente; no borrar backend todavía |
| AG-09 | Ciclo operativo Maven/JUnit, Jenkins, GitHub, AWS CloudFormation y Grafana | Etapa operativa supervisada | Pipeline revisado y ejecutado por el usuario, infraestructura y monitorización verificadas | Pendiente; sin publicación/despliegue autorizado en esta entrega |

Se actualizará cada fila con resultados reales. Un HTTP 503 durante una prueba deliberada de caída es un resultado esperado; un 503 inesperado en operación se investiga como incidencia.
