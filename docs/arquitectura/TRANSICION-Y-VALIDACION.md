# Transición y validación por capacidad

Estado actualizado: 5A aprobada; 5B implementada y probada; el usuario autorizó continuar con 5C conservando los pendientes de aceptación global. Este archivo conserva el plan y sus criterios históricos. Los resultados vigentes están en FASE-5A-SIMULACION.md, FASE-5B-APRENDIZAJE.md, FASE-5C-PERSONAS.md y PENDIENTES-ACEPTACION-GLOBAL.md. Las pruebas aisladas y conexiones PostgreSQL fueron autorizadas posteriormente al asistente; no implican activación automática del entorno del usuario ni autorización de despliegue.

## Secuencia y propietario único

| Paso | Escritor activo | Rutas y consumidores | Condición antes del cambio |
|---|---|---|---|
| Estado actual | Express sobre Prisma | Todas las rutas actuales | Corrección de migraciones local pendiente de prueba del usuario |
| Fase 4 | Express público; Java solo desarrollo con datos propios | Corte de decisiones en puerto separado, sin cambiar la UI pública | Contratos, preparación de partidas, identidad y procedimiento de pruebas listos |
| 5A | Java para escenarios/partidas/resultados; Express para el resto | Cambiar juntas rutas de simulación y edición de escenarios; componer `/admin`; progreso Express lee resumen Java | Consumer HTTP de resultados y derivación de logro preparados; quitar lectura/escritura Prisma de simulación del camino activo |
| 5B | Java para currículo, desafíos, progreso y logros | Mover rutas de aprendizaje, `/progress` y edición pedagógica; personas Express compone reportes mediante API Java | Consultas internas de progreso/actividades y composición `/admin` listas; sin queries cruzadas |
| 5C | Java para identidad, usuarios, grupos y reportes | Mover `/auth`, `/users`, `/groups`, `/reports`; actualizar destino de IdentidadActual | Revocación, permisos, cuentas de desarrollo y composición aceptados |
| Fase 6 | Cada servicio escribe solo su base | Verificar todos los recorridos React/Phaser | Pruebas y conciliación de fixtures coordinados |
| Fase 7 | Java aceptado | Retirar tráfico Express y luego componentes antiguos | Aprobación humana y recuperación ensayada |

En cada paso se registran commit, estado de rutas y configuración anterior/nueva sin secretos. No se depende de un reinicio total al final para descubrir integraciones faltantes. No se hace dual write.

## Datos y recuperación

El usuario confirmó que no hay progreso ni datos que conservar. Eso permite crear entornos nuevos y fixtures, no autoriza borrar bases arbitrarias. Durante desarrollo se distinguen: base original, bases Java nuevas y bases exclusivas de pruebas del usuario.

La activación de un propietario se realiza con escrituras pausadas para esa capacidad durante el cambio de rutas. Con datos descartables de desarrollo se puede reinicializar el entorno nuevo tras autorización; si aparecen datos reales, se detiene el cambio y se diseña exportación/conciliación. No se asume que la autorización anterior cubra pérdida de datos futuros.

Para volver atrás antes de activar tráfico: deshabilitar ruta de desarrollo y conservar Express. Después de aceptar escrituras Java: volver a dirigir a Express solo si sus datos son compatibles y se concilian primero; no basta cambiar una URL. Preferir revertir el ejecutable Java manteniendo el propietario y un esquema compatible. Ningún rollback ejecuta automáticamente SQL destructivo.

Los scripts de migración Java deberán ser expand/contract cuando ya haya datos; no borrar columnas necesarias para una versión recuperable. Retirar SQL, backend o referencias antiguas es una entrega revisada distinta de dejar de enrutar tráfico.

## Contratos internos previos a 5A y 5B

Estos contratos no existen hoy; su detalle se encuentra en `contracts/README.md`.

1. Resumen de resultados Java para `progressService.report`: count, scoreTotal, hasPassingRun y firstCompletedAt; sin límite de 100 partidas del historial público.
2. Lista completa de escenarios del gestor para `/admin`, incluyendo no publicados.
3. Progreso y actividades internas de aprendizaje para informes autorizados del líder, incluyendo los 100 intentos recientes.
4. Snapshots versionados/paginados de progreso para reconstruir proyecciones futuras; no necesarios para el primer corte de decisiones.

El monolito temporal es consumidor HTTP; no obtiene acceso SQL a las bases Java. Los adaptadores de servicio a servicio tienen credenciales separadas, destinos fijos y timeouts. Las rutas `/internal` no se publican mediante el borde.

## Criterios de fase 4

