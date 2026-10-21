# Cierre de migración: separación del gateway

Estado histórico de preparación; el usuario validó este bloque y después se activó el gateway y se archivó legacy. Consultar [el resultado posterior](RETIRADA-LEGACY-20261021.md).

Fecha: 21 de octubre de 2026. El usuario solicitó pausar Jenkins/ciclo operativo y retomar la migración. Este bloque resuelve la dependencia del borde respecto de Prisma y las ramas de negocio anteriores. No declara finalizada toda la migración.

## Resultado preparado

Se añadió `gateway/`, ejecutable separado con Application/domain/Infrastructure. Conserva las 39 operaciones de `/api`, delega identidad en personas y enruta aprendizaje y simulación a sus propietarios Java. La composición del panel del gestor usa un puerto HTTP; no consulta tablas. No hay fallback a legacy ni requisito de DATABASE_URL/JWT_SECRET.

El supervisor actualizado lanza `gateway/src/server.ts` y limita las variables entregadas al borde a orígenes/tokens HTTP y variables del sistema. Los scripts npm habituales construyen y prueban gateway/frontend; el backend anterior queda en comandos `dev:legacy`, `build:legacy`, `test:legacy`. Sus pruebas útiles y migraciones se conservan mientras se valida la retirada.

**Situación de activación:** el supervisor que ya estaba abierto sigue ejecutando la entrada anterior. No fue reiniciado ni se cambió la publicación Vercel. El gateway nuevo se verificó contra Java en un puerto efímero. Después de la aceptación de este bloque hay que reiniciar el supervisor completo de forma controlada y verificar los recorridos públicos antes de archivar código anterior. Reiniciar solo `edge` mediante el supervisor antiguo vuelve a usar el lanzador antiguo.

## Verificación

| Comprobación | Resultado de esta ejecución |
|---|---|
| Build TypeScript del gateway | Aprobado; sin generación Prisma |
| Pruebas del gateway | 64 aprobadas, incluidas 39 operaciones de enrutamiento frente al inventario OpenAPI |
| Aislamiento del ejecutable | Aprobado: carga con Prisma/pg/bcrypt/jsonwebtoken bloqueados; cero imports del backend anterior |
| Inventario estructural | Aprobado: 39 operaciones, 32 rutas, 14 modelos históricos con propietario, 7 eventos, 107 referencias locales |
| Comparación HTTP con Java real | Aprobada para lecturas del aprendiz, líder y gestor, incluidos informes, grupos y panel administrativo |
| Flujo real con fixtures nuevos | Registro/login, escenario de tres días, resultado 86/18, recuperación, rechazo 409 y logout/revocación 401 aprobados |
| Evento Java → aprendizaje | Un inbox y un logro, progreso con 86 XP y una simulación; aprobado tras esperar la entrega asíncrona |
| Lint | Aprobado para backend, frontend y gateway |

La comprobación estructural no valida toda la semántica OpenAPI. Las pruebas de enrutamiento usan servicios simulados; la integración separada usa los Java reales y PostgreSQL. No se repitió aquí toda la regresión Maven ni una prueba visual completa. Las fechas de creación se comparan teniendo en cuenta la precisión de PostgreSQL en microsegundos frente a la respuesta inmediata Java en nanosegundos; los demás campos persistidos deben coincidir.

Evidencias reproducibles:

```powershell
npm.cmd run build -w @stock-quest/gateway
npm.cmd test
npm.cmd run lint
node scripts/verify-gateway-isolation.cjs
node contracts/validar-inventario.cjs
node scripts/verify-java-gateway.cjs
```

El último comando conserva el resultado sin credenciales en `.stockquest-local/java-gateway-verification.json`. La evidencia compartible de este bloque está en [verificaciones/migracion-gateway-20261021](verificaciones/migracion-gateway-20261021/RESULTADOS.md).

## Recuperación y conservación

Se respaldaron los archivos de configuración/documentación previos a este bloque en `.stockquest-local/migration-gateway-20261021`, con inventario y SHA-256. Es un respaldo de estos archivos, no de todo el repositorio ni de bases de datos. No se hicieron DROP/TRUNCATE, cambios de propietario o migraciones de esquemas. Se conservan los datos de validación del usuario. Los fixtures creados por el verificador se limpian por UUID/identificadores exactos.

Antes de activar, registrar los PID/estado y comprobar health de los tres Java. Después de la validación humana, parar/iniciar únicamente el entorno de `local-java.cjs`, manteniendo el perfil de observabilidad usado. Si el nuevo borde falla, detener ese entorno, restaurar solo el lanzador anterior desde el respaldo revisado y arrancar los mismos propietarios Java; no volver a escritores legacy ni restaurar bases antiguas. No sobrescribir cambios posteriores al respaldo.

## Puertas siguientes

1. Validación expresa de este bloque por el usuario.
2. Activar el gateway nuevo, comprobar interfaz y API pública/local y confirmar que no se carga Prisma en el proceso activo.
3. Archivar/retirar implementaciones anteriores por capacidad, conservando recuperación y pruebas útiles. Separar también comandos y documentación históricos; no borrar bases automáticamente.
4. Resolver AG-05/DEV-03: las proyecciones de personas previstas siguen pendientes. Los informes actuales usan HTTP; no se sustituyeron silenciosamente por proyecciones ni se canceló su diseño.
5. Consolidar la regresión y el cierre de migración. Videos pendientes, controles RNF, Jenkins, release y operación mantienen su alcance y sus aceptaciones separadas.
