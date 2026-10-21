# Pantalla en blanco al actualizar el segundo día

Durante la revisión visual de fase 6, el usuario confirmó acceso, nueve módulos, lectura de la primera lección, desafío, finalización y desbloqueo. Después informó pantalla en blanco al cerrar el segundo día del simulador y beneficio negativo.

## Causa y corrección

`InventoryGame` usaba un efecto con retorno implícito de `game.current?.update(run)`. El adaptador devolvía a su vez el resultado booleano de `Phaser.Events.EventEmitter.emit`. React recibía `true` como limpieza del efecto y, al cambiar el día de nuevo, intentaba ejecutarlo: `TypeError: destroy is not a function`.

Se añadió primero una prueba de regresión que reproduce ese error con el adaptador anterior: la primera actualización devuelve `true` y la segunda falla. Después se cambió el efecto para no devolver el resultado de la actualización y se hizo explícito el retorno `void` del adaptador. La destrucción real del juego continúa únicamente al desmontar el componente.

La misma prueba pasó tras la corrección y verifica tres cambios consecutivos de día y una única destrucción al desmontar. La suite frontend completa aprobó **11 pruebas en cinco suites**, sin fallos ni omisiones. TypeScript frontend, ESLint y `git diff --check` también aprobaron. No se repitió el recorrido API completo porque la corrección solo afecta al ciclo de vida de la vista. La comprobación visual con Phaser real queda para el usuario; la prueba usa un adaptador simulado y no certifica WebGL.

## Datos y beneficio

Se consultó por API la cuenta aprendiz de desarrollo, sin modificar sus partidas ni enviar decisiones adicionales. Las partidas afectadas conservaron dos días completados y sus bitácoras. La pantalla en blanco no implicó pérdida de la decisión persistida.

El modelo descuenta la inversión inicial y cada día suma ventas y resta compras, costos de pedido, almacenamiento y faltantes. El beneficio negativo inicial es esperado; no se cambió esa regla. En la partida de siete días observada:

| Concepto | Valor |
|---|---:|
| Inversión inicial: 60 unidades × 1000 | 60000 |
| Ventas de los dos días | 75600 |
| Costos del día 1 | 1260 |
| Costos del día 2, incluido pedido de 36 unidades | 39540 |
| Beneficio acumulado | **−25200** |

Para verificar la corrección: recargar con Ctrl+F5, abrir Simulador → Tus partidas → Continuar en la partida con dos días completados y cerrar el día siguiente. No es necesario crear otra partida ni borrar datos. Fase 6 continúa abierta; faltan el resto del recorrido del simulador y la revisión visual de líder y gestor.
