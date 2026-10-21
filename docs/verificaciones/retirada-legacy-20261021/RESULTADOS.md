# Activación y retirada — resultados

21 de octubre de 2026. El usuario validó el bloque previo de separación.

- Gateway independiente activo y nueve snapshots de datos sin cambios.
- Backend anterior archivado; 42 fuentes verificadas antes/después.
- Build gateway/frontend y lint aprobados. Advertencia de tamaño del bundle Phaser, sin fallo.
- npm test: 87 aprobadas (64 gateway, 23 frontend).
- Integración real: 11 grupos de flujo/permisos, 10 de eliminación protegida y 4 de entrega directa/recuperación aprobados. No se suman como pruebas unitarias únicas.
- Aislamiento, archivo, inventario contractual y trazabilidad de tres servicios/ocho capacidades aprobados. No se reejecutó Maven ni se certificaron todos los RNF.
- Local y proxy frontend: HTTP 200; túnel anterior: ENOTFOUND; API Vercel: HTTP 502. No hubo republicación externa.

[Resumen verificable y checksums](evidencia.json), [activación](activation.json), [integración](integration.json), [eliminaciones](deletion.json), [eventos sin gateway](events.json), [salud](health.json). La auditoría del inventario arquitectónico se conserva en auditoria.json; sus 232 pruebas se identifican como históricas del 19 de octubre.

Pendiente de validación humana de este bloque. AG-05 sigue pendiente; Jenkins y operación continúan pausados. No se borraron bases ni progreso del usuario.
