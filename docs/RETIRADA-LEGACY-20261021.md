# Activación del gateway y archivo del backend anterior

**Actualización posterior:** este documento fue validado expresamente por el usuario y se procedió con AG-05. Las proyecciones ya están implementadas y activas; véase [el resultado actual](AG05-PROYECCIONES-20261021.md). Los apartados inferiores conservan la situación de esta entrega anterior.

21 de octubre de 2026. El usuario validó expresamente el bloque de separación del gateway y autorizó continuar. Jenkins y el ciclo operativo permanecen pausados. Este bloque activa la entrada nueva y retira el backend anterior de la instalación/ejecución habitual; no declara implementadas las proyecciones pendientes de AG-05.

## Cambios realizados

- Reinicio controlado del supervisor; `edgeEntrypoint` ahora indica `gateway/src/server.ts`. La salud conserva `{status: ok}` y añade la cabecera `X-StockQuest-Gateway: java-services`.
- El proceso del gateway comprueba en su arranque que no se cargaron archivos legacy ni drivers SQL. Personas, aprendizaje y simulación siguen siendo los únicos propietarios de sus bases.
- Las 42 fuentes del backend anterior, incluidas sus pruebas y migraciones, se trasladaron a `legacy/backend`. Se compararon los checksums de cada archivo antes y después y se verificó cada entrada del ZIP adicional. No se descartaron modificaciones locales del backend.
- Workspaces activos: únicamente `frontend` y `gateway`. Se retiraron comandos de escritura/arranque legacy y paquetes Prisma del lockfile. pg/bcrypt permanecen como herramientas de desarrollo para aprovisionamiento y pruebas, no para el gateway.
- Los verificadores históricos se archivaron; el verificador actual de fase 7 usa gateway y Java. La auditoría conserva las referencias históricas mediante un mapa a `legacy/` y escribe evidencias nuevas, sin reemplazar el cierre del 19 de octubre.
- Las plantillas raíz Vercel/Render usan el gateway sin Prisma; las anteriores quedaron archivadas. El workflow existente solo verifica Node/frontend, sin migraciones ni hooks antiguos. No se ejecutó ese workflow ni se publicó infraestructura.
- Proxy de desarrollo local dirigido a 14600; confianza del proxy local limitada a loopback. El destino de eventos sigue siendo el Java de aprendizaje.

## Comprobaciones ejecutadas

| Verificación | Resultado |
|---|---|
| Datos y sesiones durante el reinicio | Nueve snapshots de perfiles, progreso, currículo, historial, informes, grupos y panel sin cambios; sesiones anteriores válidas |
| Disponibilidad local | Gateway, proxy frontend y tres readiness Java correctos |
| Build npm completo | Gateway y frontend aprobados; advertencia de tamaño del chunk Phaser, sin fallo de build |
| Pruebas npm | 87 aprobadas: 64 gateway y 23 frontend |
| Lint | Aprobado en frontend/gateway |
| Aislamiento | Carga del gateway y del adaptador serverless con módulos SQL/Prisma bloqueados; cero imports legacy |
| Archivo y configuración | 42 fuentes con checksum coincidente; cero Prisma, workspace anterior o comandos de escritura legacy en la instalación activa |
| Inventario contractual | 39 operaciones, 32 rutas, 107 referencias resueltas; comprobación estructural, no validación semántica completa de OpenAPI |
| Eliminaciones HTTP reales | Diez grupos aprobados: permisos, conflictos con historial, borrado de contenido sin uso y conservación de registros existentes |
| Eventos con gateway detenido | Cuatro grupos aprobados: entrega Java → Java, replay idempotente y recuperación del borde/progreso |
| Inventario de arquitectura y requisitos | Tres servicios, ocho capacidades y sus capas; 26 requisitos trazados. Las brechas históricas permanecen abiertas |

Las pruebas Java/Maven no se reejecutaron en este bloque; no cambiaron fuentes Java. Los 232 tests históricos del 19 de octubre y los 106 Java posteriores no se presentan como nuevas ejecuciones ni se suman a las 87 pruebas actuales. No se hizo aquí un recorrido visual manual completo de todos los roles.

Las comprobaciones SQL de estos verificadores usan los roles separados del entorno preparado. Las escrituras se limitan a fixtures nuevos y la limpieza usa sus identificadores exactos. No se ejecutaron DROP/TRUNCATE, reset, migraciones nuevas ni eliminación de bases/progreso del usuario.

## Publicación temporal

La salud local y la del proxy frontend devolvieron HTTP 200 y la cabecera del gateway nuevo. En la misma comprobación, el dominio anterior `joins-basically-britannica-salvador.trycloudflare.com` produjo ENOTFOUND y la API pública Vercel devolvió HTTP 502. No se cambió ni republicó Vercel, ni se reinició Cloudflared en este bloque. La conexión temporal requiere recuperación antes de otra presentación; no se atribuye a un fallo de rutas locales.

## Recuperación y evidencias

- Fuentes anteriores versionables: [legacy/README.md](../legacy/README.md) y `legacy/source-manifest.json`.
- Copia adicional local: `.stockquest-local/migration-activation-20261021/backend-sources.zip`, 42 entradas verificadas, junto con el manifiesto y los archivos raíz anteriores. No es un backup de bases.
- [Resultados y evidencia](verificaciones/retirada-legacy-20261021/RESULTADOS.md).
- Verificación repetible: `node scripts/verify-legacy-retirement.cjs`, `node scripts/verify-gateway-isolation.cjs`, `node contracts/validar-inventario.cjs`, `npm test`, `npm run build` y `npm run lint`.

La recuperación preferida es otra versión compatible del gateway manteniendo los tres escritores Java. Para reproducir el backend antiguo, restaurar fuentes y manifiestos en otro directorio y usar bases de prueba. No sustituir los propietarios actuales por escritores legacy ni sobrescribir trabajo posterior.

## Pendiente para continuar

Validación humana del resultado de activación/archivo. Después sigue AG-05/DEV-03: despacho de hechos de aprendizaje, recepción idempotente y proyecciones de progreso en personas con versiones y reconstrucción. Actualmente los informes siguen usando HTTP y funcionan; esa evolución aún no está implementada. El cierre de migración, versionado y las brechas funcionales/RNF conservan su trazabilidad y no se confunden con la publicación permanente.
