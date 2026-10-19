# Fase 5C — Personas y capacitación

El usuario autorizó avanzar a 5C guardando los pendientes globales. El registro de referencia es [PENDIENTES-ACEPTACION-GLOBAL.md](PENDIENTES-ACEPTACION-GLOBAL.md); el avance no declara cumplidos esos puntos.

## Entrega

Se incorpora services/personas-capacitacion como tercer servicio Java, con identidad, usuarios y capacitación. Cada capacidad tiene Application, domain e Infrastructure. Se conservan las rutas públicas y se añade PEOPLE_BACKEND=legacy|java al borde; permanece legacy por defecto. El modo Java exige aprendizaje y simulación Java, delega la identidad por HTTP y evita la conexión Prisma durante el arranque del borde.

La base propia contiene usuarios, grupos, miembros y outbox/versiones; no tiene FK a aprendizaje/simulación. No se copian automáticamente cuentas ni datos anteriores. Autenticación usa BCrypt y Spring Security/Nimbus JWT, con versión de token consultada en la cuenta vigente en cada solicitud. Los demás servicios resuelven identidad mediante `/api/auth/me`, cuyo nuevo destino Java no depende del borde.

Los cambios sensibles de perfil, logout y desactivación revocan sesiones. La pertenencia a equipos y grupos se comprueba en personas. Los informes consultan aprendizaje por lotes autorizados, sin SQL remoto ni fallback a datos anteriores. Los hechos de miembros y desactivación se guardan junto a sus cambios en una transacción.

## Alcance y recuperación

No se activó el nuevo propietario en los procesos originales. La validación utiliza bases/puertos exclusivos; los pendientes de contenido completo, activación supervisada, UI, carga y proyecciones permanecen abiertos en el registro global. No se retira backend ni se ejecutan releases, publicaciones o despliegues.

Antes del cambio se conserva PEOPLE_BACKEND=legacy. Después de aceptar escrituras Java se debe reconciliar cualquier vuelta al propietario anterior; no hay sincronización implícita. El aprovisionamiento de gestores/líderes y el inicio de sesión al cambiar de identidad se revisan durante la activación.

## Validación

La revisión posterior identificó y corrigió consultas anidadas de grupos, pérdida de correlación en Express y normalización de nombres antes de validar. La ejecución posterior aprobó 49 pruebas Java (incluidas nueve PostgreSQL) y 59 backend. Detalle y límites: [CORRECCIONES.md](verificaciones/fase5c-20261019/CORRECCIONES.md). Los resultados siguientes corresponden a la entrega original.

Resultados y evaluación: [verificaciones/fase5c-20261019/RESULTADOS.md](verificaciones/fase5c-20261019/RESULTADOS.md). Se ejecutaron 37 pruebas Java sin BD, ocho IT PostgreSQL y 56 del backend, sin fallos ni omisiones; además, 14 comprobaciones de recorrido con los tres servicios Java en bases/puertos exclusivos. La comprobación de arquitectura también impide imports hacia adaptadores de otra capacidad. No se declara cerrada la fase 5C hasta revisar las evidencias y recibir validación humana. La fase 6 no se inicia automáticamente.
