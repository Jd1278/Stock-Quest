# Resultado del bloque gateway

21 de octubre de 2026. Fuentes locales sin commit de esta entrega.

- Build TypeScript: aprobado.
- npm test: 87 pruebas aprobadas (64 gateway, 23 frontend); 7 suites.
- Lint backend/frontend/gateway: aprobado.
- Aislamiento: 156 módulos cargados, cero imports legacy y cero controladores SQL.
- Inventario estructural: 39 operaciones coincidentes, 32 rutas, 107 referencias.
- Integración Java/PostgreSQL: 11 grupos aprobados; véase [integracion.json](integracion.json).
- Código y checksums: [evidencia.json](evidencia.json).

El verificador usa un puerto efímero; no se reinició el gateway público ni se migraron/borraron bases. Solo se eliminaron fixtures creados para la comprobación mediante identificadores exactos. Las pruebas de enrutamiento tienen upstream simulado; la integración usa servicios reales. No se reejecutó Maven ni se certifica aquí toda la aceptación global.

Pendiente: validación humana del bloque, activación mediante supervisor nuevo, retirada controlada del backend anterior y resolución de AG-05.