| ID | Comprobación | Evidencia esperada |
|---|---|---|
| C4-01 | Dependencias hacia dentro | Revisión de imports y prueba de arquitectura preparada |
| C4-02 | Paridad de motor | Fixtures equivalentes y sus resultados al ejecutar JUnit |
| C4-03 | Permisos | 401 sin sesión, 403 rol, 404 partida ajena; 503 identidad inaccesible |
| C4-04 | Transacción | Error al guardar resultado/outbox no avanza el día |
| C4-05 | Concurrencia | Dos decisiones del mismo día producen un éxito y un 409 |
| C4-06 | Snapshot | Editar escenario no cambia partida existente |
| C4-07 | Contrato | RunDTO y errores mantienen sus campos y códigos |
| C4-08 | Estado de pruebas | Resultados reales aportados por usuario o excepción aceptada explícitamente |

No se exige que la UI pública consuma Java en fase 4. Esa activación es parte de 5A. No se considera aprobado C4-04/C4-05 mediante un repositorio en memoria.

## Matriz de pruebas posteriores

| Capa | Casos | Herramientas previstas | Ejecutor |
|---|---|---|---|
| Dominio | Entregas, faltantes, dinero, score, determinismo y límites | JUnit Jupiter, fixtures | Usuario |
| Aplicación | Autorización, conflictos, orquestación y puertos | JUnit y dobles controlados | Usuario |
| Arquitectura | Dominio sin framework, módulos sin ciclos ni imports privados | ArchUnit o verificación equivalente fijada en fase 4 | Usuario |
| Persistencia | Transacciones, versión de día, resultado único, outbox | JUnit y PostgreSQL exclusivo | Usuario |
| Contrato | JSON, estados, errores, roles y campos prohibidos | JUnit HTTP/OpenAPI y fixtures del consumidor | Usuario |
| Eventos | Duplicados, orden, replay, fallo del consumidor | JUnit y adaptadores de transporte | Usuario |
| Frontend | Estado, formularios, rutas, errores y logout | Jest/Testing Library existentes | Usuario |
| Integración | Aprendizaje → simulación → progreso → informe | Entorno completo aislado | Usuario |
| RNF | Carga, navegadores, móvil y disponibilidad | Escenarios acordados y medición | Usuario |

Compilación y análisis estático pueden ejecutarse por el asistente según el acuerdo vigente. No se ejecutarán pruebas aisladas ni conexiones de datos sin que el usuario cambie ese acuerdo.

Comandos Java previstos una vez exista Maven Wrapper (no ejecutables todavía en esta fase):

```powershell
cd services/simulacion-logistica
.\mvnw.cmd -DskipTests package
# El usuario ejecuta las pruebas; las IT usarán un perfil y base aislados explícitos.
.\mvnw.cmd test
.\mvnw.cmd -Ppostgres-it verify
```

El perfil `postgres-it` se implementará al preparar integración. No se declara disponible hoy. Evitar que tests de base arranquen en un `test` normal por ausencia de configuración. No usar `skipTests` como evidencia de aprobación de pruebas.

## Fixtures de paridad mínimos

- Caso actual: stock 10, demanda [5,8,4], leadTime 2, costes [unitario 2, venta 5, almacenamiento 1, faltante 3, pedido 4], decisiones [10,0,0]. Recepciones [0,0,10], stocks [5,0,6], vendidos 14, faltantes 3, beneficio 6, score 86.
- Pedido tardío: mismo caso, decisiones [0,0,10]; coste extra 24 frente a no pedir, sin ventas adicionales.
- Sin decisiones: stock inicial conservado, coste inicial incluido, no hay demanda atendida todavía.
- Redondeo con fracciones, beneficios negativos y valores cerca de media centésima: definir expectativas desde la implementación vigente antes del port.
- Días fuera de orden, cantidad negativa/fraccionaria, máximos y partida finalizada.
- Escenario editado después de iniciar, repetición concurrente y propiedad de usuario.

El motor admite demanda cero como prueba interna de robustez; la API pública de escenarios sigue exigiendo al menos un día positivo. No confundir dominio robusto con ampliar entradas públicas.

## Gate de fase 3

- [x] Usuario aprueba límites y propiedad de datos.
- [x] Usuario aprueba Java 21 objetivo y estructura literal de paquetes.
- [x] Usuario aprueba contratos públicos, internos y estrategia de identidad.
- [x] Usuario acepta el primer corte y secuencia 5A–5C.
- [x] Se registran pruebas previas todavía pendientes, incluida la corrección LB-01.
- [x] Usuario autoriza comenzar fase 4.

La consistencia documental se comprueba en fase 3 mediante lectura JSON, resolución de referencias, cobertura de rutas y modelos y comparación con el código. Esto no certifica semántica OpenAPI completa, ejecución HTTP ni aceptación funcional.
