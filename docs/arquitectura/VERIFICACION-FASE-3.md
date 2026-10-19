# Evidencias de revisión del diseño

## Estado

Diseño preparado; pendiente de aprobación humana. Se preservan las modificaciones locales de la corrección previa en `backend/prisma/client.cjs` y `backend/src/config/database.test.ts`. Esta fase añade documentación y contratos; no cambia rutas, código funcional, dependencias, bases ni configuración de despliegue.

## Verificación estructural ejecutada

Comando reproducible: `node contracts/validar-inventario.cjs`.

| Comprobación | Resultado |
|---|---|
| JSON de OpenAPI, eventos y propiedad de datos legible | Correcto |
| Operaciones públicas esperadas / documentadas | 35 / 35 |
| Paths públicos | 32 |
| Propietarios de modelos Prisma | 13 / 13 |
| Tipos de evento propuestos | 7 |
| Referencias locales resueltas entre esquemas | 107 |
| RF enlazados a operaciones | 19 |
| RF restante | RF04, navegación frontend, documentado |
| `git diff --check` | Sin errores en cambios registrados por Git |

La comparación incluye expansión de las ocho operaciones administrativas generadas en el router. No depende solo de la tabla histórica de docs/API.md. La lista de propietarios deriva del esquema Prisma y se comprueba sin acceder a una base.

## Revisión manual

- Las respuestas de escritura de módulos, lecciones, grupos y escenarios se distinguen de las respuestas enriquecidas de consulta.
- `/admin` tiene compositor explícito porque une dos propietarios y requiere escenarios no publicados.
- Los resultados usados en progreso no se limitan a los 100 elementos del historial público.
- Se mantiene lectura inmediata de contribución de simulación, con eventos auxiliares idempotentes.
- Identidad conserva consulta vigente de active/rol/tokenVersion antes de autorizar nuevas peticiones.
- La secuencia de extracción incluye adaptar consumidores antes de habilitar propietarios.
- La política de datos usa entornos nuevos sin borrar bases existentes.
- Se distinguen paridad numérica inicial y una futura mejora decimal.
- Los RNF siguen siendo criterios por medir; no se declaran cumplidos por el diseño.

## Límites y pendientes

No se ejecutó un validador semántico completo de OpenAPI/JSON Schema. Los contratos contienen reglas adicionales que deberán verificarse en pruebas de implementación. No se ejecutaron JUnit, Jest, integración, HTTP real, migraciones ni despliegues en esta fase. No se creó ningún servicio Java todavía.

Sigue pendiente la ejecución de las pruebas de fase 2 y de la corrección LB-01 por parte del usuario; aprobar diseño no equivale a aprobar esas pruebas. Para iniciar fase 4 se requiere aprobación expresa del diseño. Las decisiones propuestas están en `DECISIONES-FASE-3.md`; no se tomó aprobación por silencio.
