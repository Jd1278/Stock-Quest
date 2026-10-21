# Fase 7 — Evaluación de aceptación y retirada controlada

Nota de vigencia: este documento conserva el cierre del 19 de octubre de 2026. Las instalaciones, métricas y publicación temporal posteriores se resumen en [ESTADO-ACTUAL.md](ESTADO-ACTUAL.md); los pendientes operativos descritos aquí corresponden a la fecha del cierre, no a una consulta del entorno actual.

Estado: **fase 7 cerrada en su alcance funcional local y validada expresamente por el usuario el 19 de octubre de 2026 (America/Bogota)**. Las brechas documentadas permanecen abiertas. No es una certificación de producción ni declara todos los requisitos cumplidos. Los vídeos continúan como pendiente explícito por decisión del usuario.

## Entrega

- Se contrastó el documento `Stock_Quest.docx` con la implementación: 20 requisitos funcionales y seis no funcionales, con SHA-256 del documento y trazabilidad a fuentes/pruebas.
- La [matriz de aceptación](MATRIZ-ACEPTACION-FASE-7.md) distingue validación local, cumplimiento parcial y pendiente. El [informe de pruebas](verificaciones/fase7-20261019/RESULTADOS.md) conserva los resultados ejecutados.
- Se actualizó la [arquitectura actual](ARQUITECTURA-ACTUAL.md): tres servicios, ocho capacidades, bases independientes y alcance exacto del borde Express.
- Se retiró del recorrido local una dependencia innecesaria: simulación entrega `SimulacionFinalizada` directamente a aprendizaje. Con Express detenido se verificó entrega, deduplicación y recuperación consistente. El puente anterior se mantiene como compatibilidad, no se borra.
- Se preparó un [plan de retirada](PLAN-RETIRADA-LEGACY.md) con inventario de dependencias, puertas y recuperación. Eliminar toda la carpeta backend rompería `/api`, composición, validación y imports compartidos; no se hizo esa eliminación.
- Se preparó un respaldo local de fuentes, con archivos nuevos incluidos y checksum. No incluye secretos ni bases de datos. Antes de cualquier retirada de datos sería necesario un respaldo/restauración de BD independiente.

## Resultado frente a requisitos

| Grupo | Validado localmente | Parcial | Pendiente |
|---|---:|---:|---:|
| RF01–RF20 | 19 | 1 | 0 |
| RNF01–RNF06 | 1 | 3 | 2 |

No se equipara cantidad de pruebas con porcentaje de aceptación. Los RF funcionales tienen evidencia de implementación, suites y recorridos; RF11 continúa parcial por los vídeos no suministrados. Los RNF deben evaluarse según sus condiciones exactas del documento.

| Pendiente | Estado y condición para cierre |
|---|---|
| Vídeos de RF11 | El usuario aceptó mantenerlos pendientes. Soporte YouTube y texto implementados; no se inventan enlaces ni se declara validada la reproducción del canal |
| RNF01: máximo 3 s a 10 Mbps | Muestra local API aprobada; falta carga/renderizado completo, red limitada, inicio frío y escala acordada |
| RNF02: aprendizaje menor de 15 min | Flujos validados manualmente; no hay evaluación cronometrada de usabilidad |
| RNF03: disponibilidad del 99 % | Sin ventana de observación, monitorización ni operación de producción que acrediten esa cifra |
| RNF04: contraseñas y datos sensibles protegidos | BCrypt, JWT, permisos y DPAPI local comprobados. Correo/documento/teléfono no tienen cifrado de aplicación; no se certificó cifrado de disco/backups. Requiere definir los campos sensibles y su solución antes de aprobar este requisito completo |
| RNF05: navegadores y móvil | La validación manual local no sustituye Chrome/Edge/Firefox/Safari y dispositivos móviles |
| Proyecciones de personas, AG-05 | No están implementadas ni se utilizan. Los informes consultan por HTTP. Su entrega/snapshots/replay deben aceptarse antes de activar ese diseño; no se dan por realizados por avanzar de fase |
| Retirada física de legacy | Preparada como plan; depende de separar el gateway de Prisma y aprobar los recursos exactos. No se borraron componentes ni datos |
| Operación supervisada | Jenkins, publicación GitHub, CloudFormation y Grafana continúan pendientes. No se ejecutaron releases, push, despliegues o infraestructura externa |

## Validación recibida y cierre aceptado

El usuario validó en la aplicación local los flujos de aprendiz, líder y gestor, incluidos los arreglos del simulador y del contraste, así como la gestión y eliminación protegida de los cuatro tipos de contenido. Autorizó pasar a fase 7. Esa aceptación funcional no constituye aceptación automática de los RNF pendientes ni autorización para borrar bases que ahora contienen progreso registrado.

El usuario confirmó el cierre mediante «Si valido el cierre», en respuesta a la solicitud de aceptar **el funcionamiento local demostrado**, manteniendo los pendientes abiertos y sin considerarlo una liberación para producción. Se registra así la aceptación funcional local de esta entrega. La liberación para producción y la retirada definitiva exigen sus puertas por separado; no son consecuencias automáticas del cierre local.

El entorno Java permanece en http://127.0.0.1:5174 y usa sus mismas cuentas y bases. Se puede repetir la verificación con `scripts/verify-phase7.ps1` y las credenciales de pruebas en variables de proceso. El script detiene únicamente este entorno cuando está activo y lo restaura al terminar; no limpia bases ni ejecuta migraciones destructivas.
