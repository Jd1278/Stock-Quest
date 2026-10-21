# Archivo del backend anterior

Archivado el 21 de octubre de 2026 después de validar el gateway independiente y activar los tres propietarios Java. No pertenece a los workspaces npm ni al despliegue activo. Se conservan las implementaciones, pruebas útiles, esquema y migraciones anteriores; archivar estos archivos no elimina sus bases.

## Contenido

- `backend/`: 42 archivos fuente/configuración históricos, incluidas las pruebas existentes. Las carpetas ignoradas `dist`/`node_modules`, si están en el equipo, son residuos de compilaciones antiguas, no componentes activos.
- `scripts/`: verificadores originales de las transiciones 5B/5C/7; sus rutas relativas presuponen la disposición original. No ejecutarlos desde aquí como si fueran verificadores actuales.
- `.github/workflows/ci.yml`: pipeline anterior Node/Prisma con hooks de despliegue, inactivo por estar fuera de `.github/workflows` de la raíz.
- `render.yaml` y `vercel.json`: plantillas anteriores. Las de la raíz se actualizaron para el gateway sin Prisma; ninguna fue publicada en esta entrega.
- `compose.yaml`: aprovisionamiento anterior de una sola base, no el entorno actual de tres propietarios.
- `package-root.json` y `package-lock-root.json`: manifiestos del proyecto antes del archivo, para reproducir o recuperar la distribución anterior.

## Recuperación

El respaldo local adicional `.stockquest-local/migration-activation-20261021/backend-sources.zip` contiene los 42 archivos con rutas originales `backend/...`; cada entrada se verificó contra su SHA-256 antes del traslado. El manifiesto está junto al ZIP. No contiene backups de bases.

La recuperación preferida es corregir o volver a una versión compatible del gateway conservando los propietarios Java. Si se necesita reproducir pruebas históricas, preparar otro directorio, restaurar allí las rutas originales y los manifiestos archivados, revisar credenciales y usar bases exclusivas de prueba. Los imports relativos del seed y de los scripts no se reescribieron: sus fuentes se conservaron exactamente.

No arrancar simultáneamente escritores legacy sobre datos actuales ni usar estos scripts para limpiar bases Java. Cualquier recuperación del repositorio activo debe revisar cambios posteriores y no sobrescribir trabajo del usuario.
