# Versión local de cierre de migración

Fecha: 21 de octubre de 2026. Etiqueta Git: `migracion-local-2026.10.21`.

El usuario aceptó el cierre técnico local y solicitó versionar lo implementado, dejando vídeos y controles RNF pendientes. Esta versión identifica el código y documentación; no exporta ni versiona registros de PostgreSQL.

## Incluye

- Tres propietarios Java y gateway independiente sin persistencia legacy.
- Proyecciones ProgresoActualizado aceptadas, migraciones SQL, contratos y contenido textual compartido.
- Frontend corregido, pruebas útiles, herramientas locales, observabilidad y documentación de las entregas previas.
- Fuentes anteriores archivadas íntegramente en legacy, fuera de los workspaces.
- Evidencias históricas de las ejecuciones, con sus fechas y limitaciones. Un checksum histórico corresponde a aquel instante; la actualización posterior de aceptación no altera retroactivamente la ejecución.

No incluye credenciales, DPAPI, dumps, registros de usuarios, node_modules, dist ni target. Los vídeos propios y nuevos controles RNF no se incorporan en este cierre; su documentación permanece para trazabilidad.

## Verificación y reproducción

La versión se identifica con `git rev-parse migracion-local-2026.10.21^{commit}`. Conservar la etiqueta local hasta acordar su publicación. No se cambian automáticamente las versiones Maven SNAPSHOT ni las versiones npm existentes.

Para reconstruir en otra carpeta: checkout de la etiqueta, JDK 21, Node/npm y dependencias del lockfile; Maven Wrapper por servicio. PostgreSQL y sus credenciales se configuran externamente. La preparación local crea bases nuevas y carga contenido de prueba; no restaura los datos actuales del usuario. Consultar README y los README de servicios. El ensayo completo en checkout limpio continúa pendiente por el espacio disponible y forma parte del próximo cierre de entrega.

En este cierre se repiten las verificaciones estáticas, Node y contratos; las 120 pruebas Java y ocho grupos HTTP de AG-05 conservan su ejecución anterior, sin presentarlos como una nueva ejecución. No hay publicación, despliegue ni certificación de producción.

## Decisiones RNF pendientes

| Requisito | Datos que debemos acordar antes de implementarlo o certificarlo |
|---|---|
| RNF01 Rendimiento | Usuarios simultáneos, volumen de datos, operaciones críticas, percentil/umbral, arranque frío y entorno con conexión de 10 Mbps. |
| RNF02 Usabilidad | Perfil y número de participantes, tareas y medición de aprendizaje inferior a 15 minutos. |
| RNF03 Disponibilidad | Entorno permanente, ventana y fórmula del 99 %, mantenimientos, responsable de alertas, RPO y RTO. |
| RNF04 Seguridad | Campos sensibles, amenazas y alcance de cifrado (aplicación/disco/backups), claves/rotación/recuperación, permisos, conservación y borrado. |
| RNF05 Compatibilidad | Navegadores/versiones, sistemas y dispositivos que se deben soportar, con pruebas de escritorio y móvil. |

RNF06 tiene validación funcional local; su evidencia no equivale a certificar todos los RNF. No se modifican los requisitos originales por excluirlos de esta versión.

## Resultado del versionado

Pasaron 87 pruebas Node (64 gateway y 23 frontend), lint, inventario de 39 operaciones, archivo de 42 fuentes legacy y aislamiento del gateway. Se compararon los bytes del índice Git con los 165 archivos de fuentes/evidencias referenciados; los cambios documentales posteriores se registran por separado de los hashes históricos. Se preservan los espacios de la transcripción original de requisitos sin reescribirla. Véase [registro de comprobaciones](verificaciones/versionado-20261021/resultado.json).
