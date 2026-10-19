# Evaluación de fase 5C — 19 de octubre de 2026

## Alcance y autorización

El usuario pidió guardar los pendientes de aceptación global y proceder con 5C. Se conservó la autorización de ejecutar pruebas en PostgreSQL y se mantuvo intacto el entorno abierto. El registro transversal está en [PENDIENTES-ACEPTACION-GLOBAL.md](../../PENDIENTES-ACEPTACION-GLOBAL.md).

Se implementó el tercer servicio `personas-capacitacion`: identidad, usuarios y capacitación, cada uno con Application, domain e Infrastructure. Personas es el propietario de las cuentas, roles, tokenVersion, equipos, grupos y miembros. El borde Express mantiene rutas públicas y pasa a delegar esas operaciones solo si PEOPLE_BACKEND=java. No se activó ese modo en el proceso original del usuario.

## Resultados ejecutados

| Bloque | Aprobadas | Fallos/errores | Omitidas |
|---|---:|---:|---:|
| Personas Java sin BD | 37 | 0 | 0 |
| Personas PostgreSQL real | 8 | 0 | 0 |
| Regresión backend Jest, incluidas integraciones PostgreSQL | 56 | 0 | 0 |
| **Pruebas únicas de esta etapa** | **101** | **0** | **0** |

Además se aprobaron **14 comprobaciones de recorrido HTTP real con los tres servicios Java y el borde**. Las ejecuciones repetidas durante el desarrollo no se suman como nuevas pruebas. Las 33 pruebas de aprendizaje, 41 de simulación y diez frontend de 5B tienen su evidencia anterior; no se mezclan como nuevas ejecuciones de 5C. La compatibilidad actual con aprendizaje/simulación se ejercitó en el recorrido completo.

Comandos: Maven `-Ppostgres-it verify`, Jest backend con RUN_DB_TESTS=1 y JSON de resultados; `node scripts/verify-phase5c-e2e.cjs` con credenciales de proceso. TypeScript sin emisión y con emisión a `services/personas-capacitacion/target/backend-build`, ESLint y verificación estructural de contratos aprobados. No se regeneró la DLL Prisma cargada por el proceso original.

La evidencia de las pruebas se extrae de Surefire/Failsafe y JSON Jest en [pruebas.json](pruebas.json). El recorrido y sus escenarios se conservan en [recorrido-http.json](recorrido-http.json).

## Qué se comprobó

- BCrypt de Node compatible con Java y JWT HS256 verificable con el consumidor Node; expiración, otra firma y algoritmo none rechazados. Se valida issuer, audience, versión y cuenta activa. El secreto de personas no se distribuye a simulación, aprendizaje ni al borde para firmar sus tokens.
- Registro público siempre aprendiz; propiedades de rol desconocidas rechazadas; correo/documento duplicados generan conflicto. Hash y tokenVersion no aparecen en el perfil público ni en miembros de grupos.
- Logout, cambio sensible de perfil y desactivación revocan sesiones. Reactivar una cuenta no hace válidos los tokens anteriores. Las dependencias consultan identidad vigente por HTTP, sin caché permisiva.
- El líder solo edita sus aprendices y sus grupos; operaciones ajenas devuelven 404 y roles incorrectos 403. Informes individual y equipo conservan el contrato y verifican pertenencia antes de consultar aprendizaje.
- Asignación concurrente/duplicada produce una sola membresía y un hecho; retirada ausente es idempotente. Eliminar un grupo retira miembros y conserva hechos de retirada.
- Fallo del outbox revierte membresía o desactivación, incluida la versión de token. Los hechos no contienen contraseñas, hashes, correo ni Bearer.
- ArchUnit impide frameworks/adaptadores en negocio, imports de implementaciones de otros servicios y dependencias hacia adaptadores de otra capacidad. Se eliminó el acoplamiento del DTO de empleados al controlador de identidad: cada slice adapta su entrada y comparte el modelo de aplicación/dominio.
- Se completó una lección con desafío y una simulación a través de los tres Java: **156 XP = 50 + 20 + 86**, una simulación y aprobación de la ruta; informes del líder con ese progreso. El evento SimulacionFinalizada quedó entregado y aplicado en el inbox Java.
- El borde arrancó y sirvió el recorrido con DATABASE_URL dirigida deliberadamente a un puerto inaccesible: no hubo conexión ni consultas Prisma en el camino activo de personas Java.
- Caída deliberada de personas: 503 tanto en el borde como en la consulta directa de simulación que depende de identidad, sin fallback legacy. Tras reinicio se conservaron cuenta, tokenVersion=3 y progreso.

## Aislamiento y recuperación

Las IT usaron `sq_test_people_phase5c_20261019`, nueva y propiedad del rol de pruebas. Los recorridos usaron bases nuevas con sufijos phase5c_20261019 y phase5c_final_20261019; cada servicio mantiene su propio historial Flyway. La segunda ejecución del recorrido verifica el código final tras reforzar la separación de adaptadores entre capacidades.

Puertos exclusivos: borde 14400, simulación 14410, aprendizaje 14420 y personas 14430. Los verificadores cierran únicamente los procesos que crean y conservan los fixtures en sus bases exclusivas para inspección. No ejecutan DROP DATABASE, no limpian bases de la aplicación y no activan los nuevos propietarios en los procesos originales.

La configuración por defecto sigue legacy. Tras aceptar escrituras Java, cualquier vuelta a legacy exige conciliación explícita de cuentas, contraseñas, versiones y relaciones; no basta cambiar una variable. No se retiraron tablas ni backend.

## Evaluación y pendientes

El alcance funcional central de 5C pasó las comprobaciones ejecutadas; no se declara aceptado todo el producto. La aplicación ahora dispone de tres servicios Java implementados y verificados en conjunto, conservando el borde temporal.

Permanecen abiertos AG-01 a AG-09 según el registro global. En particular, la carga de los nueve temas, la activación local supervisada, la revisión visual contra los tres servicios, las mediciones RNF y el ciclo operativo no se ejecutaron aquí. Los informes son consultas directas: los outbox de aprendizaje/personas conservan sus hechos, pero dispatcher, ProgresoActualizado, snapshots e inbox de proyecciones siguen en AG-05 antes de depender de esas proyecciones. No se certifica rendimiento de equipos grandes ni ausencia general de defectos.

La fase 5C queda para validación humana; no se inició la fase 6 ni se ejecutaron publicaciones o despliegues.
