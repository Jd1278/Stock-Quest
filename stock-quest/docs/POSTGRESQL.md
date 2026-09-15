# Adaptación y verificación PostgreSQL

Fecha: 15 de septiembre de 2026.

## Cambios

- Prisma: proveedor PostgreSQL, engineType client y adaptador @prisma/adapter-pg 6.19.
- Cliente compartido de conexión para API, seed, diagnóstico y migraciones. Node.js/pg evita el proveedor TLS nativo de Windows. La conexión Render externa se verificó con TLS activo y validación de certificado.
- Migración inicial PostgreSQL generada desde Prisma, con enum Role, JSONB, índices y claves foráneas. No se reutiliza el SQL MySQL.
- Runner de migraciones con transacción, bloqueo asesor e historial Prisma con checksums. Repetirlo sin cambios no vuelve a aplicar la migración.
- Docker y GitHub Actions usan PostgreSQL 16. Los contratos HTTP y las pantallas React no cambiaron.
- Credenciales guardadas únicamente en archivos .env privados, excluidos de Git y del ZIP.

## Resultados

| Comprobación | Resultado |
|---|---|
| Conexión a PostgreSQL Render | Correcta, TLS activo, certificado validado |
| Esquema de aplicación inicial | Estaba vacío; migración aplicada |
| Seed | Nueve módulos, nueve lecciones, nueve desafíos, dos escenarios y cuentas privilegiadas configuradas |
| Repetición de migraciones | Sin cambios pendientes |
| Compilación API / TypeScript | Correcta |
| Compilación frontend / TypeScript | Correcta; advertencia conocida por tamaño del chunk Phaser |
| ESLint | Correcto |
| Pruebas unitarias backend | 18 aprobadas |
| Pruebas frontend | 10 aprobadas |
| Integración PostgreSQL real | 6 aprobadas |

Total: 34 pruebas. La integración se ejecutó en un esquema temporal exclusivo en Render y se retiró al finalizar. Verificó registro/login, hash y perfil, aprendizaje secuencial, persistencia e idempotencia, decisiones simultáneas, snapshot, permisos y revocación de sesión. El límite por test se ajustó a 30 segundos para el conjunto de múltiples consultas a una base remota; no altera los límites de la aplicación.

## Estado y límites

La configuración activa del backend utiliza PostgreSQL. La API local se inicia en el puerto 4000 y la vista previa en el 5173. Se conserva la base MySQL anterior sin borrar ni transferir sus registros. Los usuarios registrados allí deben migrarse mediante un proceso de datos separado si se quieren conservar en PostgreSQL.

El backend no está publicado en Render todavía; lo que está alojado y conectado es la base PostgreSQL. Tampoco se ejecutó GitHub Actions ni una nueva matriz de navegadores o medición de carga a 10 Mbps.

`VERIFICACION.md` documenta la entrega MySQL original; este documento registra la verificación vigente tras la adaptación.
